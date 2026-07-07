import { sessionTokenKey } from './users';
import { sameOriginApiBase } from './config';

const API_BASE = sameOriginApiBase('/api/rooms');

async function request(path = '', options = {}) {
  const token = localStorage.getItem(sessionTokenKey);
  if (!token) {
    throw new Error('Please log in again before opening or joining rooms.');
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.detail || parsed.message || parsed.error || body;
    } catch {
      // Keep plain-text server errors unchanged.
    }
    throw new Error(message || 'Room request failed.');
  }
  return response.json();
}

export function fetchRooms() {
  return request();
}

export function findRoomByCode(code) {
  return request(`/${encodeURIComponent(code.trim())}`);
}

export function createRoomOnServer(room) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(room),
  });
}

export function joinRoomOnServer(code) {
  return request(`/${encodeURIComponent(code.trim())}/join`, { method: 'POST' });
}

export function leaveRoomOnServer(code) {
  return request(`/${encodeURIComponent(code.trim())}/leave`, { method: 'POST' });
}
