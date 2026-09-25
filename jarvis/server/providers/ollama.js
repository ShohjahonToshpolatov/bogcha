// JARVIS — Ollama provider (lokal, internetsiz ishlaydi)
const config = require('../config');
const logger = require('../logger');

function toOllamaMessages(messages, systemPrompt) {
  return [{ role: 'system', content: systemPrompt }, ...messages];
}

async function callOllama(messages, systemPrompt) {
  const url = `${config.ollama.baseUrl}/api/chat`;

  const payload = {
    model: config.ollama.model,
    messages: toOllamaMessages(messages, systemPrompt),
    stream: false,
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    const err = new Error("Ollama ishga tushmagan. `ollama serve` buyrug'ini bajaring.");
    err.retryable = false;
    err.code = 'OLLAMA_DOWN';
    throw err;
  }

  if (!response.ok) {
    const bodyText = await response.text();
    const err = new Error(`Ollama xatosi (${response.status}): ${bodyText.slice(0, 200)}`);
    err.retryable = response.status >= 500;
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json();
  const text = data.message && data.message.content ? data.message.content : '';

  if (!text) {
    const err = new Error('Ollama bo\'sh javob qaytardi.');
    err.retryable = true;
    err.code = 'EMPTY_RESPONSE';
    throw err;
  }

  return { text, model: config.ollama.model };
}

async function generate(messages, systemPrompt) {
  const { retry } = config;
  let lastErr;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    try {
      return await callOllama(messages, systemPrompt);
    } catch (err) {
      lastErr = err;
      logger.warn(`Ollama urinish ${attempt}/${retry.maxAttempts} muvaffaqiyatsiz: ${err.message}`);

      if (!err.retryable || attempt === retry.maxAttempts) {
        break;
      }
      const delay = retry.baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastErr;
}

module.exports = { generate, name: 'ollama' };
