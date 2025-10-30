const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data })
  return data
}

export const AuthApi = {
  async signup({ name, email, password }) {
    return apiFetch('/api/auth/signup', { method: 'POST', body: { name, email, password } })
  },
  async login({ email, password }) {
    return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
  },
  async me(token) {
    return apiFetch('/api/auth/me', { token })
  },
}

export const DataApi = {
  stats() {
    return apiFetch('/api/stats')
  },
  records({ limit = 20 } = {}) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    return apiFetch(`/api/records?${p}`)
  },
  record(id) {
    return apiFetch(`/api/records/${id}`)
  },
  verify({ invoiceFile, poFile }) {
    const fd = new FormData()
    fd.append('invoice', invoiceFile)
    fd.append('po', poFile)
    return apiFetch('/api/verify', { method: 'POST', body: fd })
  },
  exportCsv({ recordIds, dateFrom, dateTo, status }) {
    return apiFetch('/api/export/csv', { method: 'POST', body: { recordIds, dateFrom, dateTo, status } })
  },
  exportReport({ recordIds, dateFrom, dateTo }) {
    return apiFetch('/api/export/report', { method: 'POST', body: { recordIds, dateFrom, dateTo } })
  },
  exportHistory({ limit = 20 } = {}) {
    const p = new URLSearchParams({ limit: String(limit) }).toString()
    return apiFetch(`/api/export/history?${p}`)
  }
}
