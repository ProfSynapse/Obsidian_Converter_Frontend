// src/lib/stores/adStore.js
import { writable } from 'svelte/store';

function createAdStore() {
  const { subscribe, set, update } = writable({
    visible: false
  });

  return {
    subscribe,
    show: () => update(state => ({ ...state, visible: true })),
    hide: () => update(state => ({ ...state, visible: false })),
    reset: () => set({ visible: false })
  };
}

export const adStore = createAdStore();
