// JARVIS — tasdiq talab qiladigan amallarni tasdiqlash/rad etish endpoint'lari
const express = require('express');
const logger = require('../logger');
const pendingActions = require('../pendingActions');
const { resumeAfterDecision, executeAction, describeAction } = require('../toolLoop');
const { streamFinalAnswer } = require('../streamHelpers');

const router = express.Router();

function startSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  return (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function handleResumeResult(send, sessionId, resumeResult) {
  if (resumeResult.status === 'confirm') {
    const pendingId = pendingActions.create({
      sessionId,
      contents: resumeResult.contents,
      functionCall: resumeResult.functionCall,
      functionCallPart: resumeResult.functionCallPart,
    });
    send({
      type: 'confirm_required',
      pending_id: pendingId,
      action: resumeResult.functionCall.name,
      args: resumeResult.functionCall.args,
      description: resumeResult.description,
    });
    return;
  }

  await streamFinalAnswer(send, sessionId, resumeResult.text, 'gemini', resumeResult.model);
}

router.post('/:id/approve', async (req, res) => {
  const pending = pendingActions.get(req.params.id);
  if (!pending) {
    res.status(404).json({ error: "Amal muddati tugagan yoki topilmadi. Qaytadan so'rang." });
    return;
  }
  pendingActions.remove(req.params.id);

  const send = startSSE(res);
  send({ type: 'session', session_id: pending.sessionId });

  try {
    const actionResult = await executeAction(pending.functionCall.name, pending.functionCall.args);
    send({
      type: 'notice',
      message: actionResult.message || `Amal bajarildi: ${pending.functionCall.name}`,
    });

    const resumeResult = await resumeAfterDecision(
      pending.contents,
      pending.functionCall,
      pending.functionCallPart,
      true,
      actionResult
    );
    await handleResumeResult(send, pending.sessionId, resumeResult);
    res.end();
  } catch (err) {
    logger.error(`Amalni tasdiqlashda xato: ${err.message}`);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

router.post('/:id/reject', async (req, res) => {
  const pending = pendingActions.get(req.params.id);
  if (!pending) {
    res.status(404).json({ error: "Amal muddati tugagan yoki topilmadi. Qaytadan so'rang." });
    return;
  }
  pendingActions.remove(req.params.id);

  const send = startSSE(res);
  send({ type: 'session', session_id: pending.sessionId });

  try {
    send({ type: 'notice', message: `Bekor qilindi: ${describeAction(pending.functionCall.name, pending.functionCall.args)}` });

    const resumeResult = await resumeAfterDecision(
      pending.contents,
      pending.functionCall,
      pending.functionCallPart,
      false,
      null
    );
    await handleResumeResult(send, pending.sessionId, resumeResult);
    res.end();
  } catch (err) {
    logger.error(`Amalni bekor qilishda xato: ${err.message}`);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

module.exports = router;
