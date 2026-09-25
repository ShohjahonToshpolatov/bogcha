// JARVIS — suhbat tarixini boshqarish (ro'yxat, xabarlar, o'chirish)
const express = require('express');
const db = require('../db');
const logger = require('../logger');

const router = express.Router();

// Barcha suhbatlar ro'yxati
router.get('/sessions', (req, res) => {
  const sessions = db.listSessions();
  res.json({ sessions });
});

// Yangi bo'sh suhbat yaratish
router.post('/sessions', (req, res) => {
  const session = db.createSession();
  logger.info(`Yangi suhbat yaratildi: ${session.id}`);
  res.json({ session });
});

// Bitta suhbatning barcha xabarlari
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Suhbat topilmadi.' });
  }

  const messages = db.getSessionMessages(sessionId);
  res.json({ session, messages });
});

// Suhbatni butunlay o'chirish
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = db.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Suhbat topilmadi.' });
  }

  db.deleteSession(sessionId);
  logger.info(`Suhbat o'chirildi: ${sessionId}`);
  res.json({ success: true });
});

module.exports = router;
