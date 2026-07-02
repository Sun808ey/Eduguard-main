const STORAGE_KEYS = {
  accessToken: 'eg_access_token',
  refreshToken: 'eg_refresh_token',
  role: 'eg_role',
  username: 'eg_username',
  expiresAt: 'eg_expires_at',
};

function setItem(key, value) {
  if (typeof value === 'undefined' || value === null) return;
  sessionStorage.setItem(key, String(value));
}

export function storeAuthSession({ accessToken, refreshToken, role, username, expiresInSeconds }) {
  clearAuthSession();

  setItem(STORAGE_KEYS.accessToken, accessToken);
  setItem(STORAGE_KEYS.refreshToken, refreshToken);
  setItem(STORAGE_KEYS.role, role);
  setItem(STORAGE_KEYS.username, username);

  const expiresIn = Number(expiresInSeconds);
  if (Number.isFinite(expiresIn) && expiresIn > 0) {
    setItem(STORAGE_KEYS.expiresAt, Date.now() + expiresIn * 1000);
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(STORAGE_KEYS.accessToken);
  sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
  sessionStorage.removeItem(STORAGE_KEYS.role);
  sessionStorage.removeItem(STORAGE_KEYS.username);
  sessionStorage.removeItem(STORAGE_KEYS.expiresAt);
}

export function getAuthSession() {
  const accessToken = sessionStorage.getItem(STORAGE_KEYS.accessToken) || '';
  const refreshToken = sessionStorage.getItem(STORAGE_KEYS.refreshToken) || '';
  const role = sessionStorage.getItem(STORAGE_KEYS.role) || '';
  const username = sessionStorage.getItem(STORAGE_KEYS.username) || '';
  const expiresAt = Number(sessionStorage.getItem(STORAGE_KEYS.expiresAt) || 0);

  return {
    accessToken,
    refreshToken,
    role,
    username,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
  };
}
