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
  import { getFileIcon } from '$lib/utils/iconUtils.js';  // Add this import

  /**
   * conversionStatus shape (example):
   * {
   *   status: 'idle' | 'converting' | 'completed' | 'error' | 'stopped',
   *   progress: number,       // 0..100
   *   error: string|null,
   *   currentFile: string|null,
   *   processedCount: number, // how many files processed
   *   totalCount: number      // total files
   * }
   */

  const dispatch = createEventDispatcher();

  // --- 1) ConversionStatus store subscription ---
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

  // --- 2) Derived data from files store ---
  // Which files are successfully converted?
  const convertedFiles = derived(files, $files => 
    $files.filter(file => file.status === 'completed')
  );
  // Track if there are *any* completed files
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

  // --- 3) Actions ---
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
    // If user successfully sets a key, you could auto-start conversion or do nothing
    // if (event.detail.success) dispatch('startConversion');
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
      <!-- Removed the conversion-controls class to eliminate the divider -->
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

          <!-- Professor Synapse's Magical Message -->
          <div class="synapse-message" in:fly={{ y: 30, duration: 400, delay: 300 }}>
            <div class="professor-header">
              <span class="wizard-emoji">🧙🏾‍♂️</span>
              <h3>Greetings, Knowledge Seeker!</h3>
            </div>
            
            <div class="scroll-message">
              <p>While your knowledge transforms, let me share something magical with you! I'm Professor Synapse, and I've crafted a special series of lessons to help you master the art of knowledge management.</p>
              
              <div class="magical-container">
                <iframe 
                  src="https://www.youtube.com/embed/videoseries?list=PLa9S_7NRneu-XYTNzCA8T_B3B37ZVrgxx" 
                  title="The Magical Arts of Knowledge Management"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>

              <div class="enchanted-scroll">
                <h4>✨ Want to Unlock More Knowledge Magic? ✨</h4>
                <p>As your personal guide in this journey, I offer specialized training in the mystic arts of:</p>
                <ul>
                  <li>🎯 Knowledge Management Mastery</li>
                  <li>📚 Personal Learning Systems</li>
                  <li>🧠 Information Architecture</li>
                </ul>
                
                <div class="crystal-ball">
                  <script src="https://js.hsforms.net/forms/embed/6389588.js" defer></script>
                  <div 
                    class="hs-form-frame" 
                    data-region="na1" 
                    data-form-id="6ed41a66-642b-4b8b-a71d-ad287894c97f" 
                    data-portal-id="6389588"
                  ></div>
                </div>
              </div>
            </div>
          </div>
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
    border-radius: var(--rounded-lg); /* Changed from var(--rounded-full) */
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
    color: var (--color-text-secondary);
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

  /* Start Conversion Button with breathing gradient */
  .start-button-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: var(--spacing-md) 0;
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

  /* Professor Synapse Styles */
  .synapse-message {
    margin-top: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: var(--color-background-secondary);
    border-radius: var(--rounded-lg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 800px;
  }

  .professor-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .wizard-emoji {
    font-size: 2rem;
    filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.3));
  }

  .professor-header h3 {
    margin: 0;
    font-size: var(--font-size-xl);
    background: linear-gradient(135deg, #9333EA, #3B82F6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }

  .scroll-message {
    padding: var(--spacing-md);
    background: var(--color-background-base);
    border-radius: var(--rounded-md);
    position: relative;
  }

  .scroll-message::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #9333EA, #3B82F6);
    border-radius: var(--rounded-md) var(--rounded-md) 0 0;
    opacity: 0.7;
  }

  .magical-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    margin: var(--spacing-lg) 0;
  }

  .magical-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: var(--rounded-md);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
  }

  .enchanted-scroll {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--color-background-secondary);
    border-radius: var(--rounded-md);
    border: 1px solid rgba(147, 51, 234, 0.2);
  }

  .enchanted-scroll h4 {
    margin: 0 0 var(--spacing-md);
    text-align: center;
    color: var(--color-primary);
    font-weight: 600;
  }

  .enchanted-scroll ul {
    list-style: none;
    padding: 0;
    margin: var(--spacing-md) 0;
  }

  .enchanted-scroll li {
    margin-bottom: var(--spacing-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .crystal-ball {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--color-background-base);
    border-radius: var(--rounded-md);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.1);
  }

  /* Mobile Adjustments */
  @media (max-width: 640px) {
    .synapse-message {
      padding: var(--spacing-md);
      margin-top: var(--spacing-lg);
    }

    .professor-header h3 {
      font-size: var(--font-size-lg);
    }

    .wizard-emoji {
      font-size: 1.5rem;
    }

    .magical-container {
      margin: var(--spacing-md) 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .result-item {
      transition: none;
    }
    .breathing-gradient {
      animation: none;
    }
    .start-button:not(:disabled):hover {
      transform: none;
      box-shadow: none;
    }
  }

  .content-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch; /* Changed from center to stretch */
  }

  .wide-section {
    width: 100%;
    padding: 0 var(--spacing-md);
  }
</style>
