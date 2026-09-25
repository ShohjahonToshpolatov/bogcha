// JARVIS — kiruvchi so'rovlarni tekshiruvchi middleware
const config = require('../config');

function validateChatBody(req, res, next) {
  const { message, session_id, image } = req.body || {};
  const hasImage = image && typeof image === 'object';

  if (typeof message !== 'string' || (message.trim().length === 0 && !hasImage)) {
    return res.status(400).json({
      error: "Xabar bo'sh bo'lishi mumkin emas.",
    });
  }

  if (message.length > config.maxMessageLength) {
    return res.status(400).json({
      error: 'Xabar juda uzun.',
    });
  }

  if (session_id !== undefined && session_id !== null) {
    if (typeof session_id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(session_id)) {
      return res.status(400).json({
        error: "session_id formati noto'g'ri.",
      });
    }
  }

  if (hasImage) {
    if (
      typeof image.mimeType !== 'string' ||
      !config.allowedImageMimeTypes.includes(image.mimeType)
    ) {
      return res.status(400).json({
        error: "Rasm formati qo'llab-quvvatlanmaydi (faqat PNG, JPEG, WEBP, GIF).",
      });
    }
    if (typeof image.data !== 'string' || image.data.length === 0) {
      return res.status(400).json({ error: "Rasm ma'lumoti noto'g'ri." });
    }
    if (image.data.length > config.maxImageBase64Chars) {
      return res.status(400).json({ error: 'Rasm hajmi juda katta (5MB dan kichik bo\'lsin).' });
    }
  }

  next();
}

// Bir IP dan daqiqasiga cheklangan sondan ortiq so'rov kelishining oldini oladi
const requestLog = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const { windowMs, maxRequests } = config.rateLimit;

  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < windowMs
  );

  if (timestamps.length >= maxRequests) {
    return res.status(429).json({
      error: "Juda ko'p so'rov yubordingiz. Bir oz kuting va qayta urinib ko'ring.",
    });
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  next();
}

module.exports = { validateChatBody, rateLimit };
