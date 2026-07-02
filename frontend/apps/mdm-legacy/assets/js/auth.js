import { clearAuthSession, storeAuthSession } from './auth-session.js';

const STORAGE_KEYS = {
  accessToken: 'eg_access_token',
  role: 'eg_role',
  username: 'eg_username',
  expiresAt: 'eg_expires_at',
};

const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
};

const VALID_ROLES = new Set(['SUPER_ADMIN', 'ICT_TEACHER', 'CLASS_TEACHER']);
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_SECONDS = 30;
const REFRESH_SAFETY_WINDOW_SECONDS = 60;
const NETWORK_RETRY_DELAYS = [0, 2000, 4000];

let refreshTokenSecret = '';
let refreshTimerId = null;
let lockoutTimerId = null;
let consecutiveFailures = 0;
let lockoutUntilMs = 0;

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function byId(id) {
  return document.getElementById(id);
}

function clearScheduledRefresh() {
  if (refreshTimerId !== null) {
    window.clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function clearLockoutTimer() {
  if (lockoutTimerId !== null) {
    window.clearInterval(lockoutTimerId);
    lockoutTimerId = null;
  }
}

function clearStoredSession() {
  sessionStorage.removeItem(STORAGE_KEYS.accessToken);
  sessionStorage.removeItem(STORAGE_KEYS.role);
  sessionStorage.removeItem(STORAGE_KEYS.username);
  sessionStorage.removeItem(STORAGE_KEYS.expiresAt);
}

function resetAllState() {
  clearScheduledRefresh();
  clearLockoutTimer();
  refreshTokenSecret = '';
  consecutiveFailures = 0;
  lockoutUntilMs = 0;
}

function setStatus(message, tone = 'default') {
  const statusNode = byId('login-status');
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function clearStatus() {
  setStatus('', 'default');
}

function setFieldError(input, errorNode, message) {
  if (input) {
    input.setAttribute('aria-invalid', 'true');
  }
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function clearFieldError(input, errorNode) {
  if (input) {
    input.removeAttribute('aria-invalid');
  }
  if (errorNode) {
    errorNode.textContent = '';
  }
}

function clearFormFields(form) {
  const usernameInput = byId('username');
  const passwordInput = byId('password');
  if (form) {
    form.reset();
  }
  if (usernameInput) {
    usernameInput.value = '';
  }
  if (passwordInput) {
    passwordInput.value = '';
  }
}

function padBase64Url(value) {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  return value + '='.repeat(4 - remainder);
}

function base64UrlDecode(value) {
  const normalized = padBase64Url(String(value).replace(/-/g, '+').replace(/_/g, '/'));
  return window.atob(normalized);
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT structure');
  }
  const payloadJson = base64UrlDecode(parts[1]);
  return JSON.parse(payloadJson);
}

function isValidRole(role) {
  return VALID_ROLES.has(role);
}

function isAuthTokenStillValid(token) {
  try {
    const payload = decodeJwtPayload(token);
    return payload.type === 'access' && payload.exp > Math.floor(Date.now() / 1000) && isValidRole(payload.role);
  } catch {
    return false;
  }
}

function getStoredAccessToken() {
  return sessionStorage.getItem(STORAGE_KEYS.accessToken) || '';
}

function getStoredExpiresAt() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.expiresAt);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updateIcon(iconName) {
  const iconHost = qs('[data-lucide]');
  if (!iconHost) return;

  const iconMap = {
    eye: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2.1 12s3.5-7 9.9-7 9.9 7 9.9 7-3.5 7-9.9 7-9.9-7-9.9-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `,
    'eye-off': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24"></path>
        <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6.4 0 9.9 7 9.9 7a18.4 18.4 0 0 1-3.4 4.4"></path>
        <path d="M6.6 6.6C3.8 8.7 2.1 12 2.1 12s3.5 7 9.9 7c1 0 2-.1 2.9-.4"></path>
        <path d="M3 3l18 18"></path>
      </svg>
    `,
  };

  iconHost.innerHTML = iconMap[iconName] || iconMap.eye;
  iconHost.dataset.lucide = iconName;
}

function setPasswordVisibility(visible) {
  const passwordInput = byId('password');
  const toggleButton = qs('[data-password-toggle]');
  const toggleText = qs('.password-toggle__text');

  if (!passwordInput || !toggleButton) return;

  const selectionStart = passwordInput.selectionStart;
  const selectionEnd = passwordInput.selectionEnd;
  const shouldShow = Boolean(visible);

  passwordInput.type = shouldShow ? 'text' : 'password';
  toggleButton.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
  toggleButton.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
  if (toggleText) {
    toggleText.textContent = shouldShow ? 'Hide' : 'Show';
  }
  updateIcon(shouldShow ? 'eye-off' : 'eye');

  passwordInput.focus({ preventScroll: true });
  try {
    passwordInput.setSelectionRange(selectionStart, selectionEnd);
  } catch {
    // Not all browsers allow selection restoration after type changes.
  }
}

function bindPasswordToggle() {
  const toggleButton = qs('[data-password-toggle]');
  if (!toggleButton) return;

  toggleButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
  });

  toggleButton.addEventListener('click', () => {
    const passwordInput = byId('password');
    if (!passwordInput) return;
    setPasswordVisibility(passwordInput.type === 'password');
  });

  updateIcon('eye');
}

function validateCredentials(username, password, formRefs) {
  const { usernameInput, passwordInput, usernameError, passwordError } = formRefs;
  let isValid = true;

  clearFieldError(usernameInput, usernameError);
  clearFieldError(passwordInput, passwordError);

  if (!USERNAME_PATTERN.test(username)) {
    setFieldError(usernameInput, usernameError, 'Enter a valid username using 3-64 letters, numbers, dots, hyphens, or underscores.');
    isValid = false;
  }

  if (password.length < 8 || password.length > 128) {
    setFieldError(passwordInput, passwordError, 'Password must be between 8 and 128 characters.');
    isValid = false;
  }

  return isValid;
}

function clearAuthErrorState(formRefs) {
  clearFieldError(formRefs.usernameInput, formRefs.usernameError);
  clearFieldError(formRefs.passwordInput, formRefs.passwordError);
}

function renderLockoutMessage() {
  const remainingMs = Math.max(0, lockoutUntilMs - Date.now());
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  if (remainingSeconds <= 0) {
    clearLockoutTimer();
    lockoutUntilMs = 0;
    const submitButton = qs('[data-submit-button]');
    if (submitButton) {
      submitButton.disabled = false;
    }
    setStatus('', 'default');
    return;
  }

  setStatus(`Too many failed attempts. Try again in ${remainingSeconds}s.`, 'warning');
}

function startLockout() {
  lockoutUntilMs = Date.now() + LOCKOUT_SECONDS * 1000;
  clearLockoutTimer();
  const submitButton = qs('[data-submit-button]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  renderLockoutMessage();
  lockoutTimerId = window.setInterval(renderLockoutMessage, 1000);
}

function isLockedOut() {
  return lockoutUntilMs > Date.now();
}

function authHeaders(hasBody = true) {
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      ...authHeaders(options.body !== undefined),
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || 'Request failed');
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function isNetworkError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.name === 'TypeError' || message.includes('failed to fetch') || message.includes('networkerror');
}

async function fetchJsonWithBackoff(path, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < NETWORK_RETRY_DELAYS.length; attempt += 1) {
    const delayMs = NETWORK_RETRY_DELAYS[attempt];
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      return await fetchJson(path, options);
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  const networkError = new Error('Server unreachable. Check that the EduGuard server is running on your local network.');
  networkError.cause = lastError;
  throw networkError;
}

function storeSessionState({ accessToken, role, username, expiresAt }) {
  sessionStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  sessionStorage.setItem(STORAGE_KEYS.role, role);
  sessionStorage.setItem(STORAGE_KEYS.username, username);
  sessionStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
}

function scheduleTokenRefresh(expiresAtUnixSeconds) {
  clearScheduledRefresh();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delaySeconds = Math.max(0, expiresAtUnixSeconds - nowSeconds - REFRESH_SAFETY_WINDOW_SECONDS);
  refreshTimerId = window.setTimeout(() => {
    refreshSession().catch((error) => {
      console.error(error);
    });
  }, delaySeconds * 1000);
}

function ensureLoginRedirect() {
  const storedToken = getStoredAccessToken();
  if (storedToken && isAuthTokenStillValid(storedToken)) {
    window.location.href = 'dashboard.html';
    return true;
  }

  if (storedToken) {
    clearStoredSession();
  }

  return false;
}

async function login(username, password) {
  return fetchJsonWithBackoff(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body: { username, password },
  });
}

async function refreshToken(refreshTokenValue) {
  return fetchJson(AUTH_ENDPOINTS.refresh, {
    method: 'POST',
    body: { refresh_token: refreshTokenValue },
  });
}

async function logout(refreshTokenValue) {
  try {
    if (refreshTokenValue) {
      await fetchJson(AUTH_ENDPOINTS.logout, {
        method: 'POST',
        body: { refresh_token: refreshTokenValue },
      });
    }
  } catch (error) {
    console.error(error);
  } finally {
    resetAllState();
    clearStoredSession();
    clearAuthSession();
  }
}

function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function handleAuthFailure(formRefs, message) {
  clearStoredSession();
  clearAuthSession();
  refreshTokenSecret = '';
  clearScheduledRefresh();
  clearAuthErrorState(formRefs);
  clearFormFields(formRefs.form);
  setStatus(message, 'error');
}

function handleLockoutIfNeeded() {
  if (consecutiveFailures >= FAILED_ATTEMPTS_LIMIT) {
    startLockout();
    return true;
  }

  return false;
}

async function handleSuccessfulLogin(response, username) {
  const accessToken = String(response.access_token || '');
  const refreshTokenValue = String(response.refresh_token || '');
  const decodedPayload = decodeJwtPayload(accessToken);
  const role = String(decodedPayload.role || '');
  const expiresAt = Number(decodedPayload.exp || 0);

  if (decodedPayload.type !== 'access' || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !isValidRole(role)) {
    await logout(refreshTokenValue);
    setStatus('Authentication error. Please try again.', 'error');
    return;
  }

  refreshTokenSecret = refreshTokenValue;
  storeSessionState({
    accessToken,
    role,
    username: String(response.username || username),
    expiresAt,
  });
  storeAuthSession({
    accessToken,
    refreshToken: refreshTokenValue,
    role,
    username: String(response.username || username),
    expiresAt,
  });

  consecutiveFailures = 0;
  clearLockoutTimer();
  lockoutUntilMs = 0;
  clearStatus();
  scheduleTokenRefresh(expiresAt);
  redirectToDashboard();
}

async function refreshSession() {
  if (!refreshTokenSecret) {
    return;
  }

  try {
    const response = await refreshToken(refreshTokenSecret);
    const accessToken = String(response.access_token || '');
    const decodedPayload = decodeJwtPayload(accessToken);
    const role = String(decodedPayload.role || '');
    const expiresAt = Number(decodedPayload.exp || 0);

    if (decodedPayload.type !== 'access' || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !isValidRole(role)) {
      throw new Error('Authentication error. Please try again.');
    }

    storeSessionState({
      accessToken,
      role,
      username: sessionStorage.getItem(STORAGE_KEYS.username) || '',
      expiresAt,
    });
    storeAuthSession({
      accessToken,
      refreshToken: String(response.refresh_token || refreshTokenSecret),
      role,
      username: sessionStorage.getItem(STORAGE_KEYS.username) || '',
      expiresAt,
    });

    if (response.refresh_token) {
      refreshTokenSecret = String(response.refresh_token);
    }

    scheduleTokenRefresh(expiresAt);
  } catch (error) {
    console.error(error);
    await logout(refreshTokenSecret);
    redirectToLogin();
  }
}

async function submitLogin(formRefs) {
  const { form, usernameInput, passwordInput, submitButton, usernameError, passwordError } = formRefs;
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  clearStatus();
  clearAuthErrorState(formRefs);

  if (isLockedOut()) {
    renderLockoutMessage();
    return;
  }

  if (!validateCredentials(username, password, formRefs)) {
    clearStoredSession();
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const response = await login(username, password);
    await handleSuccessfulLogin(response, username);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      consecutiveFailures += 1;
      handleAuthFailure(formRefs, 'Invalid credentials. Please check your username and password.');
      if (handleLockoutIfNeeded()) {
        return;
      }
      return;
    }

    if (String(error.message || '') === 'Server unreachable. Check that the EduGuard server is running on your local network.') {
      setStatus(error.message, 'error');
      return;
    }

    handleAuthFailure(formRefs, 'Authentication error. Please try again.');
  } finally {
    if (submitButton && !isLockedOut()) {
      submitButton.disabled = false;
    }
  }
}

function initializeAuthPage() {
  if (ensureLoginRedirect()) {
    return;
  }

  const form = qs('#login-form');
  const usernameInput = qs('#username');
  const passwordInput = qs('#password');
  const usernameError = qs('#username-error');
  const passwordError = qs('#password-error');
  const submitButton = qs('[data-submit-button]');

  if (!form || !usernameInput || !passwordInput || !submitButton) {
    return;
  }

  bindPasswordToggle();
  clearStoredSession();

  const formRefs = {
    form,
    usernameInput,
    passwordInput,
    submitButton,
    usernameError,
    passwordError,
  };

  if (isLockedOut()) {
    startLockout();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitLogin(formRefs).catch((error) => {
      console.error(error);
      setStatus('Authentication error. Please try again.', 'error');
      if (submitButton) {
        submitButton.disabled = false;
      }
    });
  });

  usernameInput.addEventListener('input', () => {
    clearFieldError(usernameInput, usernameError);
  });

  passwordInput.addEventListener('input', () => {
    clearFieldError(passwordInput, passwordError);
  });

  renderLockoutMessage();
  if (!isLockedOut()) {
    clearStatus();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuthPage, { once: true });
} else {
  initializeAuthPage();
}