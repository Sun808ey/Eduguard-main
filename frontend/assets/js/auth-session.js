let worker = null;
const messageListeners = new Set();
const pendingRequests = new Map();

function ensureWorker() {
  if (worker) {
    return worker;
  }

  if (typeof SharedWorker === 'undefined') {
    return null;
  }

  worker = new SharedWorker(new URL('./auth-session.worker.js', import.meta.url), {
    type: 'module',
    name: 'eduguard-auth-session',
  });
  worker.port.start();
  worker.port.addEventListener('message', handleMessage);
  return worker;
}

function handleMessage(event) {
  const message = event.data || {};

  if (message.type === 'session-response' && message.requestId && pendingRequests.has(message.requestId)) {
    pendingRequests.get(message.requestId)(message.session || null);
    pendingRequests.delete(message.requestId);
    return;
  }

  messageListeners.forEach((listener) => {
    try {
      listener(message);
    } catch {
      // Ignore listener failures so one consumer cannot break others.
    }
  });
}

function postMessage(type, payload = {}) {
  const activeWorker = ensureWorker();
  if (!activeWorker) {
    return false;
  }

  activeWorker.port.postMessage({ type, ...payload });
  return true;
}

export function storeAuthSession(session) {
  return postMessage('store-session', session);
}

export function clearAuthSession() {
  return postMessage('clear-session');
}

export function requestAuthSession() {
  const activeWorker = ensureWorker();
  if (!activeWorker) {
    return Promise.resolve(null);
  }

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new Promise((resolve) => {
    pendingRequests.set(requestId, resolve);
    activeWorker.port.postMessage({ type: 'get-session', requestId });
    window.setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.get(requestId)(null);
        pendingRequests.delete(requestId);
      }
    }, 250);
  });
}

export function subscribeAuthSession(listener) {
  messageListeners.add(listener);
  ensureWorker();

  return () => {
    messageListeners.delete(listener);
  };
}