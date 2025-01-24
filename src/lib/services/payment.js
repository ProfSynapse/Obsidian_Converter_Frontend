import { loadStripe } from '@stripe/stripe-js';
import { paymentStore } from '../stores/payment';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.init();
  }

  async init() {
    try {
      this.stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      if (this.stripe) {
        this.elements = this.stripe.elements();
        console.log('✨ Stripe initialized successfully');
      } else {
        console.error('🚫 Failed to initialize Stripe');
      }
    } catch (error) {
      console.error('🚫 Error initializing Stripe:', error);
    }
  }

  createCardElement(options = {}) {
    if (!this.elements) {
      throw new Error('Stripe Elements not initialized');
    }
    return this.elements.create('card', {
      style: {
        base: {
          color: 'var(--color-text)',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          '::placeholder': {
            color: 'var(--color-text-light)',
          },
        },
      },
      ...options
    });
  }

  async initiatePayment(amount) {
    try {
      console.log('💫 Initiating payment for amount:', amount);
      paymentStore.startProcessing();
      
      // Send amount in cents to backend
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100) })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to initiate payment');
      }

      const { clientSecret } = await response.json();
      paymentStore.setClientSecret(clientSecret);
      return clientSecret;
    } catch (error) {
      console.error('🚫 Payment initiation failed:', error);
      paymentStore.setStatus('failed');
      paymentStore.setError(error.message);
      throw error;
    }
  }

  async confirmPayment(clientSecret) {
    try {
      console.log('🔄 Confirming payment...');
      
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret);
      
      if (error) {
        throw error;
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment confirmed successfully!');
        paymentStore.setStatus('completed');
        paymentStore.setError(null);
        return true;
      }

      throw new Error(`Payment status: ${paymentIntent.status}`);
    } catch (error) {
      console.error('🚫 Payment confirmation failed:', error);
      paymentStore.setStatus('failed');
      paymentStore.setError(error.message);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
