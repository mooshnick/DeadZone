import { sameOriginApiBase } from './config';

const API_BASE = sameOriginApiBase('/api/users');
export const sessionTokenKey = 'deadzone-session-token';
const legacyUserIdKey = 'deadzone-legacy-user-id';
const DEFAULT_GOOGLE_CLIENT_ID = '887346314238-ki4v912u2btr9i28sf2lcem8vqt889io.apps.googleusercontent.com';
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

function token() {
  return localStorage.getItem(sessionTokenKey);
}

async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(!skipAuth && token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(`Cannot reach the server at ${API_BASE}. Start the backend on port 8080 and try again.`, { cause: error });
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.detail || parsed.message || parsed.error || body;
    } catch {
      // Keep plain-text server errors unchanged.
    }
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

  if (!response?.token && !response?.legacySession) {
    clearSession();
    return {
      ...user,
      verificationEmailSent: Boolean(response?.verificationEmailSent),
    };
  }

  if (response.token) {
    localStorage.setItem(sessionTokenKey, response.token);
    localStorage.removeItem(legacyUserIdKey);
  } else if (response.legacySession && user.id != null) {
    localStorage.setItem(legacyUserIdKey, String(user.id));
    localStorage.removeItem(sessionTokenKey);
  }

  return {
    ...user,
    verificationEmailSent: Boolean(response?.verificationEmailSent),
  };
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

export function loginWithGoogle(idToken) {
  return request('/google-login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
    skipAuth: true,
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
  localStorage.removeItem(legacyUserIdKey);
  return request('/me');
}

export function saveUserProgress(progress) {
  localStorage.removeItem(legacyUserIdKey);
  return request('/me/progress', {
    method: 'PATCH',
    body: JSON.stringify(progress),
  });
}

export function clearSession() {
  localStorage.removeItem(sessionTokenKey);
  localStorage.removeItem(legacyUserIdKey);
}

export function hasSession() {
  if (localStorage.getItem(legacyUserIdKey) && !token()) {
    localStorage.removeItem(legacyUserIdKey);
  }
  return Boolean(token());
}
