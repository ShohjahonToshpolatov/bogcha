// JARVIS — server holatini tekshirish uchun endpoint
const express = require('express');
const config = require('../config');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  let dbStatus = 'ulangan';
  try {
    db.db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = "uzilgan";
  }

  res.json({
    status: 'ishlayapti',
    provider: config.provider,
    db: dbStatus,
    uptime_soniya: Math.floor(process.uptime()),
    vaqt: new Date().toISOString(),
  });
});

module.exports = router;
