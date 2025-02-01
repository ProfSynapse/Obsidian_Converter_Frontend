// src/lib/stores/adStore.js
import { writable } from 'svelte/store';

function createAdStore() {
  // Initialize from localStorage if available
  const storedState = typeof localStorage !== 'undefined' 
    ? JSON.parse(localStorage.getItem('adStore') || '{"visible":false,"initialized":false}')
    : { visible: false, initialized: false };

  const { subscribe, set, update } = writable(storedState);

  // Subscribe to changes and save to localStorage
  if (typeof localStorage !== 'undefined') {
    subscribe(state => {
      localStorage.setItem('adStore', JSON.stringify(state));
    });
  }

  return {
    subscribe,
    show: () => {
      console.log('🎭 adStore.show() called');
      update(state => {
        console.log('🎭 adStore updating visibility to true');
        return { ...state, visible: true, initialized: true };
      });
    },
    // Remove hide and reset methods to prevent accidental visibility changes
  };
}

export const adStore = createAdStore();
