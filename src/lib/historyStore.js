function getKey(userId) {
  return 'speechweb_history_' + (userId || 'anon')
}

export function getHistory(userId) {
  try {
    return JSON.parse(localStorage.getItem(getKey(userId)) || '[]')
  } catch {
    return []
  }
}

export function addHistoryItem(userId, item) {
  const key = getKey(userId)
  const history = JSON.parse(localStorage.getItem(key) || '[]')
  history.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...item
  })
  localStorage.setItem(key, JSON.stringify(history))
  return history
}

export function clearHistory(userId) {
  localStorage.removeItem(getKey(userId))
}

export function groupByDate(items) {
  const groups = {}
  for (const item of items) {
    const d = new Date(item.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const label = d.toDateString() === today.toDateString() ? 'Today'
      : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  }
  return groups
}
