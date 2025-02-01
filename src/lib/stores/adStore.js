// src/lib/stores/adStore.js
import { writable } from 'svelte/store';

function createAdStore() {
  const { subscribe, set, update } = writable({
    visible: false,
    initialized: false
  });

  return {
    subscribe,
    show: () => {
      console.log('🎭 adStore.show() called');
      update(state => {
        console.log('🎭 adStore updating visibility to true');
        return { ...state, visible: true, initialized: true };
      });
    },
    hide: () => update(state => ({ ...state, visible: false })),
    reset: () => set({ visible: false, initialized: false })
  };
}

export const adStore = createAdStore();
