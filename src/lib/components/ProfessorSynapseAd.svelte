<!-- src/lib/components/ProfessorSynapseAd.svelte -->
<script>
  import { fade, fly } from 'svelte/transition';
  import { adStore } from '$lib/stores/adStore.js';
  import { onMount } from 'svelte';
  import Container from './common/Container.svelte';

  let adRef;

  onMount(() => {
    console.log('🎭 ProfessorSynapseAd mounted, state:', {
      visible: $adStore.visible,
      initialized: $adStore.initialized
    });
    if ($adStore.visible && $adStore.initialized) {
      setTimeout(() => {
        adRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });

  // Watch for changes to adStore state
  $: {
    console.log('🎭 adStore state changed:', {
      visible: $adStore.visible,
      initialized: $adStore.initialized
    });
    if ($adStore.visible && $adStore.initialized && adRef) {
      setTimeout(() => {
        adRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
</script>

{#if $adStore.visible && $adStore.initialized}
  {console.log('🎭 Rendering ad content, visibility:', $adStore.visible)}
  <div class="synapse-message" bind:this={adRef}>
    <div class="ad-wrapper" in:fly={{ y: 30, duration: 400 }}>
      <Container class="ad-container">
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
      </Container>
    </div>
  </div>
{/if}

<style>
  .synapse-message {
    margin-top: var(--spacing-xl);
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0 var(--spacing-md);
  }

  .ad-wrapper {
    width: 100%;
  }

  :global(.ad-container) {
    background: var(--color-surface);
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
      padding: var(--spacing-sm);
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
</style>
