const API_BASE = 'http://127.0.0.1:8080/api/users';
export const sessionTokenKey = 'deadzone-session-token';
const legacyUserIdKey = 'deadzone-legacy-user-id';

function token() {
  return localStorage.getItem(sessionTokenKey);
}

async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(!skipAuth && token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Server request failed.');
  }

  return response.json();
}

function normalizeAuthResponse(response) {
  return response?.user ?? response?.userResponse ?? response?.data?.user ?? response;
}

function storeSession(response) {
  const user = normalizeAuthResponse(response);
  if (!user?.username) {
    throw new Error('The server returned an invalid login response.');
  }

  if (response?.token) {
    localStorage.setItem(sessionTokenKey, response.token);
    localStorage.removeItem(legacyUserIdKey);
  } else if (response?.legacySession && user.id != null) {
    localStorage.setItem(legacyUserIdKey, String(user.id));
    localStorage.removeItem(sessionTokenKey);
  }

  return user;
}

export function registerUser(username, email, password) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  }).then(storeSession);
}

export function loginUser(username, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).then(storeSession);
}

export function verifyEmail(email, code) {
  return request('/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
    skipAuth: true,
  });
}

export function loadUser() {
  const legacyUserId = localStorage.getItem(legacyUserIdKey);
  return request(legacyUserId ? `/${legacyUserId}` : '/me');
}

export function saveUserProgress(progress) {
  const legacyUserId = localStorage.getItem(legacyUserIdKey);
  return request(legacyUserId ? `/${legacyUserId}/progress` : '/me/progress', {
    method: 'PATCH',
    body: JSON.stringify(progress),
  });
}

export function clearSession() {
  localStorage.removeItem(sessionTokenKey);
  localStorage.removeItem(legacyUserIdKey);
}

export function hasSession() {
  return Boolean(token() || localStorage.getItem(legacyUserIdKey));
}
