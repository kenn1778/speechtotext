import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const BACKUP_DIR = join(DATA_DIR, 'backups')
const DB_PATH = join(DATA_DIR, 'db.json')
const LOCK_PATH = join(DATA_DIR, 'db.lock')

const DEFAULT_DB = {
  users: {},
  history: {},
}

const MAX_DB_SIZE = 50 * 1024 * 1024
const MAX_BACKUPS = 10
const LOCK_RETRIES = 20
const LOCK_RETRY_DELAY = 50

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
}

function acquireLock() {
  const lockId = randomUUID()
  for (let i = 0; i < LOCK_RETRIES; i++) {
    try {
      writeFileSync(LOCK_PATH, lockId, { flag: 'wx', mode: 0o600 })
      return lockId
    } catch {
      if (i < LOCK_RETRIES - 1) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_DELAY)
      }
    }
  }
  throw new Error('Could not acquire database lock')
}

function releaseLock(lockId) {
  try {
    const current = readFileSync(LOCK_PATH, 'utf-8')
    if (current === lockId) {
      unlinkSync(LOCK_PATH)
    }
  } catch {}
}

function readRaw() {
  ensureDir(DATA_DIR)
  if (!existsSync(DB_PATH)) {
    writeRaw(JSON.parse(JSON.stringify(DEFAULT_DB)))
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
    .filter(f => f.startsWith('db-') && f.endsWith('.json'))
    .sort()
    .reverse()

  while (files.length >= MAX_BACKUPS) {
    const oldest = files.pop()
    try { unlinkSync(join(BACKUP_DIR, oldest)) } catch {}
  }
}

function writeRaw(data) {
  ensureDir(DATA_DIR)

  const json = JSON.stringify(data, null, 2)

  const backupPath = join(BACKUP_DIR, `db-${Date.now()}.json`)
  try {
    writeFileSync(backupPath, json, 'utf-8', { mode: 0o600 })
  } catch {}

  const tmpPath = DB_PATH + '.tmp'
  writeFileSync(tmpPath, json, 'utf-8', { mode: 0o600 })
  try {
    JSON.parse(readFileSync(tmpPath, 'utf-8'))
  } catch {
    throw new Error('Database write validation failed')
  }
  renameSync(tmpPath, DB_PATH)
}

function read() {
  const lockId = acquireLock()
  try {
    return readRaw()
  } finally {
    releaseLock(lockId)
  }
}

function writeLocked(data, lockId) {
  ensureDir(DATA_DIR)

  const json = JSON.stringify(data, null, 2)

  rotateBackups()
  const backupPath = join(BACKUP_DIR, `db-${Date.now()}.json`)
  try {
    writeFileSync(backupPath, json, 'utf-8', { mode: 0o600 })
  } catch {}

  const tmpPath = DB_PATH + '.tmp'
  writeFileSync(tmpPath, json, 'utf-8', { mode: 0o600 })
  try {
    JSON.parse(readFileSync(tmpPath, 'utf-8'))
  } catch {
    throw new Error('Database write validation failed')
  }
  renameSync(tmpPath, DB_PATH)
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  const sanitized = {}
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    sanitized[key] = sanitizeObject(obj[key])
  }
  return sanitized
}

export function getUserProfile(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const db = readRaw()
  return db.users[userId] || null
}

export function createOrUpdateUserProfile(userId, profile) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const lockId = acquireLock()
  try {
    let db
    try { db = readRaw() } catch { db = JSON.parse(JSON.stringify(DEFAULT_DB)) }
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
    writeLocked(db, lockId)
    return db.users[userId]
  } finally {
    releaseLock(lockId)
  }
}

export function getHistory(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return []
  const db = readRaw()
  return db.history[userId] || []
}

export function addHistoryItem(userId, item) {
  if (typeof userId !== 'string' || userId.length > 200) return null
  const lockId = acquireLock()
  try {
    let db
    try { db = readRaw() } catch { db = JSON.parse(JSON.stringify(DEFAULT_DB)) }
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
    writeLocked(db, lockId)
    return entry
  } finally {
    releaseLock(lockId)
  }
}

export function deleteHistoryItem(userId, itemId) {
  if (typeof userId !== 'string' || userId.length > 200) return false
  if (typeof itemId !== 'string' || itemId.length > 100) return false
  const lockId = acquireLock()
  try {
    let db
    try { db = readRaw() } catch { db = JSON.parse(JSON.stringify(DEFAULT_DB)) }
    if (!db.history[userId]) return false
    const index = db.history[userId].findIndex(h => h.id === itemId)
    if (index === -1) return false
    db.history[userId].splice(index, 1)
    writeLocked(db, lockId)
    return true
  } finally {
    releaseLock(lockId)
  }
}

export function clearHistory(userId) {
  if (typeof userId !== 'string' || userId.length > 200) return
  const lockId = acquireLock()
  try {
    let db
    try { db = readRaw() } catch { db = JSON.parse(JSON.stringify(DEFAULT_DB)) }
    db.history[userId] = []
    writeLocked(db, lockId)
  } finally {
    releaseLock(lockId)
  }
}

export function getAllUserIds() {
  const db = readRaw()
  return Object.keys(db.users)
}

export function restoreLatestBackup() {
  ensureDir(BACKUP_DIR)
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('db-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) return false
  const latest = files[files.length - 1]
  const lockId = acquireLock()
  try {
    const data = JSON.parse(readFileSync(join(BACKUP_DIR, latest), 'utf-8'))
    writeLocked(data, lockId)
    return true
  } catch {
    return false
  } finally {
    releaseLock(lockId)
  }
}

export function backup() {
  ensureDir(BACKUP_DIR)
  const lockId = acquireLock()
  try {
    const data = readFileSync(DB_PATH, 'utf-8')
    const backupPath = join(BACKUP_DIR, `db-manual-${Date.now()}.json`)
    writeFileSync(backupPath, data, 'utf-8', { mode: 0o600 })
    return backupPath
  } catch {
    return null
  } finally {
    releaseLock(lockId)
  }
}
