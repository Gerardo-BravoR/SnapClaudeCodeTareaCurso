import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = process.env.DB_PATH ?? join(__dirname, '..', '..', config.dbName)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS urls (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT    NOT NULL UNIQUE,
    original_url TEXT    NOT NULL,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id     INTEGER NOT NULL REFERENCES urls(id),
    clicked_at INTEGER NOT NULL DEFAULT (unixepoch()),
    referrer   TEXT,
    user_agent TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_urls_user_created  ON urls(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_clicks_url_clicked ON clicks(url_id, clicked_at)
`)

// Migration: add user_id to urls tables created before this column existed
const hasUserIdCol = (db.prepare("PRAGMA table_info(urls)").all() as { name: string }[])
  .some(col => col.name === 'user_id')
if (!hasUserIdCol) {
  db.exec('ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id)')
}

export { db }
