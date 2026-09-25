// JARVIS — providerlarni bir xil interfeys ostida boshqaruvchi va
// asosiy provider ishlamasa avtomatik zaxiraga o'tuvchi modul
const config = require('../config');
const logger = require('../logger');

const gemini = require('./gemini');
const groq = require('./groq');
const ollama = require('./ollama');

const ALL_PROVIDERS = { gemini, groq, ollama };

// Sinab ko'rish tartibi: avval tanlangan (yoki config.PROVIDER), keyin qolganlari
function buildProviderOrder(preferred) {
  const order = [preferred || config.provider, 'gemini', 'groq', 'ollama'];
  const seen = new Set();
  const result = [];
  for (const name of order) {
    if (ALL_PROVIDERS[name] && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} systemPrompt
 * @param {string} [preferredProvider] - foydalanuvchi UI'dan tanlagan provider
 * @returns {Promise<{text: string, model: string, provider: string, usedFallback: boolean}>}
 */
async function generateWithFallback(messages, systemPrompt, preferredProvider) {
  const order = buildProviderOrder(preferredProvider);
  let lastError;

  for (let i = 0; i < order.length; i++) {
    const name = order[i];
    const provider = ALL_PROVIDERS[name];
    try {
      logger.debug(`Provider sinovdan o'tkazilmoqda: ${name}`);
      const result = await provider.generate(messages, systemPrompt);
      if (i > 0) {
        logger.warn(`Asosiy provider ishlamadi, "${name}" providerga o'tildi.`);
      }
      return { ...result, provider: name, usedFallback: i > 0 };
    } catch (err) {
      lastError = err;
      logger.error(`Provider "${name}" xato qaytardi: ${err.message}`);
    }
  }

  throw lastError || new Error("Hech qanday provider ishlamadi. .env faylni tekshiring.");
}

module.exports = { generateWithFallback, buildProviderOrder };
