// JARVIS — SQLite orqali suhbat xotirasini boshqaruvchi modul
// Node.js ning o'rnatilgan node:sqlite moduli ishlatiladi — hech qanday
// tashqi paket yoki C++ build vositasi (Visual Studio) kerak emas.
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  logger.error(
    "node:sqlite moduli topilmadi. Node.js versiyangizni tekshiring — " +
      'kamida Node.js 22.5+ (tavsiya: eng so\'nggi LTS) kerak. ' +
      `Joriy versiya: ${process.version}`
  );
  process.exit(1);
}

// data/ papkasi mavjudligiga ishonch hosil qilamiz
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Yangi suhbat',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    provider TEXT,
    tokens INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
`);

logger.success(`Ma'lumotlar bazasi tayyor: ${config.dbPath}`);

function genId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createSession(title = 'Yangi suhbat') {
  const id = genId();
  db.prepare(
    `INSERT INTO sessions (id, title) VALUES (?, ?)`
  ).run(id, title);
  return getSession(id);
}

function getSession(id) {
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
}

function ensureSession(id) {
  let session = id ? getSession(id) : null;
  if (!session) {
    session = createSession();
  }
  return session;
}

function listSessions() {
  return db
    .prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`)
    .all();
}

function touchSession(id) {
  db.prepare(
    `UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`
  ).run(id);
}

function updateSessionTitleIfDefault(id, firstUserMessage) {
  const session = getSession(id);
  if (session && session.title === 'Yangi suhbat') {
    const shortTitle = firstUserMessage.slice(0, 40);
    db.prepare(`UPDATE sessions SET title = ? WHERE id = ?`).run(
      shortTitle,
      id
    );
  }
}

function addMessage(sessionId, role, content, provider = null, tokens = 0) {
  db.prepare(
    `INSERT INTO messages (session_id, role, content, provider, tokens)
     VALUES (?, ?, ?, ?, ?)`
  ).run(sessionId, role, content, provider, tokens);
  touchSession(sessionId);
}

function getRecentMessages(sessionId, limit = config.maxContextMessages) {
  const rows = db
    .prepare(
      `SELECT role, content FROM messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(sessionId, limit);
  return rows.reverse();
}

function getSessionMessages(sessionId) {
  return db
    .prepare(
      `SELECT id, role, content, provider, created_at
       FROM messages WHERE session_id = ? ORDER BY id ASC`
    )
    .all(sessionId);
}

function deleteSession(sessionId) {
  db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(sessionId);
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
}

function close() {
  db.close();
}

module.exports = {
  db,
  createSession,
  getSession,
  ensureSession,
  listSessions,
  touchSession,
  updateSessionTitleIfDefault,
  addMessage,
  getRecentMessages,
  getSessionMessages,
  deleteSession,
  close,
};
