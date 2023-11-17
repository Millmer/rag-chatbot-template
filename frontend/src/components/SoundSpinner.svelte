<script>
    export let color = 'var(--guru-brown)';
    export let duration = '1.25s';
    export let size = '30';

    const durationUnitRegex = /[a-zA-Z]/;
    const range = (size, startAt = 0) => [...Array(size).keys()].map((i) => i + startAt);

    let durationUnit = duration.match(durationUnitRegex)?.[0] ?? 's';
    let durationNum = duration.replace(durationUnitRegex, '');
</script>

<div class="wrapper" style="--size: {size}px; --color: {color}; --duration: {duration}">
    {#each range(3, 1) as version}
        <div
            class="rect"
            style="animation-delay: {(version - 1) * (+durationNum / 12)}{durationUnit}"
        />
    {/each}
</div>

<style>
.wrapper {
    height: var(--size);
    width: var(--size);
    display: inline-block;
    text-align: center;
    font-size: 10px;
}
.rect {
    height: 100%;
    width: 10%;
    display: inline-block;
    margin-right: 4px;
    transform: scaleY(0.4);
    background-color: var(--color);
    animation: stretch var(--duration) ease-in-out infinite;
}
@keyframes stretch {
    0%,
    40%,
    100% {
        transform: scaleY(0.4);
    }
    20% {
        transform: scaleY(1);
    }
}
</style>