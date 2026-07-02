// PHASE 2 — uncomment to use.
// const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
//   ? String(import.meta.env.VITE_API_BASE_URL)
//   : '').trim().replace(/\/+$/, '');

// PHASE 2 — uncomment to use.
// function buildApiUrl(path, query = {}) {
//   if (!API_BASE_URL) {
//     throw new Error('VITE_API_BASE_URL is not configured');
//   }

//   const url = new URL(path, `${API_BASE_URL}/`);
//   Object.entries(query).forEach(([key, value]) => {
//     if (value === undefined || value === null || value === '') return;
//     url.searchParams.set(key, String(value));
//   });
//   return url.toString();
// }

// PHASE 2 — uncomment to use.
// function createAuthHeaders(token, hasBody = false) {
//   const headers = {
//     Accept: 'application/json',
//   };

//   if (hasBody) {
//     headers['Content-Type'] = 'application/json';
//   }

//   if (token) {
//     headers.Authorization = `Bearer ${token}`;
//   }

//   return headers;
// }

// PHASE 2 — uncomment to use.
// async function requestJson(path, { method = 'GET', token, body, query } = {}) {
//   const response = await fetch(buildApiUrl(path, query), {
//     method,
//     headers: createAuthHeaders(token, body !== undefined),
//     body: body === undefined ? undefined : JSON.stringify(body),
//   });

//   const text = await response.text();
//   const data = text ? JSON.parse(text) : null;

//   if (!response.ok) {
//     const message = data?.error || data?.message || `Request failed with status ${response.status}`;
//     throw new Error(message);
//   }

//   return data;
// }

// PHASE 2 — uncomment to use.
// export async function getDevices(token) {
//   return requestJson('/api/devices', { token });
// }

// PHASE 2 — uncomment to use.
// export async function createDevice(token, data) {
//   return requestJson('/api/devices', {
//     method: 'POST',
//     token,
//     body: data,
//   });
// }

// PHASE 2 — uncomment to use.
// export async function getPolicies(token) {
//   return requestJson('/api/policies', { token });
// }

// PHASE 2 — uncomment to use.
// export async function createPolicy(token, data) {
//   return requestJson('/api/policies', {
//     method: 'POST',
//     token,
//     body: data,
//   });
// }

// PHASE 2 — uncomment to use.
// export async function assignPolicy(token, policyId, deviceId) {
//   return requestJson(`/api/policies/${policyId}/assign`, {
//     method: 'POST',
//     token,
//     body: { device_id: deviceId },
//   });
// }

// PHASE 2 — uncomment to use.
// export async function getAuditLog(token, filters = {}) {
//   return requestJson('/api/audit-log', {
//     token,
//     query: filters,
//   });
// }

// PHASE 2 — uncomment to use.
// export async function getViolations(token) {
//   return requestJson('/api/violations', { token });
// }

// PHASE 2 — uncomment to use.
// export async function login(username, password) {
//   return requestJson('/api/auth/login', {
//     method: 'POST',
//     body: { username, password },
//   });
// }

// PHASE 2 — uncomment to use.
// export async function refreshToken(refreshTokenValue) {
//   return requestJson('/api/auth/refresh', {
//     method: 'POST',
//     body: { refresh_token: refreshTokenValue },
//   });
// }

// PHASE 2 — uncomment to use.
// export async function logout(refreshTokenValue) {
//   return requestJson('/api/auth/logout', {
//     method: 'POST',
//     body: { refresh_token: refreshTokenValue },
//   });
// }