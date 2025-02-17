<script>
  import { slide } from 'svelte/transition';
  
  export let title = '';
  export let icon = '';
  export let expandedIcon = icon;
  export let isGradientParent = false;
  let expanded = false;
</script>

<div class="accordion-wrapper" class:gradient-parent={isGradientParent}>
  <button class="accordion-header" on:click={() => expanded = !expanded}>
    <span class="icon">{expanded ? expandedIcon : icon}</span>
    <span class="title">{title}</span>
    <span class="arrow" class:expanded>{expanded ? '▼' : '▶'}</span>
  </button>
  {#if expanded}
    <div class="accordion-content" transition:slide>
      <slot />
    </div>
  {/if}
</div>

<style>
  .accordion-wrapper {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--rounded-md);
  }

  .accordion-wrapper:not(.gradient-parent) {
    background: var(--color-surface);
  }

  .accordion-wrapper.gradient-parent {
    background: rgba(255, 255, 255, 0.1);
  }

  .accordion-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: var(--font-size-base);
    font-weight: 500;
    text-align: left;
  }

  .accordion-header:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .title {
    flex: 1;
  }

  .icon {
    font-size: 1.2em;
  }

  .arrow {
    font-size: 0.8em;
    transition: transform 0.2s ease;
  }

  .arrow.expanded {
    transform: rotate(0deg);
  }

  .accordion-content {
    border-top: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.05);
  }
</style>
