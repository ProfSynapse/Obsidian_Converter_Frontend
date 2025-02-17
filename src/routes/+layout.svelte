<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import '$lib/styles/global.css';
  
  onMount(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#00a99d">
  <link 
    rel="preload" 
    href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
    as="style"
    on:load={e => {
      e.target.onload = null;
      e.target.rel = 'stylesheet';
    }}
  >
</svelte:head>

<div class="app-shell">
  <!-- Main Content -->
  <main class="main animate-fade-in">
    <div class="content-area">
      <slot />
    </div>
  </main>
</div>

<style>
  /* App Shell */
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(135deg, var(--color-prime), var(--color-second));
    padding: var(--spacing-md);
    box-sizing: border-box;
    align-items: center;
    gap: var(--spacing-md);
  }

  /* Main Content Area */
  .main {
    flex: 1;
    padding: var(--spacing-md) 0;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
  }

  .content-area {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    width: 100%;
    max-width: var(--content-width-lg);
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .app-shell {
      padding: var(--spacing-lg);
      gap: var(--spacing-md);
    }

    .main {
      padding: var(--spacing-lg) 0;
    }

    .content-area {
      gap: var(--spacing-md);
    }
  }

  @media (max-width: 640px) {
    .app-shell {
      padding: var(--spacing-md);
      gap: var(--spacing-sm);
    }

    .main {
      padding: var(--spacing-md) 0;
    }
  }
</style>
