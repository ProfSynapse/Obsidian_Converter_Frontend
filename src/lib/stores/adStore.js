import { writable } from 'svelte/store';

const adStore = writable({
  visible: false
});

export { adStore };

export const showAd = () => {
  adStore.set({ visible: true });
};
