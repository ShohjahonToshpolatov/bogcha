// JARVIS — asosiy suhbat endpoint'i (SSE streaming, vazifa bajarish va oddiy rejim)
const express = require('express');
const config = require('../config');
const logger = require('../logger');
const db = require('../db');
const { validateChatBody, rateLimit } = require('../middleware/validate');
const { generateWithFallback } = require('../providers');
const gemini = require('../providers/gemini');
const groq = require('../providers/groq');
const ollama = require('../providers/ollama');
const { runToolLoop } = require('../toolLoop');
const pendingActions = require('../pendingActions');
const { streamFinalAnswer } = require('../streamHelpers');

const router = express.Router();

const VALID_PROVIDERS = new Set(['gemini', 'groq', 'ollama']);

// Gemini (tool-calling) butunlay ishlamasa, oddiy matnli zaxiraga o'tadi (gemini'ni qayta sinamasdan)
async function fallbackWithoutGemini(contextMessages) {
  try {
    const r = await groq.generate(contextMessages, config.systemPrompt);
    return { ...r, provider: 'groq' };
  } catch (groqErr) {
    logger.error(`Provider "groq" xato qaytardi: ${groqErr.message}`);
    const r = await ollama.generate(contextMessages, config.systemPrompt);
    return { ...r, provider: 'ollama' };
  }
}

router.post('/', rateLimit, validateChatBody, async (req, res) => {
  const startedAt = Date.now();
  const streamMode = req.query.stream !== 'false';
  const preferredProvider = VALID_PROVIDERS.has(req.body.provider)
    ? req.body.provider
    : undefined;
  const image = req.body.image && typeof req.body.image === 'object' ? req.body.image : null;
  const message =
    typeof req.body.message === 'string' && req.body.message.trim().length > 0
      ? req.body.message
      : "Ushbu rasmda nima ko'rsatilganini tushuntirib bering.";

  const session = db.ensureSession(req.body.session_id);
  db.addMessage(session.id, 'user', image ? `[Rasm] ${message}` : message);
  db.updateSessionTitleIfDefault(session.id, message);

  const contextMessages = db.getRecentMessages(session.id);

  if (!streamMode) {
    // Oddiy (non-stream) rejim — vazifa bajarish (tool-calling) qo'llab-quvvatlanmaydi
    try {
      const result = await generateWithFallback(contextMessages, config.systemPrompt, preferredProvider);
      db.addMessage(session.id, 'assistant', result.text, result.provider);
      logger.info(`Chat OK — provider=${result.provider} model=${result.model}`);
      res.json({
        reply: result.text,
        provider: result.provider,
        model: result.model,
        used_fallback: result.usedFallback,
        session_id: session.id,
      });
    } catch (err) {
      logger.error(`Chat xatosi: ${err.message}`);
      res.status(502).json({ error: err.message, session_id: session.id });
    }
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  send({ type: 'session', session_id: session.id });

  const useGeminiTools = !preferredProvider || preferredProvider === 'gemini';

  try {
    if (useGeminiTools) {
      try {
        const contents = gemini.toGeminiContents(contextMessages);
        if (image) {
          const lastContent = contents[contents.length - 1];
          if (lastContent && lastContent.role === 'user') {
            lastContent.parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
          }
        }
        const loopResult = await runToolLoop(contents, (notice) => {
          send({
            type: 'notice',
            message: notice.result && notice.result.message
              ? notice.result.message
              : `Amal bajarildi: ${notice.name}`,
          });
        });

        if (loopResult.status === 'confirm') {
          const pendingId = pendingActions.create({
            sessionId: session.id,
            contents: loopResult.contents,
            functionCall: loopResult.functionCall,
            functionCallPart: loopResult.functionCallPart,
          });
          send({
            type: 'confirm_required',
            pending_id: pendingId,
            action: loopResult.functionCall.name,
            args: loopResult.functionCall.args,
            description: loopResult.description,
          });
          res.end();
          return;
        }

        await streamFinalAnswer(send, session.id, loopResult.text, 'gemini', loopResult.model);
        logger.info(`Chat vaqt: ${Date.now() - startedAt}ms`);
        res.end();
        return;
      } catch (geminiErr) {
        logger.error(`Gemini (tool) xatosi: ${geminiErr.message}`);
        send({
          type: 'notice',
          message: `Asosiy provider ishlamadi (${geminiErr.message}). Zaxiraga o'tilmoqda.`,
        });
      }
    }

    // Foydalanuvchi boshqa provider tanlagan yoki Gemini ishlamagan holat
    const result = preferredProvider && preferredProvider !== 'gemini'
      ? await generateWithFallback(contextMessages, config.systemPrompt, preferredProvider)
      : await fallbackWithoutGemini(contextMessages);

    await streamFinalAnswer(send, session.id, result.text, result.provider, result.model);
    logger.info(`Chat vaqt: ${Date.now() - startedAt}ms`);
    res.end();
  } catch (err) {
    logger.error(`Chat xatosi: ${err.message}`);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

module.exports = router;
