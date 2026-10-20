const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000')
  .replace(/\/+$/, '')

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new Error('Unable to reach the RidePass service. Check the backend and try again.')
  }

  const result = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const validationMessage = result?.errors?.map((error) => error.msg).filter(Boolean).join('. ')
    const error = new Error(validationMessage || result?.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return result
}

export const api = {
  register: (role, body) => request(`/${role}s/register`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  login: (role, body) => request(`/${role}s/login`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  profile: (role, token) => request(`/${role}s/profile`, { token }),
  logout: (role, token) => request(`/${role}s/logout`, {
    method: 'POST',
    token,
  }),
  createRide: (token, body) => request('/rides', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  }),
  getRides: (token) => request('/rides', { token }),
  cancelRide: (token, rideId) => request(`/rides/${encodeURIComponent(rideId)}/cancel`, {
    method: 'POST',
    token,
  }),
  getNearbyVehicles: (token, location, vehicleType) => {
    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      vehicleType,
      radius: '5000',
    })
    return request(`/rides/nearby?${params}`, { token })
  },
  updateCaptainLocation: (token, location) => request('/captains/location', {
    method: 'POST',
    token,
    body: JSON.stringify(location),
  }),
  stopCaptainLocation: (token) => request('/captains/location/stop', {
    method: 'POST',
    token,
  }),
}
