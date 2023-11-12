<div class="chat-window">
    <div
        class="date-container"
    >
        Today
    </div>
    <div class="message-list" bind:this={chat_window}>
        {#each messages as message}
            {#if message.content === '...' && message.role === 'assistant'}
                <Bubble role={message.role} loading>
                    <span class="loading-dot" />
                    <span class="loading-dot" />
                    <span class="loading-dot" />
                </Bubble>
            {:else}
            <Bubble role={message.role} sources={message.sources}>
                <p class="content">{@html message.content}</p>
            </Bubble>
            {/if}
            {#if message.role === 'assistant' && message.sources && message.sources.length > 0 && !is_streaming && !message.showing_sources}
                <div class="sources-button">
                    <Button green disabled={is_streaming} on:click={show_sources(message)}>
                        Show sources
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
    </div>
</div>

<p class="0.5 italic" style="float: right;">GastroGuru
    <span class="0.5">v{ PKG.version }</span>
</p>

<script>
import { io } from 'socket.io-client';
import 'stylyn';
import './../css/style.css';

import { tick } from 'svelte';
import { page } from '$app/stores';
import { PUBLIC_CHATBOT_API_URL } from '$env/static/public';

import Bubble from '$components/Bubble.svelte';
import Button from "$components/Button.svelte";
import SendIcon from '$components/icons/send.svg?raw';

const key = $page.url.searchParams.get('key');

const socket = io(PUBLIC_CHATBOT_API_URL, {
      path: "/chatbot/",
      auth: {
          key
      }
});

socket.on('connect', _ => socket.emit('chat:create', crypto.randomUUID()));

socket.on('chat:create', data => {
    set_message(
        messages.length - 1,
        'assistant',
        data
    )
});

socket.on('answer', data => {
    let old = messages[messages.length - 1].content;
    if (old == '...') {
        old = '';
    }

    const answer_delta = data.answer.replace(/(?:\r\n|\r|\n)/g, '<br>');
    set_message(
        messages.length - 1,
        'assistant',
        old + answer_delta,
        data.sources
    );
    scroll_to_bottom(chat_window);
});

socket.on('answer_done', _ => {
    is_streaming = false;
    scroll_to_bottom(chat_window);
});

socket.on('exception', data => {
    if (data.error) {
        set_message(messages.length - 1, 'assistant', `Sorry, I encountered an error. Please ask me again. ${data.error}`);
    } else {
        set_message(messages.length - 1, 'assistant', 'Sorry, I encountered an error. Please ask me again.');
    }
    is_streaming = false;
});

socket.on('connect_error', _ => {
    set_message(messages.length - 1, 'assistant', 'Sorry, I encountered an error. Please ask me again.');
    is_streaming = false;
});

socket.on('error', _ => {
    set_message(messages.length - 1, 'assistant', 'Sorry, I encountered an error. Please ask me again.');
    is_streaming = false;
});

let chat_window;
let messages = [
    {
        role: 'assistant',
        content: "..."
    }
];
let question = '';
let is_streaming = false;

function set_message(index, role, content, sources = null) {
    messages[index] = {
        role,
        content,
        sources,
        showing_sources: false
    }
}

async function ask() {
    messages = [
        ...messages,
        { role: 'user', content: question },
        { role: 'assistant', content: "..." }
    ];
    question = '';

    is_streaming = true;
    const filtered_messages = messages.filter(message => !['assistant:sources', 'user:action'].includes(message.role)).slice(0, -1);
    socket.emit('chat:ask', filtered_messages);
    await tick();
    scroll_to_bottom(chat_window);
}

async function show_sources(message) {
    message.showing_sources = true;
    set_message(
      messages.length,
      'user:action',
      'Show Sources'
    );
    set_message(
      messages.length,
      'assistant:sources',
      'Of course! Here are the sources I used',
      message.sources
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
