<script>
  import FileUploader from './FileUploader.svelte';
  import ResultDisplay from './ResultDisplay.svelte';
  import ApiKeyInput from './ApiKeyInput.svelte';
  import Instructions from './Instructions.svelte';
  import PaymentInput from './common/PaymentInput.svelte';
  import { apiKey } from '$lib/stores/apiKey.js';
  import { conversionStatus } from '$lib/stores/conversionStatus.js';
  import { files } from '$lib/stores/files.js';
  import { paymentStore } from '$lib/stores/payment.js';
  import { uploadStore } from '$lib/stores/uploadStore.js';
  import { startConversion, cancelConversion } from '$lib/utils/conversionManager.js';
  import { fade, fly } from 'svelte/transition';
  import { requiresApiKey } from '$lib/utils/fileUtils.js';
  import { onDestroy } from 'svelte';
import ProfessorSynapseAd from './ProfessorSynapseAd.svelte';
import { adStore } from '$lib/stores/adStore.js';

  // Clear all stores on component destruction
  onDestroy(() => {
    files.clearFiles();
    conversionStatus.reset();
    uploadStore.clearMessage();
    paymentStore.hidePrompt();
  });

  // Reactive declarations for conversion state
  $: showApiKeyInput = needsApiKey && !$apiKey;
  $: canStartConversion = (!needsApiKey || !!$apiKey) && 
                         $files.length > 0 && 
                         $conversionStatus.status !== 'converting' &&
                         ($paymentStore.status === 'completed' || $paymentStore.status === 'skipped');
  $: isComplete = $conversionStatus.status === 'completed';
  $: hasError = $conversionStatus.status === 'error';
  $: isConverting = $conversionStatus.status === 'converting';
  $: showUploader = !isConverting && !isComplete;
  $: showMainContent = $paymentStore.status === 'completed' || $paymentStore.status === 'skipped';

  // State management for API key visibility
  let needsApiKey = false; // Initialize needsApiKey
  $: {
    needsApiKey = $files.some(file => requiresApiKey(file));
  }

  function handlePayment(event) {
    const { amount } = event.detail;
    console.log('Payment received:', { amount });
    paymentStore.setAmount(amount);
    paymentStore.setStatus('completed');
  }

  function handlePaymentSkip() {
    console.log('Payment skipped');
    paymentStore.setStatus('skipped');
  }

  function handleStartConversion() {
    if (!canStartConversion) return;
    
    try {
      console.log('Starting conversion process');
      // Show the ad when conversion starts
      adStore.show();
      startConversion();
    } catch (error) {
      console.error('Conversion error:', error);
      conversionStatus.setError(error.message);
      conversionStatus.setStatus('error');
    }
  }

  function handleCancelConversion() {
    cancelConversion();
  }
</script>

<div class="app-container">
  {#if !showMainContent}
    <PaymentInput 
      showPayment={true}
      on:payment={handlePayment}
      on:skip={handlePaymentSkip}
    />
  {:else}
    <div class="converter-app app-content-width" in:fade={{ duration: 300 }}>
      <ProfessorSynapseAd />
      <div class="instructions-wrapper">
        <Instructions />
      </div>

      {#if showUploader}
        <div class="upload-wrapper" transition:fly|local={{ y: 20, duration: 400 }}>
          <FileUploader />
        </div>
      {/if}

      {#if $files.length > 0}
        <div class="results-wrapper" transition:fly|local={{ y: 20, duration: 400 }}>
          <ResultDisplay 
            on:startConversion={handleStartConversion}
            on:cancelConversion={handleCancelConversion}
            on:convertMore={() => {
              // Clear stores before page reload
              files.clearFiles();
              conversionStatus.reset();
              uploadStore.clearMessage();
              paymentStore.hidePrompt();
              // Reload page
              window.location.reload();
            }}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(.app-content-width) {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .app-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 2rem var(--spacing-md);
  }

  .converter-app {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .instructions-wrapper {
    width: 100%;
  }

  .upload-wrapper,
  .results-wrapper {
    position: relative;
  }

  @media (max-width: 768px) {
    .app-container {
      padding: 1rem var(--spacing-sm);
    }

    .converter-app {
      gap: var(--spacing-sm);
    }
  }
</style>
