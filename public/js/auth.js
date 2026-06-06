export function saveSession(token, user) {
  localStorage.setItem('snap_token', token)
  localStorage.setItem('snap_user', JSON.stringify(user))
}

export function getToken() {
  return localStorage.getItem('snap_token')
}

export function clearSession() {
  localStorage.removeItem('snap_token')
  localStorage.removeItem('snap_user')
}

export function redirectIfAuthenticated() {
  if (getToken()) window.location.href = '/dashboard.html'
}

export function requireAuth() {
  if (!getToken()) window.location.href = '/index.html'
}
