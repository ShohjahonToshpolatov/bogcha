// JARVIS — Express asosiy server
const express = require('express');
const cors = require('cors');

const config = require('./config');
const logger = require('./logger');
const db = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');
const healthRoutes = require('./routes/health');
const executeRoutes = require('./routes/execute');

const app = express();

app.use(cors());
app.use(express.json({ limit: '8mb' }));

app.use('/api/chat', chatRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/execute', executeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

function printBanner() {
  const line = '='.repeat(50);
  console.log(`\x1b[36m${line}`);
  console.log('   J A R V I S   —   shaxsiy AI yordamchi');
  console.log(line + '\x1b[0m');
  console.log(`  Port:      ${config.port}`);
  console.log(`  Provider:  ${config.provider}`);
  console.log(`  Muhit:     ${config.nodeEnv}`);
  console.log(`  Baza:      ${config.dbPath}`);
  console.log(`\x1b[36m${line}\x1b[0m`);
  console.log(`  Manzil:    http://localhost:${config.port}`);
  console.log(`  Health:    http://localhost:${config.port}/api/health`);
  console.log(`\x1b[36m${line}\x1b[0m\n`);
}

const server = app.listen(config.port, () => {
  printBanner();
  logger.success('Server muvaffaqiyatli ishga tushdi. Xo\'jayin, tayyorman.');
});

function shutdown(signal) {
  logger.warn(`${signal} qabul qilindi. Server yopilmoqda...`);
  server.close(() => {
    db.close();
    logger.info('Ma\'lumotlar bazasi yopildi. Xayr!');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Server vaqtida yopilmadi, majburan to\'xtatilmoqda.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Ushlanmagan xato (unhandledRejection): ${reason}`);
});
