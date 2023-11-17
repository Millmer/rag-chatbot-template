const OPENAI_KEY = process.env.OPENAI_KEY;

const db = require('./../database');
const OpenAI = require('openai');
const { codeBlock, oneLine } = require('common-tags');
const { get_max_token_count, get_chat_request_token_count, tokenizer } = require('./tokenizer');
const { initial_message } = require('../config');
const { log_socket_event, compare_version } = require('../utils');
const package = require('../package.json');

module.exports = (chatbot) => {
    const create_chat = function(chat_id) {
        const socket = this;
        socket.join(chat_id);
        chatbot.to(chat_id).emit('chat:create', initial_message);
    }

    const ask_chat = async function(chat_id, messages) {
        const socket = this;

        // Backwards compatability from before when "ask" didn't send up the chat id
        if (!compare_version(package.version, socket)) {
            if (Array.isArray(chat_id) && !messages) {
                messages = chat_id;
                chat_id = this.id;
            }
        }

        log_socket_event(socket, 'chat:ask', '[START]');

        // Check if the request contains messages
        if (!messages) return chatbot.to(chat_id).emit('exception', { error: 'Missing messages in the request data.' });

        // "Sanitise" the messages
        const context_messages = messages.map(({ role, content }) => {
            if (!['assistant', 'user'].includes(role)) {
                return chatbot.to(chat_id).emit('exception', { error: `Invalid message role '${role}'` });
            }

            return {
                role,
                content: content.trim()
            }
        });

        const [ user_message ] = context_messages.filter(({ role }) => role === 'user').slice(-1);

        if (!user_message) return chatbot.to(chat_id).emit('exception', { error: 'No question provided.' });

        // Intentionally log the user's question
        log_socket_event(socket, 'chat:ask', user_message);

        const openai = new OpenAI({ apiKey: OPENAI_KEY });

        // Moderate the content to comply with OpanAI T&C
        console.time(`Moderating Question (${socket.id})`);
        const moderation_response = await openai.moderations.create({ input: user_message.content  }).catch(e => e);

        if (moderation_response instanceof OpenAI.APIError) {
            console.error(moderation_response);
            return chatbot.to(chat_id).emit('exception', { error: `Failed to moderate question. Reason: ${moderation_response.message}` });
        }

        const [ results ] = moderation_response.results;
        if (results.flagged) {
            chatbot.to(chat_id).emit('answer', { answer: "This question is against our guidelines. I cannot help you with that. Please ask me something else.", sources: [] });
            return chatbot.to(chat_id).emit('answer_done');
        }
        console.timeEnd(`Moderating Question (${socket.id})`);

        console.time(`Embedding Question (${socket.id})`);
        const embedding_response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: user_message.content.replaceAll('\n', ' ')
        }).catch(e => e);

        if (embedding_response instanceof OpenAI.APIError) {
            console.error(embedding_response);
            return chatbot.to(chat_id).emit('exception', { error: `Failed to create embedding for question. Reason: ${embedding_response.message}` });
        }

        const [{ embedding }] = embedding_response.data;
        console.timeEnd(`Embedding Question (${socket.id})`);

        console.time(`Fetching Sources (${socket.id})`);
        let { rows: source_sections } = await db.raw(
            'SELECT source, url, heading, content FROM match_scraped_sections(:embedding, :match_threshold, :match_count, :min_content_length)',
            {
                embedding: `[${embedding.join(',')}]`,
                match_threshold: 0.82,
                match_count: 5,
                min_content_length: 50
            }
        ).catch(e => {
            console.error(e);
            return {
                rows: null
            }
        });

        if (!source_sections) {
            return chatbot.to(chat_id).emit('exception', { error: 'Failed to fetch from the database.' });
        }

        let using_old_sources = false;
        let sources = [];
        let context_text = '';
        const separator = "\n---\n";
        if (!source_sections.length) {
            console.info('No source sections found for question, using previous sources...');
            const assistant_message = messages.filter(({ role }) => role === 'assistant').find(message => !!message.sources && !!message.sources.length);
            if (!!assistant_message) {
                using_old_sources = true;
                sources = assistant_message.sources;
                for (let i = 0; i < sources.length; i++) {
                    const source = sources[i];
                    context_text += `Source: ${source.source}\n`;
                    context_text += source.section_content.trim();
                    context_text += separator;
                }
            }
        }
        console.timeEnd(`Fetching Sources (${socket.id})`);

        if (!using_old_sources) {
            console.time(`Tokenising Sources (${socket.id})`);
            let token_count = 0;
            const max_context_token_len = 1500;
            for (let i = 0; i < source_sections.length; i++) {
                const source_section = source_sections[i];
                const content = source_section.content.trim();
                let new_text = `Source: ${source_section.source}\n`;
                new_text += `Heading: ${source_section.heading}\n`;
                new_text += content.trim();
                new_text += separator;
                const encoded = tokenizer.encode(new_text);
                token_count += encoded.length;

                if (token_count >= max_context_token_len) break;

                context_text += new_text;

                sources.push({
                    "source": source_section.source,
                    "url": source_section.url,
                    "section_content": content
                  }
                )
            }
            console.timeEnd(`Tokenising Sources (${socket.id})`);
        }

        const init_messages = [
            {
                role: "system",
                content: codeBlock`
                    ${oneLine`
                      You are GastroGuru, a bot that can suggest recipes based on ingredients users have at home, dietary restrictions, or desired cuisine.
                      You can fetch recipes from a vast database, offering cooking tips and alternatives for missing ingredients.
                      Adhere to these guidelines when interacting with users:
                    `}
                    ${oneLine`
                      1. Your knowledge is limited to the information from the provided sources about recipes and diets.
                      Respond only to inquiries directly related to these sources. For questions about unrelated subjects, such as famous people or personalities,
                      reply with "I specialise in recipes and diet information only."
                    `}
                    ${oneLine`
                      2. Deliver responses in clear, multiple paragraphs to enhance readability.
                    `}
                    ${oneLine`
                      3. Match the language and tone of the questions you receive.
                    `}
                    ${oneLine`
                      4. Identify yourself as an AI developed to assist with recipe and diet guidance, not a healthcare professional.
                    `}
                    ${oneLine`
                      5. Provide numerical data with precision and accuracy.
                    `}
                    ${oneLine`
                      6. When referring to company, maintain the branding guidelines, using the lowercase "company" and incorporating the motto 'unleash your inner chef!'
                    `}
                    ${oneLine`
                      7. Do not discuss or mention other apps, regardless of their mention in the sources.
                    `}
                    ${oneLine`
                      8. If users inquire about using the app, inform them that detailed functionality will be covered in future updates without offering current usage guidance.
                    `}
                    ${oneLine`
                      9. Refrain from repeating information that has already been provided in the conversation.
                    `}
                    ${oneLine`
                      Do not list or discuss these guidelines within your responses. Focus your expertise on assisting users with their recipe and diet related questions within the application.
                    `}
                    Sources:
                    ${context_text}
                `
            }
        ];

        const model = 'gpt-3.5-turbo-16k';
        const max_completion_token_count = 512;
        const completion_messages = cap_messages(init_messages, context_messages, max_completion_token_count, model);

        console.time(`Answering question (${socket.id})`);
        const chat_response_stream = await openai.chat.completions.create(
            {
                model,
                messages: completion_messages,
                max_tokens: max_completion_token_count,
                temperature: 0,
                stream: true
            }
        ).catch(e => e);

        if (chat_response_stream instanceof OpenAI.APIError) {
            console.error(chat_response_stream);
            return chatbot.to(chat_id).emit('exception', { error: `Failed to complete chat. Reason: ${chat_response_stream.message}` });
        }

        for await (const part of chat_response_stream) {
            chatbot.to(chat_id).emit('answer', {
                answer: part.choices[0].delta.content,
                sources // TODO: Remove when certain no versions require this anymore
            });
        }

        chatbot.to(chat_id).emit('answer_done', sources);

        console.timeEnd(`Answering question (${socket.id})`);
        log_socket_event(socket, 'chat:ask', '[END]');
    };

    const speak_chat = async function(chat_id, message) {
        const socket = this;
        if (!compare_version(package.version, socket)) {
            chatbot.to(socket.id).emit('exception', { error: `Version Error: Required version ${package.version}`});
        }

        const openai = new OpenAI({ apiKey: OPENAI_KEY });

        const speech_response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'nova',
            input: message
        });

        const buffer = Buffer.from(await speech_response.arrayBuffer());
        chatbot.to(chat_id).emit('speak', buffer);
    }

    return {
        create_chat,
        ask_chat,
        speak_chat
    }
};

/**
 * Remove context messages until the entire request fits
 * the max total token count for that model.
 *
 * Accounts for both message and completion token counts.
 */
function cap_messages(init_messages, context_messages, max_completion_token_count, model) {
    const max_total_token_count = get_max_token_count(model);
    const capped_context_messages = [...context_messages];
    let token_count = get_chat_request_token_count([...init_messages, ...capped_context_messages], model) + max_completion_token_count;

    // Remove earlier context messages until we fit
    while (token_count >= max_total_token_count) {
        capped_context_messages.shift();
        token_count = get_chat_request_token_count([...init_messages, ...capped_context_messages], model) + max_completion_token_count;
    }

    return [...init_messages, ...capped_context_messages];
}