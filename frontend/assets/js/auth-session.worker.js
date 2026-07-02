let sessionState = null;
let refreshTokenSecret = '';
let refreshTimerId = null;
const connectedPorts = new Set();

const VALID_ROLES = new Set(['SUPER_ADMIN', 'ICT_TEACHER', 'CLASS_TEACHER']);
const REFRESH_SAFETY_WINDOW_SECONDS = 60;

function clearRefreshTimer() {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function broadcast(message) {
  connectedPorts.forEach((port) => {
    try {
      port.postMessage(message);
    } catch {
      // Ignore disconnected ports.
    }
  });
}

function padBase64Url(value) {
  const remainder = value.length % 4;
  return remainder === 0 ? value : `${value}${'='.repeat(4 - remainder)}`;
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT structure');
  }

  const normalized = padBase64Url(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(atob(normalized));
}

function isValidSessionPayload(payload) {
  return payload && payload.type === 'access' && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000) && VALID_ROLES.has(payload.role);
}

function scheduleRefresh(expiresAtUnixSeconds) {
  clearRefreshTimer();

  if (!refreshTokenSecret || !sessionState) {
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delaySeconds = Math.max(0, expiresAtUnixSeconds - nowSeconds - REFRESH_SAFETY_WINDOW_SECONDS);
  refreshTimerId = setTimeout(() => {
    performRefresh().catch(() => {
      clearSessionInternal();
      broadcast({ type: 'session-invalid' });
    });
  }, delaySeconds * 1000);
}

function clearSessionInternal() {
  clearRefreshTimer();
  sessionState = null;
  refreshTokenSecret = '';
}

async function performRefresh() {
  if (!refreshTokenSecret || !sessionState) {
    return;
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ refresh_token: refreshTokenSecret }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Refresh failed');
  }

  const accessToken = String(payload?.access_token || '');
  const decodedPayload = decodeJwtPayload(accessToken);
  if (!isValidSessionPayload(decodedPayload)) {
    throw new Error('Invalid refreshed access token');
  }

  if (payload?.refresh_token) {
    refreshTokenSecret = String(payload.refresh_token);
  }

  sessionState = {
    accessToken,
    role: decodedPayload.role,
    username: sessionState.username,
    expiresAt: decodedPayload.exp,
  };

  scheduleRefresh(decodedPayload.exp);
  broadcast({ type: 'session-updated', session: sessionState });
}

self.onconnect = (event) => {
  const port = event.ports[0];
  connectedPorts.add(port);
  port.start();

  port.onmessage = (messageEvent) => {
    const message = messageEvent.data || {};

    if (message.type === 'store-session') {
      sessionState = {
        accessToken: String(message.accessToken || ''),
        role: String(message.role || ''),
        username: String(message.username || ''),
        expiresAt: Number(message.expiresAt || 0),
      };
      refreshTokenSecret = String(message.refreshToken || '');
      scheduleRefresh(sessionState.expiresAt);
      port.postMessage({ type: 'store-session:done', session: sessionState });
      broadcast({ type: 'session-updated', session: sessionState });
      return;
    }

    if (message.type === 'get-session') {
      port.postMessage({ type: 'session-response', requestId: message.requestId, session: sessionState });
      return;
    }

    if (message.type === 'clear-session') {
      clearSessionInternal();
      port.postMessage({ type: 'clear-session:done' });
      broadcast({ type: 'session-cleared' });
      return;
    }

    if (message.type === 'refresh-now') {
      performRefresh()
        .then(() => port.postMessage({ type: 'refresh-now:done', session: sessionState }))
        .catch((error) => port.postMessage({ type: 'refresh-now:error', message: error?.message || 'Refresh failed' }));
    }
  };

  port.postMessage({ type: 'ready' });
};