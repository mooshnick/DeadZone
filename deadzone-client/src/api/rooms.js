import { sessionTokenKey } from './users';

const API_BASE = 'http://127.0.0.1:8080/api/rooms';

async function request(path = '', options = {}) {
  const token = localStorage.getItem(sessionTokenKey);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
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
