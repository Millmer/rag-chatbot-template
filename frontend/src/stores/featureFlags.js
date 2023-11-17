import { writable } from 'svelte/store';

export const feature_flags = writable({
    speak: false
});