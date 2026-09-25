// JARVIS — konsolga rangli va vaqt belgili loglar chiqaruvchi modul
const config = require('./config');

const COLORS = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
};

const LEVELS = { debug: 0, info: 1, warn: 1, error: 2 };

function currentLevelRank() {
  return LEVELS[config.logLevel] !== undefined ? LEVELS[config.logLevel] : 1;
}

function timestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').replace('Z', '');
}

function format(color, tag, args) {
  const time = `${COLORS.gray}[${timestamp()}]${COLORS.reset}`;
  const label = `${color}[${tag}]${COLORS.reset}`;
  return [`${time} ${label}`, ...args];
}

const logger = {
  debug(...args) {
    if (currentLevelRank() > LEVELS.debug) return;
    console.log(...format(COLORS.cyan, 'DEBUG', args));
  },
  info(...args) {
    if (currentLevelRank() > LEVELS.info) return;
    console.log(...format(COLORS.blue, 'INFO', args));
  },
  warn(...args) {
    if (currentLevelRank() > LEVELS.info) return;
    console.warn(...format(COLORS.yellow, 'WARN', args));
  },
  error(...args) {
    console.error(...format(COLORS.red, 'ERROR', args));
  },
  success(...args) {
    console.log(...format(COLORS.green, 'OK', args));
  },
};

module.exports = logger;
