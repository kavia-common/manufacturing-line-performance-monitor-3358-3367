/**
 * DEPRECATED:
 * This module previously provided in-memory persistence.
 * The backend now uses MongoDB via Mongoose models under src/models/.
 *
 * Kept temporarily for reference; do not use for production.
 */
const { randomUUID } = require("crypto");

function nowIso() {
  return new Date().toISOString();
}

function withId(item) {
  return { id: item.id || randomUUID(), ...item };
}

const db = {
  lines: new Map(),
  shifts: new Map(),
  production: new Map(),
  downtime: new Map(),
  quality: new Map(),
  alertRules: new Map(),
  alerts: new Map(),
};

function list(map, { limit = 50, offset = 0 } = {}) {
  const items = Array.from(map.values()).sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  return items.slice(offset, offset + limit);
}

function upsert(map, item) {
  const doc = withId(item);
  map.set(doc.id, doc);
  return doc;
}

function get(map, id) {
  return map.get(id) || null;
}

function remove(map, id) {
  return map.delete(id);
}

function createEvent(map, item) {
  const doc = withId({ ts: nowIso(), ...item });
  map.set(doc.id, doc);
  return doc;
}

module.exports = { db, list, upsert, get, remove, createEvent };
