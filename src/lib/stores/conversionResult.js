// src/lib/stores/conversionResult.js
import { writable } from 'svelte/store';

function createConversionResultStore() {
  const { subscribe, set, update } = writable(null);

  return {
    subscribe,
    setResult: (result) => set(result),
    clearResult: () => set(null),
    // Helper to check if there's a valid result
    hasResult: () => {
      let currentValue = null;
      subscribe(value => { currentValue = value; })();
      return currentValue !== null;
    }
  };
}

export const conversionResult = createConversionResultStore();
