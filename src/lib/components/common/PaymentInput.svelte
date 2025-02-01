<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Button from './Button.svelte';
  import { paymentService } from '../../services/payment';
  import { paymentStore } from '../../stores/payment';

  const dispatch = createEventDispatcher();

  export let showPayment = false;
  let className = '';
  export { className as class };

  let customAmount = '';
  let selectedAmount = null;
  let isProcessing = false;
  let error = null;
  let cardElement;
  
  const presetAmounts = [
    { value: 5, label: '5 Copper 🥉' },
    { value: 10, label: '10 Silver 🥈' },
    { value: 20, label: '20 Gold 🥇' }
  ];

  let initializationError = false;

  onMount(async () => {
    if (showPayment) {
      try {
        await paymentService.init();
        
        cardElement = paymentService.createCardElement();
        cardElement.mount('#card-element');
        cardElement.on('change', handleCardChange);
        
        error = null;
        initializationError = false;
      } catch (err) {
        console.error('Failed to initialize payment:', err);
        error = 'Payment system initialization failed. Please try again later.';
        initializationError = true;
      }
    }
  });

  onDestroy(() => {
    if (cardElement) {
      cardElement.destroy();
    }
  });

  function handleCardChange(event) {
    if (event.error) {
      error = event.error.message;
    } else {
      error = null;
    }
  }

  function handleAmountSelect(amount) {
    selectedAmount = amount;
    customAmount = amount.toString();
    error = null;
  }

  function handleCustomAmountInput(event) {
    customAmount = event.target.value;
    selectedAmount = parseFloat(customAmount);
    error = null;
  }

  async function handleContinue() {
    const amount = parseFloat(customAmount) || 0;
    
    if (!amount || amount <= 0) {
      error = 'Please enter a valid amount';
      return;
    }

    if (!cardElement) {
      error = 'Payment form not initialized';
      return;
    }

    isProcessing = true;
    error = null;

    try {
      // 1. Get client secret from backend
      const clientSecret = await paymentService.initiatePayment(amount);
      
      // 2. Confirm the payment with Stripe
      await paymentService.confirmPayment(clientSecret);
      
      // 3. Handle success
      dispatch('payment', { amount });
    } catch (err) {
      error = err.message || 'Payment failed. Please try again.';
      console.error('Payment error:', err);
    } finally {
      isProcessing = false;
    }
  }

  function handleSkip() {
    dispatch('skip');
  }
</script>

{#if showPayment}
  <div class="magical-border {className}" in:fade={{ duration: 300 }}>
    <div class="content" in:fly={{ y: 20, duration: 400 }}>
      <!-- Professor's Message -->
      <div class="professor-message">
        <h2>🧙🏾‍♂️ Welcome to the Markdown Transformation Engine!</h2>
        
        <div class="feature-list">
          <p>Transform your content into Obsidian-optimized Markdown to:</p>
          <ul>
            <li>✨ Build your Second Brain</li>
            <li>✨ Ensure data sovereignty</li>
            <li>✨ Make knowledge management effortless</li>
          </ul>
        </div>
        
        <p>Our arcane algorithms are free to use, but we welcome your support in maintaining the ethereal servers.</p>
        
        <div class="signature">
          ~ Professor Synapse<br>
        </div>
      </div>

      <!-- Payment Options -->
      <div class="payment-options">
        <div class="preset-amounts">
          {#each presetAmounts as amount}
            <button
              class="amount-button {selectedAmount === amount.value ? 'selected' : ''}"
              on:click={() => handleAmountSelect(amount.value)}
            >
              {amount.label}
            </button>
          {/each}
        </div>

        <div class="input-row">
          <div class="custom-amount">
            <label for="custom-amount">Custom Amount</label>
            <div class="input-wrapper">
              <span class="currency-symbol">$</span>
              <input
                id="custom-amount"
                type="number"
                min="0"
                step="0.01"
                bind:value={customAmount}
                on:input={handleCustomAmountInput}
                placeholder="Enter amount"
              />
            </div>
          </div>
        </div>

        <!-- Stripe Card Element -->
        <div class="card-element-container">
          <div id="card-element"></div>
          {#if error}
            <div class="error-message">{error}</div>
          {/if}
        </div>

        <div class="support-button">
          <Button 
            on:click={handleContinue} 
            disabled={isProcessing || initializationError || !cardElement}
          >
            {#if isProcessing}
              Processing...
            {:else}
              {customAmount ? `Support ($${customAmount})` : 'Support the Magic'}
            {/if}
          </Button>
        </div>

        <button class="skip-button" on:click={handleSkip}>
          I do not wish to support the magical arts at this time...
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .card-element-container {
    margin: 1rem 0;
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
  }

  .card-element-container:has(#card-element:not(:empty)) {
    min-height: 100px;
  }

  #card-element {
    padding: 0.5rem;
  }

  .error-message {
    color: #ff4444;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 68, 68, 0.1);
    border-radius: 4px;
  }

  .magical-border {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 2px;
    min-height: min-content;
    height: auto;
    display: flex;
    background: linear-gradient(45deg, #FFD700, #FF69B4, #4B0082, #FFD700);
    background-size: 400% 400%;
    border-radius: 12px;
    animation: shimmer 3s ease infinite;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: min-content;
    background: var(--color-background);
    padding: 1.5rem;
    border-radius: 10px;
    position: relative;
  }

  .professor-message {
    position: relative;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  h2 {
    color: var(--color-primary);
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .feature-list {
    margin: 1rem 0;
    padding: 0.75rem;
    background: rgba(var(--color-primary-rgb), 0.1);
    border-radius: 8px;
  }

  .feature-list ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
  }

  .feature-list li {
    margin: 0.4rem 0;
    padding-left: 1rem;
  }

  p {
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }

  .signature {
    font-style: italic;
    margin-top: 0.75rem;
    padding-left: 1rem;
    color: var(--color-primary);
    font-size: 0.9rem;
  }

  .payment-options {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .preset-amounts {
    display: flex;
    gap: 0.5rem;
  }

  .amount-button {
    flex: 1;
    padding: 0.5rem;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
  }

  .amount-button:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }

  .amount-button.selected {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .input-row {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }

  .custom-amount {
    flex: 1;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .currency-symbol {
    position: absolute;
    left: 0.75rem;
    color: var(--color-text);
  }

  input {
    width: 100%;
    padding: 0.5rem;
    padding-left: 1.5rem;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .support-button {
    min-width: 140px;
  }

  .support-button :global(button) {
    width: 100%;
  }

  .skip-button {
    background: none;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    font-size: 0.8rem;
    font-style: italic;
    text-decoration: underline;
    padding: 0.25rem;
    transition: color 0.3s ease;
    opacity: 0.7;
    margin: 0 auto;
  }

  .skip-button:hover {
    color: var(--color-primary);
    opacity: 0.9;
  }

  @keyframes shimmer {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @media (max-width: 640px) {
    .preset-amounts {
      flex-direction: column;
    }

    .input-row {
      flex-direction: column;
      gap: 0.75rem;
    }

    .support-button {
      width: 100%;
      min-width: unset;
    }
  }
</style>
