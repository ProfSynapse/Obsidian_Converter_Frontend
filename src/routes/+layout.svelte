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
  <!-- Header -->
  <header class="header animate-slide-in">
    <div class="flex items-center justify-center text-center w-full">
      <h1 class="header-title">
        <span class="icon">📝</span>
        <span>Markdown Note Converter</span>
      </h1>
    </div>
  </header>

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

  /* Header Styles */
  .header {
    position: relative;
    background-color: rgba(var(--color-prime), 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: var(--spacing-md) 0;
    width: 100%;
  }

  .header-title {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-on-dark);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .header-title .icon {
    font-size: 1.5em;
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

    .header-title {
      font-size: var(--font-size-2xl);
    }

    .main {
      padding: var(--spacing-md) 0;
    }
  }
</style>
