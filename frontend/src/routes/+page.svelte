<div class="chat-window">
    <div
        class="date-container"
    >
        Today
    </div>
    <div class="message-list" bind:this={chat_window}>
        {#each messages as message}
            {#if message.content === '...' && message.role === MessageRole.ASSISTANT}
                <Bubble message={message} loading>
                    <span class="loading-dot" />
                    <span class="loading-dot" />
                    <span class="loading-dot" />
                </Bubble>
            {:else if [MessageState.MESSAGE, MessageState.ASSISTANT_SOURCES, MessageState.ASSISTANT_GENERATING].includes(message.state)}
                <Bubble message={message}>
                    <p class="content">{@html message.content}</p>
                </Bubble>
            {:else if message.role === MessageRole.USER && message.state === MessageState.USER_ACTION}
                <div class="sources-button">
                    <Button green disabled={is_streaming} on:click={show_sources(message)}>
                        { message.content }
                    </Button>
                </div>
            {/if}
        {/each}
    </div>

    <div class="message-input">
        <input
            type="text"
            placeholder="Ask a question"
            disabled={is_streaming}
            bind:value={question}
            on:keydown={(e) => e.key === 'Enter' && ask()}
        />
        <Button green disabled={is_streaming} on:click={ask}>
            {@html SendIcon}
        </Button>
        {#if $feature_flags.speak}
            <Button green disabled={is_streaming} on:click={toggle_mute}>
                {#if is_muted}
                    {@html SpeakerMuted}
                {:else}
                    {@html SpeakerUnmuted}
                {/if}
            </Button>
        {/if}
    </div>
</div>

<p class="0.5 italic" style="float: right; padding-right: 1rem;">GastroGuru
    <span class="0.5">v{ PKG.version }</span>
</p>

<script>
import 'stylyn';
import './../css/style.css';

import { page } from '$app/stores';
import { onMount, tick } from 'svelte';
import { initialise_socket } from '$lib/webSocketConnection.js';
import { MessageState } from '$lib/messageStates.js';
import { MessageRole } from '$lib/messageRoles.js';

import { feature_flags } from '$stores/featureFlags';

import Bubble from '$components/Bubble.svelte';
import Button from "$components/Button.svelte";
import SendIcon from '$components/icons/send.svg?raw';
import SpeakerUnmuted from '$components/icons/speaker-unmuted.svg?raw';
import SpeakerMuted from '$components/icons/speaker-muted.svg?raw';

let socket;
const chat_id = crypto.randomUUID();
let chat_window;
let messages = [{ role: MessageRole.ASSISTANT, content: "...", state: MessageState.MESSAGE }];
let question = '';
let is_streaming = false;
let audio;
let audio_url;
let is_muted = false;
let generating_message;

onMount(() => {
    // Set feature flags
    const flags = { ...feature_flags };
    $page.url.searchParams.getAll('feature').forEach(flag => {
        flags[flag] = true;
    });
    feature_flags.set(flags);

    // Initialise socket
    const key = $page.url.searchParams.get('key');
    socket = initialise_socket({ key });

    socket.on('connect', _ => socket.emit('chat:create', chat_id));

    socket.on('chat:create', data => {
        set_message(
            messages.length - 1,
            {
                role: MessageRole.ASSISTANT,
                content: data
            }
        );
    });

    socket.on('answer', data => {
        let old = messages[messages.length - 1].content;
        if (old == '...') {
            old = '';
        }

        if (data.answer) {
            const answer_delta = data.answer.replace(/(?:\r\n|\r|\n)/g, '<br>');
            set_message(
                messages.length - 1,
                {
                    role: MessageRole.ASSISTANT,
                    content: old + answer_delta,
                }
            );
            scroll_to_bottom(chat_window);
        }
    });

    socket.on('answer_done', async sources => {
        is_streaming = false;
        speak(messages[messages.length - 1]);
        if (!!sources.length) {
            set_message(
                messages.length,
                {
                    role: MessageRole.USER,
                    content: 'Show Sources',
                    state: MessageState.USER_ACTION,
                    sources
                }
            );
        }
        await tick();
        scroll_to_bottom(chat_window);
    });

    socket.on('speak', data => {
        if (audio && !audio.paused) {
            audio.pause();
            window.URL.revokeObjectURL(audio_url);
        }
        const audio_blob = new Blob([data], { type: 'audio/mp3' });
        audio_url = URL.createObjectURL(audio_blob);
        audio = new Audio(audio_url);
        audio.muted = is_muted;
        audio.play();

        // Remove generating message
        messages = messages.filter(message => message !== generating_message);
        generating_message = null;
    });

    socket.on('exception', data => {
        if (data.error) {
            set_message(
                messages.length - 1,
                {
                    role: MessageRole.ASSISTANT,
                    content: `Sorry, I encountered an error. Please ask me again. ${data.error}`
                }
            );
        } else {
            set_message(
                messages.length - 1,
                {
                    role: MessageRole.ASSISTANT,
                    content: 'Sorry, I encountered an error. Please ask me again.'
                }
            );
        }
        is_streaming = false;
    });

    socket.on('connect_error', _ => {
        set_message(
            messages.length - 1,
            {
                role: MessageRole.ASSISTANT,
                content: 'Sorry, I encountered an error. Please ask me again.'
            }
        );
        is_streaming = false;
    });

    socket.on('error', _ => {
        set_message(
            messages.length - 1,
            {
                role: MessageRole.ASSISTANT,
                content: 'Sorry, I encountered an error. Please ask me again.'
            }
        );
        is_streaming = false;
    });
});

function set_message(index, { role, content, state = MessageState.MESSAGE, sources = null }) {
    messages[index] = {
        role,
        content,
        state,
        sources
    }
    return messages[index];
}

async function ask() {
    messages = [
        ...messages,
        { role: MessageRole.USER, content: question, state: MessageState.MESSAGE },
        { role: MessageRole.ASSISTANT, content: "...", state: MessageState.MESSAGE }
    ];
    question = '';

    is_streaming = true;
    const filtered_messages = messages.filter(message => message.state === MessageState.MESSAGE).slice(0, -1);
    socket.emit('chat:ask', chat_id, filtered_messages);
    await tick();
    scroll_to_bottom(chat_window);
}

async function speak(message) {
    if ($feature_flags.speak) {
        generating_message = set_message(
            messages.length,
            {
                role: MessageRole.ASSISTANT,
                content: "Generating audio",
                state: MessageState.ASSISTANT_GENERATING
            }
        );
        await tick();
        socket.emit('chat:speak', chat_id, message.content);
        scroll_to_bottom(chat_window);
    }
}

function toggle_mute() {
    if (audio) audio.muted = !is_muted;
    is_muted = !is_muted;
}

async function show_sources(message) {
    set_message(
        messages.indexOf(message),
        {
            role: MessageRole.USER,
            content: 'Showing Sources',
            state: MessageState.ACTION_COMPLETED
        }
    );
    set_message(
        messages.length,
        {
            role: MessageRole.ASSISTANT,
            content: 'Of course! Here are the sources I used',
            state: MessageState.ASSISTANT_SOURCES,
            sources: message.sources
        }
    );
    await tick();
    scroll_to_bottom(chat_window);
};

const scroll_to_bottom = node => {
    const scroll = () =>
        node.scroll({
            top: node.scrollHeight,
            behavior: 'smooth'
        });
    if (!!node) scroll();

    return { update: scroll };
};
</script>

<style>
.chat-window {
    display: flex;
    flex-direction: column;
    height: 100vh;
    margin: auto;
    overflow: auto;
    justify-content: flex-end;
}

.chat-window * {
    font-size: 0.75rem;
}

.content {
    padding: 0.5rem;
    margin: 0;
    margin-top: 0.5rem;
    font-weight: normal;
}

.date-container {
    margin: auto;
    margin-top: 1rem;
    color: var(--guru-grey-400);
    text-align: center;
    font-style: normal;
    font-weight: 700;
    letter-spacing: -0.234px;
}

.loading-dot {
    display: inline-block;
    color: var(--guru-grey-500);
    background-color: var(--guru-grey-500);
    border-radius: 50%;
    height: 0.35rem;
    width: 0.35rem;
    margin: 0.25rem;
    animation: wave 1s infinite;
}

.loading-dot:nth-child(2) {
    animation-delay: -0.5s;
}

.loading-dot:nth-child(3) {
    animation-delay: -1s;
}

.message-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 1rem;
    border-top: 1px solid #ECEFF1;
}

.message-input input {
    flex-grow: 1;
    padding: 0.5rem;
    padding-left: 0.65rem;
    transition: border-color 0.3s ease-in-out;
    font-family: Roboto;
    font-size: 1.75rem;
    font-style: normal;
    line-height: normal;
    border-top: 1px solid #ECEFF1;
}

.message-input input::placeholder {
    color: var(--guru-grey-300);
}

.message-input input:focus {
    outline: none;
    border-color: #4a90e2;
}

.message-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    flex-grow: 1;
}

.sources-button {
    align-self: flex-end;
}

@keyframes wave {
    0% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-0.5rem);
    }
    100% {
        transform: translateY(0);
    }
}
</style>
