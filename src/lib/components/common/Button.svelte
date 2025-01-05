<script>
  export let variant = 'primary'; // primary, secondary, danger
  export let type = 'button';
  export let disabled = false;
  export let fullWidth = false;
  export let size = 'medium'; // small, medium, large
</script>

<button
  {type}
  {disabled}
  class="button {variant} {size}"
  class:full-width={fullWidth}
  on:click
>
  <slot />
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm) var(--spacing-xl);
    border: none;
    border-radius: var(--rounded-lg);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-base);
    gap: var(--spacing-xs);
  }

  .button:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .button.primary {
    background: linear-gradient(90deg, #3B82F6 0%, #9333EA 100%);
    color: white;
    background-size: 200% 200%;
    animation: breathe 3s ease-in-out infinite;
  }

  .button.secondary {
    background: var(--color-background-secondary);
    color: var(--color-text-primary);
  }

  .button.danger {
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    color: white;
    background-size: 200% 200%;
    animation: breathe 3s ease-in-out infinite;
  }

  .button:not(:disabled):hover {
    transform: scale(1.02);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  }

  .full-width {
    width: 100%;
  }

  /* Size variants */
  .small {
    padding: var(--spacing-xs) var(--spacing-lg);
    font-size: var(--font-size-sm);
  }

  .large {
    padding: var(--spacing-md) var(--spacing-2xl);
    font-size: var(--font-size-lg);
  }

  @keyframes breathe {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .button {
      animation: none;
    }
    .button:hover {
      transform: none;
    }
  }
</style>
