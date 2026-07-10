/**
 * db.js — persistence adapter for diagrams.
 *
 * Currently backed by a JSON flat file. This module is the single place
 * that touches the filesystem; swap the implementation here when migrating
 * to Supabase (Phase 2) without touching route handlers.
 *
 * All public methods are synchronous for now. The interface is intentionally
 * async-compatible (methods return plain values that can be wrapped in
 * Promise.resolve() by callers) so the Supabase migration is non-breaking.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DIAGRAMS_FILE = path.join(DATA_DIR, 'diagrams.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DIAGRAMS_FILE)) fs.writeFileSync(DIAGRAMS_FILE, JSON.stringify([]));
}

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DIAGRAMS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(diagrams) {
  fs.writeFileSync(DIAGRAMS_FILE, JSON.stringify(diagrams, null, 2));
}

const db = {
  /** Returns all diagrams (full objects). */
  readDiagrams() {
    return readAll();
  },

  /** Returns metadata-only list (strips nodes/edges for list views). */
  listDiagrams() {
    return readAll().map(({ id, name, description, isTemplate, updatedAt, createdAt }) => ({
      id, name, description, isTemplate, updatedAt, createdAt,
    }));
  },

  /** Returns the full diagram object for a given id, or null. */
  getDiagram(id) {
    return readAll().find(d => d.id === id) ?? null;
  },

  /** Persists a new diagram object and returns it. */
  createDiagram(diagram) {
    const diagrams = readAll();
    diagrams.push(diagram);
    writeAll(diagrams);
    return diagram;
  },

  /**
   * Merges `updates` into the diagram with `id`.
   * Always stamps `updatedAt`. Returns the updated object, or null if not found.
   */
  updateDiagram(id, updates) {
    const diagrams = readAll();
    const idx = diagrams.findIndex(d => d.id === id);
    if (idx === -1) return null;
    diagrams[idx] = {
      ...diagrams[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    writeAll(diagrams);
    return diagrams[idx];
  },

  /**
   * Removes the diagram with `id`.
   * Returns true if found and deleted, false if not found.
   */
  deleteDiagram(id) {
    const diagrams = readAll();
    const filtered = diagrams.filter(d => d.id !== id);
    if (filtered.length === diagrams.length) return false;
    writeAll(filtered);
    return true;
  },
};

// Ensure data directory exists when this module is first loaded in production.
// Skipped in test environments to avoid filesystem side effects.
if (process.env.NODE_ENV !== 'test') {
  ensureDataDir();
}

module.exports = db;
