<script>
  import { fade } from 'svelte/transition';
  import { adStore } from '$lib/stores/adStore.js';
  import Container from './common/Container.svelte';
  import Button from './common/Button.svelte';

  const HUBSPOT_FORM_URL = "https://share.hsforms.com/2btQaZmQrS4unHa0oeJTJfw3sy8k";
</script>

{#if $adStore.visible}
  <div class="ad-container" transition:fade>
    <Container isGradient={true}>
      <div class="professor-header">
        <span class="wizard-emoji">🧙🏾‍♂️</span>
        <h3>Greetings, Knowledge Seeker!</h3>
      </div>
      
      <div class="scroll-message">
        <p>While your knowledge transforms, let me share something magical with you! We've crafted a special series of lessons to help you master the art of personal knowledge management with Obsidian.</p>
        
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
          <p>Synaptic Labs offers specialized training in the mystic arts of:</p>
          <ul>
            <li>🎯 Personal Knowledge Management Solutions</li>
            <li>📚 Obsidian Vault & Plugin development</li>
            <li>🧠 Information Architecture for your Second Brain</li>
          </ul>
          
          <div class="crystal-ball">
            <Button 
              on:click={() => window.open(HUBSPOT_FORM_URL, '_blank')}
              fullWidth
              size="large"
            >
              ✨ Begin Your Magical Journey ✨
            </Button>
          </div>
        </div>
      </div>
    </Container>
  </div>
{/if}

<style>
  .ad-container {
    margin-top: var(--spacing-xl);
    width: 100%;
  }

  .professor-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .wizard-emoji {
    font-size: 2rem;
  }

  .professor-header h3 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  .scroll-message {
    padding: var(--spacing-md);
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--rounded-md);
  }

  .magical-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%;
    margin: var(--spacing-lg) 0;
  }

  .magical-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: var(--rounded-md);
  }

  .enchanted-scroll {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--rounded-md);
  }

  .enchanted-scroll h4 {
    margin: 0 0 var(--spacing-md);
    text-align: center;
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
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--rounded-md);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
