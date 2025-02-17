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
    border-radius: var(--rounded-lg);
    position: relative;
    background: transparent;
  }

  .accordion-wrapper::before {
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
    position: relative;
    z-index: 1;
    border-radius: var(--rounded-lg);
    transition: background-color 0.2s ease;
  }

  .accordion-header:hover {
    background: rgba(var(--color-prime-rgb), 0.1);
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
    position: relative;
    background: transparent;
    margin-top: -2px;
    padding: var(--spacing-sm);
  }

  .accordion-content::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--color-prime), var(--color-second));
    opacity: 0.3;
  }

  /* High Contrast Mode */
  @media (prefers-contrast: high) {
    .accordion-wrapper::before {
      padding: 3px;
      opacity: 1;
    }
  }
</style>
