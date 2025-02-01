<script>
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import Button from './common/Button.svelte';
  import Container from './common/Container.svelte';
  import { conversionStatus } from '$lib/stores/conversionStatus.js';

  const dispatch = createEventDispatcher();

  // Reactive declarations for button visibility
  $: isConverting = $conversionStatus.status === 'converting';
  $: isCompleted = $conversionStatus.status === 'completed';
</script>

<Container>
  {#if isCompleted}
    <div class="button-container" transition:fade>
      <Button 
        variant="primary"
        size="large"
        fullWidth
        on:click={() => window.location.reload()}
      >
        Convert More Files
      </Button>
    </div>
  {:else if !isConverting}
    <div class="button-container" transition:fade>
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
</Container>

<style>
  .button-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: var(--spacing-md) 0;
  }
</style>
