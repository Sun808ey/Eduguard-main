const DEFAULT_API_BASE_URLS = ['http://127.0.0.1:5000', 'http://127.0.0.1:3000'];

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
}

function getAuthBaseUrls() {
  const configuredBaseUrl = normalizeBaseUrl(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : '');
  return [configuredBaseUrl, ...DEFAULT_API_BASE_URLS].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function buildHeaders(hasBody = false) {
  const headers = {
    Accept: 'application/json',
  };

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

class AuthRequestError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

async function requestJson(path, { method = 'GET', body } = {}) {
  for (const baseUrl of getAuthBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: buildHeaders(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
      });

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        const message = data?.error || data?.message || `Request failed with status ${response.status}`;
        throw new AuthRequestError(message, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof AuthRequestError) {
        throw error;
      }

      console.warn(`Auth request failed for ${baseUrl}${path}.`, error);
    }
  }

  throw new AuthRequestError('Unable to reach the authentication service.');
}

export async function loginAdmin(username, password) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export { AuthRequestError };
