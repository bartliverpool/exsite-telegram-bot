const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'seen_posts.json');
const MAX_STORED_IDS = 1000;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSeenIds() {
  ensureDataDir();
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      if (Array.isArray(data)) {
        return new Set(data);
      }
    } catch (err) {
      console.warn('⚠️ Błąd odczytu seen_posts.json, inicjalizacja pustego zbioru:', err.message);
    }
  }
  return new Set();
}

function saveSeenIds(idSet) {
  ensureDataDir();
  try {
    let ids = Array.from(idSet);
    // Zachowaj tylko najnowsze MAX_STORED_IDS wpisów
    if (ids.length > MAX_STORED_IDS) {
      ids = ids.slice(ids.length - MAX_STORED_IDS);
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(ids, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Błąd zapisu seen_posts.json:', err.message);
  }
}

class PostTracker {
  constructor() {
    this.seenSet = loadSeenIds();
  }

  isSeen(id) {
    return this.seenSet.has(id);
  }

  markSeen(id) {
    if (!id) return;
    this.seenSet.add(id);
    saveSeenIds(this.seenSet);
  }

  markManySeen(ids) {
    if (!ids || ids.length === 0) return;
    for (const id of ids) {
      this.seenSet.add(id);
    }
    saveSeenIds(this.seenSet);
  }

  count() {
    return this.seenSet.size;
  }
}

module.exports = {
  PostTracker
};
