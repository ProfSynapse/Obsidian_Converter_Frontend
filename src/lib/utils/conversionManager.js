// src/lib/utils/conversionManager.js

import { get } from 'svelte/store';
import { files } from '$lib/stores/files.js';
import { apiKey } from '$lib/stores/apiKey.js';
import { conversionStatus } from '$lib/stores/conversionStatus.js';
import { paymentStore } from '$lib/stores/payment.js';
import client, { ConversionError } from '$lib/api/client.js';
import FileSaver from 'file-saver';
import { CONFIG } from '$lib/config';  // Add this import

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

    /**
 * Normalizes a URL to ensure consistent format
 * @private
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    const normalizedPath = urlObj.pathname.replace(/\/+$/, '').toLowerCase();
    urlObj.pathname = normalizedPath;
    return urlObj.href.toLowerCase();
  } catch (error) {
    console.error('URL normalization error:', error);
    return url.toLowerCase();
  }
}

// Handle URL types (including parent URLs)
    if (item.type === 'url' || item.type === 'parent' || item.type === 'youtube' || item.url || item.name.startsWith('http')) {
      const rawUrl = item.url || item.content || item.name;
      const normalizedUrl = normalizeUrl(rawUrl);
      return {
        ...baseItem,
        type: item.type === 'parent' ? 'parent' : 
              item.type === 'youtube' ? 'youtube' : 'url',
        url: normalizedUrl, // Use normalized URL
        content: normalizedUrl, // Keep normalized URL for backward compatibility
        options: {
          ...baseItem.options,
          ...(item.type === 'parent' ? { depth: 1, maxPages: 10 } : {}),
          ...item.options // Preserve any custom options passed
        }
      };
    }

    // Handle File type
    if (item.file instanceof File) {
      const fileExt = item.name.split('.').pop().toLowerCase();
      const type = determineFileType(fileExt);
      
      return {
        ...baseItem,
        type,
        file: item.file
      };
    }

    throw ConversionError.validation(`Unsupported item type or missing content: ${item.name}`);
  } catch (error) {
    console.error(`Error preparing ${item.name}:`, error);
    throw error instanceof ConversionError ? error : ConversionError.validation(error.message);
  }
}

function determineFileType(extension) {
  const categories = CONFIG.FILES.CATEGORIES;
  
  if (categories.audio.includes(extension)) return 'audio';
  if (categories.video.includes(extension)) return 'video';
  if (categories.documents.includes(extension)) return 'document';
  if (categories.data.includes(extension)) return 'data';
  if (categories.web.includes(extension)) return 'web';
  
  return 'file';
}

/**
 * Prepares batch items for conversion
 */
function prepareBatchItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ConversionError.validation('No items provided for conversion');
  }
  
  // Log items before processing
  console.log('Preparing batch items:', items);
  
  return Promise.all(items.map(async item => {
    const prepared = await prepareItem(item);
    console.log('Prepared item:', prepared); // Debug log
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
      if (item.type === 'youtube') return '/web/youtube';
      return '/document/file';
    };

    console.log('Starting conversion:', { itemCount, items });

    // Process items with progress tracking
    const response = await client.processItems(items, currentApiKey, {
        useBatch: itemCount > 1,
        getEndpoint,
        onProgress: (progress) => {
            console.log(`Conversion progress: ${progress}%`);
            conversionStatus.setProgress(progress);
        },
        onItemComplete: (itemId, success, error) => {
            console.log(`Item ${itemId} completed:`, { success, error });
            files.updateFile(itemId, {
                status: success ? 'completed' : 'error',
                error: error?.message || null
            });
        }
    });

    // Handle ZIP blob response
    if (response instanceof Blob) {
        const filename = `conversion_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
        FileSaver.saveAs(response, filename);
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
 * Cancels the ongoing conversion process
 */
export function cancelConversion() {
  console.log('Cancelling conversion');
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
