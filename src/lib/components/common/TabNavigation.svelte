<!-- src/lib/components/common/TabNavigation.svelte -->
<script>
    import { uploadStore } from '../../stores/uploadStore';
    import { slide } from 'svelte/transition';
    
    const tabs = [
      { id: 'single', icon: '🔗', label: 'Single URL', description: 'Convert a single webpage' },
      { id: 'parent', icon: '🗺️', label: 'Parent URL', description: 'Convert multiple linked pages' }
      // { id: 'youtube', icon: '🎥', label: 'YouTube', description: 'Convert YouTube videos' }
    ];
</script>

<div class="tabs-nav" role="tablist">
    <div class="tabs-container">
    {#each tabs as tab}
      <button
        class="tab-button"
        class:active={$uploadStore.activeTab === tab.id}
        on:click={() => uploadStore.setActiveTab(tab.id)}
        aria-selected={$uploadStore.activeTab === tab.id}
        role="tab"
        aria-controls="tab-content-{tab.id}"
        title={tab.description}
      >
        <span class="tab-icon" aria-hidden="true">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        {#if $uploadStore.activeTab === tab.id}
          <div class="active-indicator" transition:slide></div>
        {/if}
      </button>
    {/each}
    </div>
</div>

<style>
    .tabs-nav {
      width: 100%;
      background: transparent;
      padding: var(--spacing-xs);
      border-radius: var(--rounded-lg);
      position: relative;
    }

    .tabs-nav::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-lg);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      opacity: 0.3;
    }
  
    .tabs-container {
      display: flex;
      gap: var(--spacing-xs);
      position: relative;
      z-index: 1;
    }
  
    .tab-button {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      background: transparent;
      border: none;
      border-radius: var(--rounded-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all var(--transition-duration-normal);
      overflow: hidden;
    }

    .tab-button::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-md);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--transition-duration-normal);
    }
  
    .tab-button:hover:not(.active)::before {
      opacity: 0.2;
    }
  
    .tab-button.active::before {
      opacity: 0.3;
    }
  
    .tab-icon {
      font-size: 1.2em;
      position: relative;
      z-index: 1;
    }

    .tab-label {
      position: relative;
      z-index: 1;
    }
  
    .active-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, var(--color-prime), var(--color-second));
      border-radius: var(--rounded-full);
    }
  
    @media (max-width: 640px) {
      .tabs-container {
        flex-direction: column;
      }
  
      .tab-button {
        justify-content: flex-start;
        padding: var(--spacing-sm);
      }
    }
  
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .tabs-nav::before,
      .tab-button::before {
        padding: 3px;
        opacity: 1;
      }
    }
  
    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .tab-button {
        transition: none;
      }

      .tab-button::before {
        transition: none;
      }
    }
</style>
