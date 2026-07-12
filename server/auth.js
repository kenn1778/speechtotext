import jwt from 'jsonwebtoken'

const USER_POOL_ID = 'us-east-1_g2QvSscNA'
const REGION = 'us-east-1'
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
const ISS = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`

let jwksCache = null
let jwksCacheTime = 0
const CACHE_TTL = 3600000

async function getJwks() {
  const now = Date.now()
  if (jwksCache && now - jwksCacheTime < CACHE_TTL) return jwksCache
  const res = await fetch(JWKS_URL)
  if (!res.ok) throw new Error('Failed to fetch JWKS')
  const { keys } = await res.json()
  jwksCache = keys
  jwksCacheTime = now
  return keys
}

function getKey(keys, kid) {
  const key = keys.find(k => k.kid === kid)
  if (!key) return null
  const { kty, n, e, alg } = key
  return { key: { kty, n, e }, alg }
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded || !decoded.header || !decoded.header.kid) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const keys = await getJwks()
    const { key, alg } = getKey(keys, decoded.header.kid)
    if (!key) {
      return res.status(401).json({ error: 'Invalid token key' })
    }

    const payload = jwt.verify(token, key, {
      algorithms: [alg || 'RS256'],
      issuer: ISS,
    })

    req.auth = {
      sub: payload.sub,
      username: payload['cognito:username'] || payload.username || payload.sub,
      email: payload.email,
      tokenUse: payload.token_use,
    }

    next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireOwnUser(req, res, next) {
  const requestedId = req.params.userId
  const authedUser = req.auth.username || req.auth.sub

  if (requestedId !== authedUser) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}
