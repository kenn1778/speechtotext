import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const BACKUP_DIR = join(DATA_DIR, 'backups')
const DB_PATH = join(DATA_DIR, 'db.json')

const DEFAULT_DB = {
  users: {},
  history: {},
}

const MAX_DB_SIZE = 50 * 1024 * 1024
const MAX_BACKUPS = 10

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
}

function read() {
  ensureDir(DATA_DIR)
  if (!existsSync(DB_PATH)) {
    writeSync(JSON.parse(JSON.stringify(DEFAULT_DB)))
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
  try {
    const size = readFileSync(DB_PATH).length
    if (size > MAX_DB_SIZE) {
      throw new Error('Database file exceeds maximum size')
    }
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
}

function rotateBackups() {
  ensureDir(BACKUP_DIR)
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ name: f, path: join(BACKUP_DIR, f), time: readFileSync(join(BACKUP_DIR, f)).length }))
    .sort((a, b) => b.time - a.time)

  while (files.length >= MAX_BACKUPS) {
    const oldest = files.pop()
    try { unlinkSync(oldest.path) } catch {}
  }
}

function writeSync(data) {
  ensureDir(DATA_DIR)

  const json = JSON.stringify(data, null, 2)

  rotateBackups()
  const backupPath = join(BACKUP_DIR, `db-${Date.now()}.json`)
  try {
    writeFileSync(backupPath, json, 'utf-8', { mode: 0o600 })
  } catch {
    // backup failure is non-fatal
  }

  const tmpPath = DB_PATH + '.tmp'
  writeFileSync(tmpPath, json, 'utf-8', { mode: 0o600 })
  try {
    const existing = readFileSync(tmpPath, 'utf-8')
    JSON.parse(existing)
  } catch {
    throw new Error('Database write validation failed')
  }

  writeFileSync(DB_PATH, readFileSync(tmpPath))
  try { readFileSync(DB_PATH, 'utf-8') } catch {}

  try { unlinkSync(tmpPath) } catch {}
}

export function restoreLatestBackup() {
  ensureDir(BACKUP_DIR)
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('db-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) return false
  const latest = files[files.length - 1]
  try {
    const data = JSON.parse(readFileSync(join(BACKUP_DIR, latest), 'utf-8'))
    writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8', { mode: 0o600 })
    return true
  } catch {
    return false
  }
}

export function backup() {
  ensureDir(BACKUP_DIR)
  try {
    const data = readFileSync(DB_PATH, 'utf-8')
    const backupPath = join(BACKUP_DIR, `db-manual-${Date.now()}.json`)
    writeFileSync(backupPath, data, 'utf-8', { mode: 0o600 })
    return backupPath
  } catch {
    return null
  }
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  const sanitized = {}
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key])
    } else {
      sanitized[key] = obj[key]
    }
  }
  return sanitized
}

export function getUserProfile(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const db = read()
  return db.users[userId] || null
}

export function createOrUpdateUserProfile(userId, profile) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const db = read()
  const safeProfile = sanitizeObject(profile)
  db.users[userId] = {
    ...(db.users[userId] || {}),
    ...safeProfile,
    userId,
    updatedAt: new Date().toISOString(),
  }
  if (!db.users[userId].createdAt) {
    db.users[userId].createdAt = new Date().toISOString()
  }
  writeSync(db)
  return db.users[userId]
}

export function getHistory(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return []
  const db = read()
  return db.history[userId] || []
}

export function addHistoryItem(userId, item) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const db = read()
  if (!db.history[userId]) db.history[userId] = []
  const safeItem = sanitizeObject(item)
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...safeItem,
  }
  if (db.history[userId].length >= 500) {
    db.history[userId].pop()
  }
  db.history[userId].unshift(entry)
  writeSync(db)
  return entry
}

export function deleteHistoryItem(userId, itemId) {
  if (typeof userId !== 'string' || userId.length > 200) return false
  if (typeof itemId !== 'string' || itemId.length > 100) return false
  const db = read()
  if (!db.history[userId]) return false
  const index = db.history[userId].findIndex(h => h.id === itemId)
  if (index === -1) return false
  db.history[userId].splice(index, 1)
  writeSync(db)
  return true
}

export function clearHistory(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return
  const db = read()
  db.history[userId] = []
  writeSync(db)
}

export function getAllUserIds() {
  const db = read()
  return Object.keys(db.users)
}
