// JARVIS — SSE oqimiga matnni "harflab" chiqarish uchun umumiy yordamchi funksiyalar
const db = require('./db');
const logger = require('./logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text, size = 3) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Yakuniy javobni SSE orqali harflab chiqaradi, bazaga saqlaydi va "done" yuboradi
async function streamFinalAnswer(send, sessionId, text, provider, model) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    send({ type: 'chunk', text: chunk });
    await sleep(12);
  }

  db.addMessage(sessionId, 'assistant', text, provider);
  logger.info(`Chat OK — provider=${provider} model=${model}`);

  send({ type: 'done', provider, model, session_id: sessionId });
}

module.exports = { sleep, chunkText, streamFinalAnswer };
