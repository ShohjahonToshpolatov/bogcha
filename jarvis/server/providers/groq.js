// JARVIS — Groq provider (zaxira, bepul, juda tez)
const config = require('../config');
const logger = require('../logger');

const URL = 'https://api.groq.com/openai/v1/chat/completions';

function classifyError(status, bodyText) {
  if (status === 401) {
    return { message: "API kalit noto'g'ri. .env faylni tekshiring.", retryable: false };
  }
  if (status === 429) {
    return { message: 'Kunlik limit tugadi. Zaxira providerga o\'tilmoqda.', retryable: true };
  }
  if (status >= 500) {
    return { message: 'Groq serverida vaqtinchalik muammo bor.', retryable: true };
  }
  return { message: `Groq xatosi (${status}): ${bodyText.slice(0, 200)}`, retryable: false };
}

function toOpenAiMessages(messages, systemPrompt) {
  return [{ role: 'system', content: systemPrompt }, ...messages];
}

async function callGroq(messages, systemPrompt) {
  if (!config.groq.apiKey) {
    const err = new Error("API kalit noto'g'ri. .env faylni tekshiring.");
    err.retryable = false;
    err.code = 'NO_API_KEY';
    throw err;
  }

  const payload = {
    model: config.groq.model,
    messages: toOpenAiMessages(messages, systemPrompt),
    temperature: 0.7,
    max_tokens: 2048,
  };

  let response;
  try {
    response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    const err = new Error('Internetga ulanib bo\'lmadi.');
    err.retryable = true;
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!response.ok) {
    const bodyText = await response.text();
    const { message, retryable } = classifyError(response.status, bodyText);
    const err = new Error(message);
    err.retryable = retryable;
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json();
  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  if (!text) {
    const err = new Error('Groq bo\'sh javob qaytardi.');
    err.retryable = true;
    err.code = 'EMPTY_RESPONSE';
    throw err;
  }

  return { text, model: config.groq.model };
}

async function generate(messages, systemPrompt) {
  const { retry } = config;
  let lastErr;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    try {
      return await callGroq(messages, systemPrompt);
    } catch (err) {
      lastErr = err;
      logger.warn(`Groq urinish ${attempt}/${retry.maxAttempts} muvaffaqiyatsiz: ${err.message}`);

      if (!err.retryable || attempt === retry.maxAttempts) {
        break;
      }
      const delay = retry.baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastErr;
}

module.exports = { generate, name: 'groq' };
