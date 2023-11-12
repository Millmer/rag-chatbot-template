{#if role.includes('assistant')}
    <div class="row profile-card">
        <div class="column 1 narrow">
            {@html BotIcon}
        </div>
        <p class="column 1 narrow">Bot</p>
    </div>
{/if}
<div class="bubble {role}-bubble {loading ? "loading-ellipse" : ""}" bind:clientWidth bind:clientHeight>
    <svg xmlns="http://www.w3.org/2000/svg" width={clientWidth} height={clientHeight} viewBox="0 0 {clientWidth} {clientHeight}" fill="none">
        <rect x=0 y=0 width={clientWidth} height={clientHeight} fill="white" rx=5/>

        {#if role.includes("assistant")}
            <path d="M 20 0 L 65 0 L 42.5 -15 A 0.5 0.6 90 0 0 27.5 -7.5 Q 30 0 20 0" />
        {:else if role.includes("user")}
            <path d="M 20 0 L 65 0 L 42.5 -15 A 0.5 0.6 90 0 0 27.5 -7.5 Q 30 0 20 0" transform="translate({clientWidth}) rotate(90)"/>
        {/if}

    </svg>

    <slot/>
    {#if role === "assistant:sources" && !!sources}
        {#each sources as { source, url, section_content }}
            <ul>
                <li>
                    <a href={url + `#:~:text=${encodeURIComponent(extract_first_sentence(section_content))}`} target="_blank">{source}</a>
                </li>
            </ul>
        {/each}
    {/if}
</div>

<script>
import BotIcon from '$components/icons/bot.svg?raw';

export let role = "assistant";
export let loading = false;
export let sources = null;

let clientWidth, clientHeight;

function extract_first_sentence(text) {
    const match = text.match(/[^.!?]*[.!?]/);
    return match ? match[0] : text;
}
</script>

<style>
.assistant-bubble, .assistant\:sources-bubble {
    align-self: flex-start;
    color: var(--guru-grey-500);
}

.assistant-bubble rect,
.assistant-bubble path,
.assistant\:sources-bubble rect,
.assistant\:sources-bubble path {
    fill: #FFF;
}

.bubble {
    display: inline-block;
    max-width: 95%;
    padding: 0.5rem;
    border-radius: 0.5rem;
    font-size: 1.5rem;
    font-style: normal;
    font-weight: 400;
    letter-spacing: -0.02925rem;
}

.bubble svg {
    overflow: visible;
    position: absolute;
    left: 0;
    z-index: -1;
    fill: #FFF;
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.15));
}

.loading-ellipse {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 1.5rem;
    width: 5rem;
}

.profile-card {
    max-width: 50vw;
    margin-bottom: -1rem;
    margin-left: 0.5rem;
}

.profile-card div {
    margin-right: 0.25rem;
    min-width: 35px;
    min-height: 35px;
}

.profile-card p {
    color: var(--guru-grey-700);
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
}

.user-bubble, .user\:action-bubble {
    color: #FFF;
    align-self: flex-end;
}

.user-bubble rect,
.user-bubble path,
.user\:action-bubble rect,
.user\:action-bubble path {
    fill: var(--guru-brown);
}

ul {
  color: var(--guru-grey--500);
  font-size: 0.8rem;
  font-weight: 400;
  list-style-type: disc;
  padding-left: 1rem;
}

li a {
  color: var(--guru-brown);
  font-style: normal;
  font-weight: 400;
  line-height: 19.5px;
  letter-spacing: -0.234px;
  text-decoration-line: underline;
}
</style>