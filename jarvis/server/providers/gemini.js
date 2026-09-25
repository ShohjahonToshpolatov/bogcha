// JARVIS — Google Gemini provider (asosiy, bepul) + function-calling (vazifa bajarish)
const config = require('../config');
const logger = require('../logger');

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Xato turini aniqlab, o'zbekcha xabar va "qayta urinish kerakmi" belgisini qaytaradi
function classifyError(status, bodyText) {
  if (status === 400 && /API key not valid/i.test(bodyText)) {
    return { message: "API kalit noto'g'ri. .env faylni tekshiring.", retryable: false };
  }
  if (status === 403) {
    return { message: "API kalit noto'g'ri. .env faylni tekshiring.", retryable: false };
  }
  if (status === 429) {
    return { message: 'Kunlik limit tugadi. Zaxira providerga o\'tilmoqda.', retryable: true };
  }
  if (status >= 500) {
    return { message: 'Gemini serverida vaqtinchalik muammo bor.', retryable: true };
  }
  return { message: `Gemini xatosi (${status}): ${bodyText.slice(0, 200)}`, retryable: false };
}

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function extractFromCandidate(candidate) {
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const text = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  const functionCallPart = parts.find((p) => p.functionCall);
  return {
    text,
    functionCall: functionCallPart ? functionCallPart.functionCall : null,
    // Gemini'ning "thinking" modellari uchun thoughtSignature'ni ham saqlab,
    // keyingi so'rovda ayni shu part'ni qaytarib yuborish kerak bo'ladi
    functionCallPart: functionCallPart || null,
  };
}

// contents — Gemini formatidagi to'liq xabarlar ro'yxati (functionCall/functionResponse'larni ham o'z ichiga olishi mumkin)
async function callGeminiRaw(contents, systemPrompt, { useTools = true } = {}) {
  if (!config.gemini.apiKey) {
    const err = new Error("API kalit noto'g'ri. .env faylni tekshiring.");
    err.retryable = false;
    err.code = 'NO_API_KEY';
    throw err;
  }

  const url = `${BASE_URL}/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (useTools && config.tools) {
    payload.tools = config.tools;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const candidate = data.candidates && data.candidates[0];
  const { text, functionCall, functionCallPart } = extractFromCandidate(candidate);

  if (!text && !functionCall) {
    const err = new Error('Gemini bo\'sh javob qaytardi.');
    err.retryable = true;
    err.code = 'EMPTY_RESPONSE';
    throw err;
  }

  return { text, functionCall, functionCallPart, model: config.gemini.model };
}

async function withRetry(fn) {
  const { retry } = config;
  let lastErr;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn(`Gemini urinish ${attempt}/${retry.maxAttempts} muvaffaqiyatsiz: ${err.message}`);

      if (!err.retryable || attempt === retry.maxAttempts) {
        break;
      }
      const delay = retry.baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastErr;
}

// Oddiy matnli chat (fallback zanjiri uchun) — tool-lardan foydalanmaydi
async function generate(messages, systemPrompt) {
  const contents = toGeminiContents(messages);
  const result = await withRetry(() => callGeminiRaw(contents, systemPrompt, { useTools: false }));
  return { text: result.text, model: result.model };
}

// Tool-calling (vazifa bajarish) uchun — xom "contents" massivi bilan ishlaydi
async function generateRaw(contents, systemPrompt) {
  return withRetry(() => callGeminiRaw(contents, systemPrompt, { useTools: true }));
}

module.exports = { generate, generateRaw, toGeminiContents, name: 'gemini' };
