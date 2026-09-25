// JARVIS — markazlashgan xato ushlagich middleware
const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.path} — ${err.message}`);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = err.userMessage || err.message || 'Kutilmagan xato yuz berdi.';

  res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Bunday manzil topilmadi.' });
}

module.exports = { errorHandler, notFoundHandler };
