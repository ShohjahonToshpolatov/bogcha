// JARVIS — tasdiq kutayotgan (xavfli) amallarni vaqtincha xotirada saqlovchi modul
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 daqiqa ichida tasdiqlanmasa, eskiradi

const store = new Map();

function generateId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function create(data) {
  const id = generateId();
  store.set(id, { ...data, createdAt: Date.now() });
  return id;
}

function get(id) {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry;
}

function remove(id) {
  store.delete(id);
}

// Eskirgan yozuvlarni davriy tozalash
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > PENDING_TTL_MS) {
      store.delete(id);
    }
  }
}, 60 * 1000).unref();

module.exports = { create, get, remove };
