import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const REQUEST_TIMEOUT = 15000

async function getIdToken() {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() || null
  } catch {
    return null
  }
}

async function apiFetch(path, options = {}) {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `Request failed (${res.status})`)
    }

    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export function fetchProfile(userId) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/profile`)
}

export function saveProfile(userId, { name, email, picture }) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/profile`, {
    method: 'POST',
    body: JSON.stringify({ name, email, picture }),
  })
}

export function fetchHistory(userId) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/history`)
}

export function addHistoryItem(userId, { type, transcript, preview }) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/history`, {
    method: 'POST',
    body: JSON.stringify({ type, transcript, preview }),
  })
}

export function deleteHistoryItem(userId, itemId) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/history/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })
}

export function clearHistory(userId) {
  return apiFetch(`/api/user/${encodeURIComponent(userId)}/history`, {
    method: 'DELETE',
  })
}
