<button
    class="shadow {classes}"
    class:bold
    class:cm-blue={blue}
    class:full-width={full_width}
    class:brown={brown}
    class:grey
    class:my-1={!no_margin}
    class:red
    class:search
    class:white
    {disabled}
    on:click|stopPropagation={() => dispatch('click')}
>
    {#if icon}
        <i class="{icon}"></i>
    {/if}
    {text}
    <slot />
</button>

<script>
import { createEventDispatcher } from 'svelte';

export let icon = '';
export let text = '';
export let disabled = false;

/* Classes */
export let classes = '';
export let blue = false;
export let bold = false;
export let brown = false;
export let grey = false;
export let red = false;
export let search = false;
export let white = false;
export let full_width = false;
export let no_margin = false;

const dispatch = createEventDispatcher();
</script>

<style>
button {
    font-size: 14;
    padding: 0.25rem 0.75rem;
    border-radius: 4;
    transition: all 0.2s;
}

button:disabled {
    background-color: #a1a1aa;
    filter: none;
}

.brown {
    background-color: var(--guru-brown) !important;
    color: white;
}

.red {
    background-color: var(--guru-red) !important;
}

.simple-button.search {
    margin-bottom: 1px;
}

.white {
    background-color: white;
    color: var(--guru-brown) !important;
}
</style>