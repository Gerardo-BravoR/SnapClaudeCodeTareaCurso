function getToken() {
  return localStorage.getItem('snap_token')
}

async function apiFetch(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...rest,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Error desconocido')
    err.status = res.status
    throw err
  }
  return data
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

export async function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(name, email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function getDashboard() {
  return apiFetch('/dashboard', { headers: authHeaders() })
}

export async function getMyUrls() {
  return apiFetch('/urls/mine', { headers: authHeaders() })
}

export async function createUrl(url, alias) {
  return apiFetch('/urls', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(alias ? { url, alias } : { url }),
  })
}

export async function deleteUrl(code) {
  return apiFetch(`/urls/${code}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}
