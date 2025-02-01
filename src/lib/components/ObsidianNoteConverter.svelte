<script>
  import FileUploader from './FileUploader.svelte';
  import Instructions from './Instructions.svelte';
  import ProfessorSynapseAd from './ProfessorSynapseAd.svelte';
  import PaymentInput from './common/PaymentInput.svelte';
  import Button from './common/Button.svelte';
  import { files } from '$lib/stores/files.js';
  import { startConversion } from '$lib/utils/conversionManager.js';
  import { showAd } from '$lib/stores/adStore.js';

  // Function to smoothly scroll to top of page
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  let mode = 'payment'; // 'payment', 'upload', or 'converted'

  function handleStartConversion() {
    mode = 'converted';
    showAd();
    startConversion();
    scrollToTop();
  }
</script>

<div class="app-container">
  <div class="converter-app">
    {#if mode === 'payment'}
      <Instructions />
      <PaymentInput 
        showPayment={true}
        on:payment={() => {
          mode = 'upload';
          scrollToTop();
        }}
        on:skip={() => {
          mode = 'upload';
          scrollToTop();
        }}
      />
    {:else if mode === 'upload'}
      <Instructions />
      <FileUploader />
      {#if $files.length > 0}
        <div class="button-container">
          <Button
            variant="primary"
            size="large"
            fullWidth
            on:click={handleStartConversion}
          >
            Start Conversion
          </Button>
        </div>
      {/if}
    {:else}
      <ProfessorSynapseAd />
      <div class="button-container">
        <Button 
          variant="primary"
          size="large"
          fullWidth
          on:click={() => {
            scrollToTop();
            window.location.reload();
          }}
        >
          Convert More Files
        </Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .app-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 2rem var(--spacing-md);
  }

  .converter-app {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .button-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: var(--spacing-md) 0;
  }

  @media (max-width: 768px) {
    .app-container {
      padding: 1rem var(--spacing-sm);
    }
  }
</style>
