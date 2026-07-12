const API_BASE = import.meta.env.DEV
  ? 'http://localhost:5174/api'
  : '/api'

async function getAuthToken() {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() || null
  } catch {
    return null
  }
}

async function request(method, path, body) {
  const token = await getAuthToken()
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${API_BASE}${path}`, opts)
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Session expired. Please sign in again.')
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export function getProfile(userId) {
  return request('GET', `/user/${encodeURIComponent(userId)}/profile`)
}

export function saveProfile(userId, data) {
  return request('POST', `/user/${encodeURIComponent(userId)}/profile`, data)
}

export function getHistory(userId) {
  return request('GET', `/user/${encodeURIComponent(userId)}/history`)
}

export function addHistoryItem(userId, item) {
  return request('POST', `/user/${encodeURIComponent(userId)}/history`, item)
}

export function deleteHistoryItem(userId, itemId) {
  return request('DELETE', `/user/${encodeURIComponent(userId)}/history/${encodeURIComponent(itemId)}`)
}

export function clearHistory(userId) {
  return request('DELETE', `/user/${encodeURIComponent(userId)}/history`)
}
