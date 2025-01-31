<script>
  import { createEventDispatcher } from 'svelte';
  import { files } from '$lib/stores/files.js';
  import { uploadStore } from '$lib/stores/uploadStore.js';
  import { paymentStore } from '$lib/stores/payment.js';
  import { fade } from 'svelte/transition';
  import { apiKey } from '$lib/stores/apiKey.js';
  import { requiresApiKey, validateFileSize } from '$lib/utils/fileUtils.js';
  import Container from './common/Container.svelte';
  import TabNavigation from './common/TabNavigation.svelte';
  import UrlInput from './common/UrlInput.svelte';
  import DropZone from './common/DropZone.svelte';
  import ErrorMessage from './common/ErrorMessage.svelte';
  import FileList from './file/FileList.svelte';
  import PaymentInput from './common/PaymentInput.svelte';

  const dispatch = createEventDispatcher();

  /**
   * Configuration object for supported file types
   * (Here we break out audio vs video explicitly)
   */
  const SUPPORTED_FILES = {
    documents: ['pdf', 'docx', 'pptx'],
    data: ['csv', 'xlsx'],
    audio: ['mp3', 'wav', 'm4a'],
    video: ['mp4', 'webm', 'avi'] // youtube removed
  };

  // Flatten
  const SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_FILES).flat();

  // Reactive
  $: showFileList = $files.length > 0;
  $: needsApiKey = $files.some(file => requiresApiKey(file));

  $: showPaymentPrompt = $paymentStore.showPaymentPrompt;

  function showFeedback(message, type = 'info') {
    uploadStore.setMessage(message, type);
    return setTimeout(() => uploadStore.clearMessage(), 5000);
  }

  function handlePayment(event) {
    const { amount } = event.detail;
    paymentStore.setAmount(amount);
    paymentStore.setStatus('completed');
    paymentStore.hidePrompt();
    showFeedback(`✨ Thank you for your magical contribution of $${amount}!`, 'success');
    dispatch('startConversion');
  }

  function handlePaymentSkip() {
    paymentStore.setStatus('skipped');
    paymentStore.hidePrompt();
    dispatch('startConversion');
  }

  function validateFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return { valid: false, message: `Unsupported file type: ${file.name}` };
    }

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      return { valid: false, message: `${file.name}: ${sizeValidation.message}` };
    }

    return { valid: true };
  }

  function getFileCategory(extension) {
    // Ensure lowercase comparison
    extension = extension.toLowerCase();
    
    // Special handling for spreadsheet files
    if (['csv', 'xlsx', 'xls'].includes(extension)) {
      return 'data';
    }

    for (const [category, extensions] of Object.entries(SUPPORTED_FILES)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    return 'unknown';
  }

  /**
   * Generates a unique ID for items
   * @private
   */
  function generateId() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  function handleFilesAdded(newFiles) {
    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        showFeedback(validation.message, 'error');
        return;
      }

      const extension = file.name.split('.').pop().toLowerCase();
      const requiresKey = requiresApiKey(file);

      const newFile = {
        id: generateId(),
        name: file.name,
        file: file,
        type: extension,  // Changed: Use the extension directly instead of category
        status: 'Ready',
        progress: 0,
        selected: false,
        requiresApiKey: requiresKey
      };

      const result = files.addFile(newFile);
      if (result.success) {
        showFeedback(`Added: ${file.name}`, 'success');
        dispatch('filesAdded', { files: [newFile] });
      } else {
        showFeedback(result.message, 'error');
      }
    });
  }

  /**
   * Normalizes a URL to prevent duplicates by:
   * - Removing trailing slashes
   * - Converting to lowercase
   * - Standardizing protocol
   */
  function normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove trailing slashes and convert to lowercase
      const normalizedPath = urlObj.pathname.replace(/\/+$/, '').toLowerCase();
      urlObj.pathname = normalizedPath;
      return urlObj.href.toLowerCase();
    } catch (error) {
      console.error('URL normalization error:', error);
      return url.toLowerCase();
    }
  }

  async function handleUrlSubmit(event) {
    const { url, type = 'url' } = event.detail;
    
    if (!url) {
      showFeedback('Please enter a valid URL', 'error');
      return;
    }

    try {
      const normalizedUrl = normalizeUrl(url);
      const newUrl = new URL(normalizedUrl);
      
      // Check if URL already exists (case-insensitive and ignoring trailing slashes)
      const isDuplicate = $files.some(file => {
        if (!file.url) return false;
        return normalizeUrl(file.url) === normalizedUrl;
      });

      if (isDuplicate) {
        showFeedback('This URL has already been added', 'error');
        return;
      }

      const newFile = {
        id: generateId(),
        name: newUrl.hostname,
        url: normalizedUrl,
        type: type,
        status: 'Ready',
        progress: 0,
        selected: false,
        requiresApiKey: true // Removed YouTube exception
      };

      const result = files.addFile(newFile);
      if (result.success) {
        showFeedback(`Added URL: ${newUrl.hostname}`, 'success');
        dispatch('filesAdded', { files: [newFile] });
      } else {
        showFeedback(result.message, 'error');
      }
    } catch (error) {
      showFeedback('Invalid URL format', 'error');
    }
  }

  async function handleFileUpload(event) {
    const uploadedFiles = Array.from(event.target.files || []);
    handleFilesAdded(uploadedFiles);

    // If API key needed but missing, scroll to input...
    const needsKey = uploadedFiles.some(file => requiresApiKey(file));
    if (needsKey && !$apiKey) {
      setTimeout(() => {
        const apiKeySection = document.querySelector('.api-key-input-section');
        apiKeySection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else if (uploadedFiles.length > 0) {
      // Show payment prompt after files are added
      paymentStore.showPrompt();
    }
  }
</script>

<div class="file-uploader" in:fade={{ duration: 200 }}>
  <!-- Single Container for all upload options -->
  <Container title="Add Convertables!" subtitle="Upload files or convert from URL">
    <!-- URL Input Section -->
    <div class="section url-section">
      <TabNavigation />
      <UrlInput 
        on:submitUrl={handleUrlSubmit}
      />
    </div>

    <div class="section-divider"></div>

    <!-- File Upload Section -->
    <div class="section upload-section">
      <DropZone 
        acceptedTypes={SUPPORTED_EXTENSIONS}
        on:filesDropped={(event) => handleFilesAdded(event.detail.files)}
        on:filesSelected={(event) => handleFilesAdded(event.detail.files)}
      />
    </div>
    
    {#if $uploadStore.errorMessage}
      <div class="error-container" transition:fade>
        <ErrorMessage message={$uploadStore.errorMessage} />
      </div>
    {/if}

    {#if showFileList}
      <div class="file-list-wrapper">
        <FileList />
      </div>
    {/if}

    <!-- Payment Input -->
    <PaymentInput 
      showPayment={showPaymentPrompt}
      on:payment={handlePayment}
      on:skip={handlePaymentSkip}
    />
  </Container>
</div>

<style>
  .file-uploader {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .section {
    width: 100%;
    padding: var(--spacing-md);
  }

  .url-section {
    background: var(--color-background);
    border-radius: var(--rounded-lg);
  }

  .section-divider {
    width: 100%;
    height: 1px;
    background: var(--color-border);
    margin: var(--spacing-lg) 0;
    opacity: 0.5;
  }

  .upload-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .error-container {
    margin-top: var(--spacing-md);
  }

  .file-list-wrapper {
    margin-top: var(--spacing-lg);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .section {
      padding: var(--spacing-sm);
    }

    .section-divider {
      margin: var(--spacing-md) 0;
    }
  }
</style>
