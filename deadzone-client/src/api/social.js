import { sameOriginApiBase } from './config';
import { sessionTokenKey } from './users';

const API_BASE = sameOriginApiBase('/api/social');

async function request(path = '', options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem(sessionTokenKey)}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Social request failed.');
  }
  if (response.status === 204) return null;
  return response.json();
}

export function fetchSocialOverview() {
  return request();
}

export function searchPlayers(username) {
  return request(`/users?username=${encodeURIComponent(username.trim())}`);
}

export function sendFriendRequest(username) {
  return request('/friend-requests', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function acceptFriendRequest(requestId) {
  return request(`/friend-requests/${requestId}/accept`, { method: 'POST' });
}

export function declineFriendRequest(requestId) {
  return request(`/friend-requests/${requestId}`, { method: 'DELETE' });
}

export function inviteFriendToRoom(friendId, roomCode) {
  return request('/room-invites', {
    method: 'POST',
    body: JSON.stringify({ friendId, roomCode }),
  });
}

export function acceptRoomInvite(invitationId) {
  return request(`/room-invites/${invitationId}/accept`, { method: 'POST' });
}

export function declineRoomInvite(invitationId) {
  return request(`/room-invites/${invitationId}`, { method: 'DELETE' });
}
