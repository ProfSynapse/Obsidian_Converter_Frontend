// src/lib/utils/conversionManager.js

import { get } from 'svelte/store';
import { files } from '$lib/stores/files.js';
import { apiKey } from '$lib/stores/apiKey.js';
import { conversionStatus } from '$lib/stores/conversionStatus.js';
import { paymentStore } from '$lib/stores/payment.js';
import client, { ConversionError } from '$lib/api/client.js';
import FileSaver from 'file-saver';
import { CONFIG } from '$lib/config'; 
import { conversionResult } from '$lib/stores/conversionResult.js';

/**
 * Utility function to read a file as base64
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

/**
 * Prepares a single item for conversion
 */
async function prepareItem(item) {
  try {
    if (!item.id || !item.name) {
      throw ConversionError.validation(`Item ${item.name} is missing required properties`);
    }

    const baseItem = {
      id: item.id,
      name: item.name,
      options: {
        includeImages: true,
        includeMeta: true,
        convertLinks: true
      }
    };

    // Handle File type
    if (item.file instanceof File) {
      const fileExt = item.name.split('.').pop().toLowerCase();
      const type = determineFileType(fileExt);
      
      // File size validation
      if (item.file.size > CONFIG.CONVERSION.FILE_SIZE_LIMIT) {
        throw ConversionError.validation(
          `File size exceeds limit of ${CONFIG.CONVERSION.FILE_SIZE_LIMIT / (1024 * 1024)}MB`
        );
      }

      // File type validation
      if (!type) {
        throw ConversionError.validation(`Unsupported file type: ${fileExt}`);
      }

      // Check if API key is required for this file type
      if (CONFIG.FILES.API_REQUIRED.includes(fileExt) && !get(apiKey)) {
        throw ConversionError.validation('API key is required for this file type');
      }

      return {
        ...baseItem,
        type,
        file: item.file
      };
    }

    // Handle URL types (including parent URLs)
    if (item.type === 'url' || item.type === 'parent' || item.url || item.name.startsWith('http')) {
      const rawUrl = item.url || item.content || item.name;
      let normalizedUrl;
      try {
        const urlObj = new URL(rawUrl);
        const normalizedPath = urlObj.pathname.replace(/\/+$/, '').toLowerCase();
        urlObj.pathname = normalizedPath;
        normalizedUrl = urlObj.href.toLowerCase();
      } catch (error) {
        throw ConversionError.validation('Invalid URL format');
      }

      return {
        ...baseItem,
        type: item.type === 'parent' ? 'parent' : 'url',
        url: normalizedUrl,
        content: normalizedUrl,
        options: {
          ...baseItem.options,
          ...(item.type === 'parent' ? { depth: 1, maxPages: 10 } : {}),
          ...item.options
        }
      };
    }

    throw ConversionError.validation(`Unsupported item type or missing content: ${item.name}`);
  } catch (error) {
    console.error(`Error preparing ${item.name}:`, error);
    throw error instanceof ConversionError ? error : ConversionError.validation(error.message);
  }
}

function determineFileType(extension) {
  if (!extension) return null;
  
  const categories = CONFIG.FILES.CATEGORIES;
  const ext = extension.toLowerCase();
  
  if (categories.audio.includes(ext)) return 'audio';
  if (categories.video.includes(ext)) return 'video';
  if (categories.documents.includes(ext)) return 'document';
  if (categories.data.includes(ext)) return 'data';
  
  return null; // Return null for unsupported types
}

/**
 * Prepares batch items for conversion
 */
function prepareBatchItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ConversionError.validation('No items provided for conversion');
  }
  
  return Promise.all(items.map(async item => {
    const prepared = await prepareItem(item);
    // Add metadata about whether this item should be batched
    prepared.shouldBatch = prepared.type !== 'document';
    return prepared;
  }));
}

/**
 * Starts the conversion process
 */
export async function startConversion() {
  const currentFiles = get(files);
  const currentApiKey = get(apiKey);
  const paymentStatus = get(paymentStore);

  // Reset payment prompt state
  paymentStore.hidePrompt();

  if (currentFiles.length === 0) {
    const error = new Error('No files available for conversion.');
    conversionStatus.setError(error.message);
    conversionStatus.setStatus('error');
    console.error(error);
    return;
  }

  conversionStatus.reset();
  conversionStatus.setStatus('converting');

  try {
    // Prepare items for conversion
    const items = await prepareBatchItems(currentFiles);
    const itemCount = items.length;

    // Configure endpoint mapping
    const getEndpoint = (item) => {
      if (item.type === 'audio') return '/multimedia/audio';
      if (item.type === 'video') return '/multimedia/video';
      if (item.type === 'url') return '/web/url';
      if (item.type === 'parent') return '/web/parent-url';
      return '/document/file';
    };

    // Process items with progress tracking
    const response = await client.processItems(items, currentApiKey, {
        useBatch: itemCount > 1 && !items.every(item => item.type === 'document'),  // Don't use batch for single type documents
        getEndpoint,
        onProgress: (progress) => {
            conversionStatus.setProgress(progress);
        },
        onItemComplete: (itemId, success, error) => {
            files.updateFile(itemId, {
                status: success ? 'completed' : 'error',
                error: error?.message || null
            });
        }
    });

        // Store the conversion response for later download
    if (response instanceof Blob) {
        conversionResult.setResult({
            blob: response,
            contentType: response.type,
            items: items // Store items for filename generation
        });
    }

    // Update status with payment acknowledgment
    conversionStatus.setStatus('completed');
    const paymentMsg = paymentStatus.status === 'completed' 
      ? `✨ Conversion completed successfully! Thank you for your magical contribution of $${paymentStatus.amount}!`
      : '✨ Conversion completed successfully!';
    showFeedback(paymentMsg, 'success');

  } catch (error) {
    console.error('Conversion error:', error);

    const errorMessage = error instanceof ConversionError ? 
        error.message : 
        error.message || 'An unexpected error occurred during conversion';

    conversionStatus.setError(errorMessage);
    conversionStatus.setStatus('error');
    showFeedback(errorMessage, 'error');
  }
}

/**
 * Triggers the download of the converted files
 */
export function triggerDownload() {
    const result = get(conversionResult);
    if (!result) {
        console.error('No conversion result available');
        return;
    }

    const { blob, contentType, items } = result;
    let filename;

    // For single markdown files, use original filename with .md extension
    if (contentType === 'text/markdown') {
        const originalName = items[0]?.name;
        filename = originalName ? 
            originalName.replace(/\.[^/.]+$/, '.md') : 
            `document_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    } else {
        // For zip files (multiple files or complex conversions)
        filename = `conversion_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    }
    
    FileSaver.saveAs(blob, filename);
    
    // Only clear files store after successful download
    const clearResult = files.clearFiles();
    if (!clearResult.success) {
        console.warn('Failed to clear files store:', clearResult.message);
    }
}

/**
 * Cancels the ongoing conversion process
 */
export function cancelConversion() {
  conversionStatus.setStatus('cancelled');
  client.cancelRequests(); // Assuming client has a method to cancel pending requests
  files.update(items => 
    items.map(item => 
      item.status === 'converting' 
        ? { ...item, status: 'cancelled' } 
        : item
    )
  );
}

/**
 * Shows feedback message
 */
function showFeedback(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
}
