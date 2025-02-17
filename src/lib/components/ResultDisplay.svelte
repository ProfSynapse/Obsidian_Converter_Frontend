<script>
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import Button from './common/Button.svelte';
  import Container from './common/Container.svelte';
  import ProgressBar from './common/ProgressBar.svelte';
  import { conversionStatus, currentFile } from '$lib/stores/conversionStatus.js';
  import { conversionResult } from '$lib/stores/conversionResult.js';
  import { triggerDownload } from '$lib/utils/conversionManager.js';

  const dispatch = createEventDispatcher();

  // Reactive declarations for status
  $: isConverting = $conversionStatus.status === 'converting';
  $: isCompleted = $conversionStatus.status === 'completed';
  $: hasError = $conversionStatus.error !== null;
  
  // Format current file name for display
  $: currentFileName = $currentFile ? 
    ($currentFile.length > 30 ? 
      $currentFile.substring(0, 27) + '...' : 
      $currentFile) : 
    '';

  // Get status message
  $: statusMessage = getStatusMessage($conversionStatus.status, $conversionStatus.error);

  function getStatusMessage(status, error) {
    switch(status) {
      case 'converting':
        return '🔄 Converting your files...';
      case 'completed':
        return '✨ Conversion completed!';
      case 'error':
        return `❌ ${error || 'An error occurred during conversion'}`;
      case 'cancelled':
        return '⚠️ Conversion cancelled';
      default:
        return '⏳ Preparing conversion...';
    }
  }
</script>

<Container isGradient={true}>
  <div class="conversion-status" transition:fade>
    {#if isConverting || isCompleted || hasError}
      <div class="status-message">
        <p class="message">{statusMessage}</p>
        {#if currentFileName && isConverting}
          <p class="current-file">Processing: {currentFileName}</p>
        {/if}
      </div>

      <div class="progress-container">
        <ProgressBar 
          value={$conversionStatus.progress} 
          color={hasError ? '#EF4444' : '#3B82F6'}
          height="6px"
        />
        <span class="progress-text">
          {$conversionStatus.progress.toFixed(0)}%
        </span>
      </div>

      {#if isCompleted}
        <div class="button-container">
          {#if $conversionResult}
            <Button 
              variant="primary"
              size="large"
              on:click={() => triggerDownload()}
            >
              Download Files
            </Button>
          {/if}
          <Button 
            variant={$conversionResult ? "secondary" : "primary"}
            size="large"
            on:click={() => window.location.reload()}
          >
            Convert More Files
          </Button>
        </div>
      {:else if hasError}
        <div class="button-container">
          <Button 
            variant="primary"
            size="large"
            fullWidth
            on:click={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      {/if}
    {:else}
      <div class="button-container">
        <Button
          variant="primary"
          size="large"
          fullWidth
          on:click={() => dispatch('startConversion')}
        >
          Start Conversion
        </Button>
      </div>
    {/if}
  </div>
</Container>

<style>
  .conversion-status {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .status-message {
    text-align: center;
    margin-bottom: var(--spacing-sm);
  }

  .message {
    font-size: 1.1em;
    font-weight: 500;
    margin: 0;
    margin-bottom: var(--spacing-xs);
  }

  .current-file {
    font-size: 0.9em;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    align-items: center;
  }

  .progress-text {
    font-size: 0.9em;
    color: var(--color-text-secondary);
  }

  .button-container {
    width: 100%;
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    padding: var(--spacing-md) 0;
  }
</style>
