<!-- src/lib/components/ResultDisplay.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { derived } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  import Container from './common/Container.svelte';
  import ApiKeyInput from './ApiKeyInput.svelte';
  import ProgressBar from './common/ProgressBar.svelte';
  import Button from './common/Button.svelte';

  import { files } from '$lib/stores/files.js';
  import { apiKey } from '$lib/stores/apiKey.js';
  import { requiresApiKey } from '$lib/utils/fileUtils.js';
  import { conversionStatus } from '$lib/stores/conversionStatus.js';
  import { getFileIcon } from '$lib/utils/iconUtils.js';

  const dispatch = createEventDispatcher();

  // --- State management ---
  let status = 'idle';
  let progress = 0;
  let error = null;
  let currentFile = null;
  let processedCount = 0;
  let totalCount = 0;

  const unsubConversion = conversionStatus.subscribe(value => {
    status = value.status;
    progress = value.progress || 0;
    error = value.error;
    currentFile = value.currentFile;
    processedCount = value.processedCount || 0;
    totalCount = value.totalCount || 0;
  });

  onDestroy(() => unsubConversion());

  // --- Derived data from files store ---
  const convertedFiles = derived(files, $files => 
    $files.filter(file => file.status === 'completed')
  );
  let unsubscribeConverted = convertedFiles.subscribe(() => {});
  onDestroy(() => unsubscribeConverted());

  // Are any files audio/video requiring an API key?
  $: needsApiKey = $files.some(file => requiresApiKey(file));
  // Does the user have an API key in store?
  $: hasApiKey = !!$apiKey;

  // If we need a key but have none → show ApiKeyInput
  $: showApiKeyInput = needsApiKey && !hasApiKey;
  // Are we converting right now?
  $: isConverting = (status === 'converting');
  // Can we start conversion? (No key needed, or we do have a key)
  $: canConvert = !needsApiKey || hasApiKey;

  // --- Actions ---
  function handleStartConversion() {
    console.log('ResultDisplay: handleStartConversion called', {
      canConvert,
      needsApiKey,
      hasApiKey
    });
    
    if (!canConvert) {
      console.log('ResultDisplay: Cannot convert - conditions not met');
      return;
    }
    
    console.log('ResultDisplay: Dispatching startConversion event');
    dispatch('startConversion');
  }

  function handleCancelConversion() {
    dispatch('cancelConversion');
    // Reset conversion status to idle
    conversionStatus.update(s => ({
      ...s,
      status: 'idle',
      progress: 0,
      currentFile: null
    }));
  }

  function handleApiKeySet(event) {
    console.log('API Key Set event:', event.detail);
  }

  function handleRefresh() {
    window.location.reload();
  }
</script>

<!-- Container for everything (results, conversion controls, etc.) -->
<Container class="result-display">
  <div in:fade class="content-wrapper">
    {#if $convertedFiles.length > 0}
      <!-- Only show header when we have converted files -->
      <h2>
        <span class="icon">🎉</span>
        Conversion Results
      </h2>

      <ul class="result-list">
        {#each $convertedFiles as file (file.id)}
          <li class="result-item" in:fade out:fade>
            <div class="file-info">
              <span class="icon">{getFileIcon(file.type)}</span>
              <span class="file-name">{file.name}</span>
              <span class="badge-success" title="Conversion successful">
                ✨ Success
              </span>
            </div>
          </li>
        {/each}
      </ul>

      <!-- Replace Convert More button with Refresh button -->
      <div class="start-button-container">
        <Button 
          variant="primary"
          size="large"
          fullWidth
          on:click={handleRefresh}
        >
          Refresh Page
        </Button>
      </div>
    {:else}
      {#if showApiKeyInput}
        <div class="wide-section">
          <ApiKeyInput
            on:apiKeySet={handleApiKeySet}
          />
        </div>

      {:else if isConverting}
        <div class="progress-section" in:fly={{ y: 20, duration: 300 }}>
          <ProgressBar
            value={progress}
            color="#3B82F6"
            height="8px"
            showGlow={true}
          />
          <p class="progress-info">
            {processedCount}/{totalCount}
            {#if currentFile}
              <small>({currentFile})</small>
            {/if}
          </p>
          <Button
            variant="danger"
            on:click={handleCancelConversion}
          >
            Stop Conversion
          </Button>
        </div>

      {:else}
        <!-- Modify this section to check conversion status -->
        {#if $conversionStatus.status === 'completed'}
          <div class="start-button-container">
            <Button 
              variant="primary"
              size="large"
              fullWidth
              on:click={handleRefresh}
            >
              Refresh Page
            </Button>
          </div>
        {:else if !isConverting}
          <!-- Optional error/stopped messages -->
          {#if status === 'error'}
            <p class="error-message">
              {error}
            </p>
          {:else if status === 'stopped'}
            <p class="stopped-message">
              Conversion stopped at {processedCount}/{totalCount} files.
            </p>
          {/if}

          <div class="start-button-container">
            <Button
              variant="primary"
              size="large"
              fullWidth
              disabled={!canConvert}
              on:click={handleStartConversion}
            >
              Start Conversion {canConvert ? '✓' : '✗'}
            </Button>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</Container>

<style>
  .result-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: var(--spacing-2xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-background-secondary);
    transition: background 0.3s ease;
  }

  .result-item:hover {
    background: var(--color-background-hover);
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item .icon {
    font-size: var(--font-size-xl);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .badge-success {
    background-color: var(--color-success-light);
    color: var(--color-success);
    padding: 4px 8px;
    border-radius: var(--rounded-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--font-size-sm);
    transition: background 0.3s ease;
  }

  /* Conversion Controls Area */
  .progress-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .progress-info {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .progress-info small {
    margin-left: var(--spacing-2xs);
    color: var(--color-text-secondary);
    font-size: calc(var(--font-size-sm) * 0.9);
  }

  .error-message {
    margin: 0;
    color: var(--color-error);
    font-weight: var(--font-weight-medium);
  }

  .stopped-message {
    margin: 0;
    color: var(--color-warning);
    font-weight: var(--font-weight-medium);
  }

  /* Start Conversion Button */
  .start-button-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: var(--spacing-md) 0;
  }

  /* Layout */
  .content-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .wide-section {
    width: 100%;
    padding: 0 var(--spacing-md);
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .result-item {
      gap: var(--spacing-2xs);
      padding: var(--spacing-2xs) var(--spacing-xs);
    }

    .result-item .icon {
      font-size: var(--font-size-lg);
    }

    .progress-info {
      font-size: var(--font-size-sm);
    }
  }

  @media (prefers-contrast: high) {
    .badge-success {
      border: 2px solid currentColor;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .result-item {
      transition: none;
    }
  }
</style>
