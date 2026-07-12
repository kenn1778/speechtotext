import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'db.json')

const DEFAULT_DB = {
  users: {},
  history: {},
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function read() {
  ensureDir()
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8')
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
}

function write(data) {
  ensureDir()
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export function getUserProfile(userId) {
  const db = read()
  return db.users[userId] || null
}

export function createOrUpdateUserProfile(userId, profile) {
  const db = read()
  db.users[userId] = {
    ...(db.users[userId] || {}),
    ...profile,
    userId,
    updatedAt: new Date().toISOString(),
  }
  if (!db.users[userId].createdAt) {
    db.users[userId].createdAt = new Date().toISOString()
  }
  write(db)
  return db.users[userId]
}

export function getHistory(userId) {
  const db = read()
  return db.history[userId] || []
}

export function addHistoryItem(userId, item) {
  const db = read()
  if (!db.history[userId]) db.history[userId] = []
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...item,
  }
  db.history[userId].unshift(entry)
  write(db)
  return entry
}

export function deleteHistoryItem(userId, itemId) {
  const db = read()
  if (!db.history[userId]) return false
  const index = db.history[userId].findIndex(h => h.id === itemId)
  if (index === -1) return false
  db.history[userId].splice(index, 1)
  write(db)
  return true
}

export function clearHistory(userId) {
  const db = read()
  db.history[userId] = []
  write(db)
}

export function getAllUserIds() {
  const db = read()
  return Object.keys(db.users)
}
