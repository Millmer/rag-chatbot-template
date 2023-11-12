const { Tiktoken } = require('@dqbd/tiktoken/lite');
const cl100k_base = require("@dqbd/tiktoken/encoders/cl100k_base.json");

const tokenizer = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str
);

/**
 * Count the tokens for multi-message chat completion requests
*/
function get_chat_request_token_count(messages, model = 'gpt-3.5-turbo-0301') {
    const tokens_per_request = 3; // every reply is primed with <|im_start|>assistant<|im_sep|>
    const num_tokens = messages.reduce((acc, message) => acc + get_message_token_count(message, model), 0);

    return num_tokens + tokens_per_request;
}

/**
 * Count the tokens for a single message within a chat completion request
 *
 * See "Counting tokens for chat API calls"
 * from https://github.com/openai/openai-cookbook/blob/834181d5739740eb8380096dac7056c925578d9a/examples/How_to_count_tokens_with_tiktoken.ipynb
*/
function get_message_token_count(message, model = 'gpt-3.5-turbo-0301') {
    let tokens_per_message;
    let tokens_per_name;

    switch (model) {
        case 'gpt-3.5-turbo':
            console.warn(
                'Warning: gpt-3.5-turbo may change over time. Returning num tokens assuming gpt-3.5-turbo-0301.'
            );
            return get_message_token_count(message, 'gpt-3.5-turbo-0301');
        case 'gpt-4':
            console.warn('Warning: gpt-4 may change over time. Returning num tokens assuming gpt-4-0314.');
            return get_message_token_count(message, 'gpt-4-0314');
        case 'gpt-3.5-turbo-0301':
            tokens_per_message = 4; // every message follows <|start|>{role/name}\n{content}<|end|>\n
            tokens_per_name = -1; // if there's a name, the role is omitted
            break;
        case 'gpt-3.5-turbo-16k':
            tokens_per_message = 4; // every message follows <|start|>{role/name}\n{content}<|end|>\n
            tokens_per_name = -1; // if there's a name, the role is omitted
            break;
        case 'gpt-4-0314':
            tokens_per_message = 3;
            tokens_per_name = 1;
            break;
        default:
            throw new Error(
                `Unknown model '${model}'. See https://github.com/openai/openai-python/blob/main/chatml.md for information on how messages are converted to tokens.`
            );
    }

    return Object.entries(message).reduce((acc, [key, value]) => {
        acc += tokenizer.encode(value).length;
        if (key === 'name') {
            acc += tokens_per_name;
        }
        return acc;
    }, tokens_per_message);
}

/**
 * Get the maximum number of tokens for a model's context.
 *
 * Includes tokens in both message and completion.
*/
function get_max_token_count(model) {
    switch (model) {
        case 'gpt-3.5-turbo':
            console.warn(
                'Warning: gpt-3.5-turbo may change over time. Returning max num tokens assuming gpt-3.5-turbo-0301.'
            );
            return get_max_token_count('gpt-3.5-turbo-0301');
        case 'gpt-4':
            console.warn(
                'Warning: gpt-4 may change over time. Returning max num tokens assuming gpt-4-0314.'
            );
            return get_max_token_count('gpt-4-0314');
        case 'gpt-3.5-turbo-0301':
            return 4097;
        case 'gpt-3.5-turbo-16k':
            return 16385;
        case 'gpt-4-0314':
            return 4097;
        default:
            throw new Error(`Unknown model '${model}'`);
    }
}

module.exports = {
  tokenizer,
  get_chat_request_token_count,
  get_message_token_count,
  get_max_token_count
}