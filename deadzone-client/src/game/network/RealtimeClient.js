import { createClient } from '@supabase/supabase-js';
import { gameSocketUrl, sameOriginApiBase } from '../../api/config';
import { sessionTokenKey } from '../../api/users';

const SOCKET_SEND_INTERVAL_MS = 50;
const SUPABASE_SEND_INTERVAL_MS = 50;
const HTTP_SEND_INTERVAL_MS = 80;
const HTTP_POLL_INTERVAL_MS = 95;
const SOCKET_FALLBACK_MS = 2200;
const MAX_REPORTED_SPEED = 34;
const REMOTE_STATE_TTL_MS = 3000;

function supabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export class RealtimeClient {
  constructor({ localId, onEvent, onMessage, roomId }) {
    this.localId = localId;
    this.onEvent = onEvent;
    this.onMessage = onMessage;
    this.roomId = roomId;
    this.socket = null;
    this.lastMoveSentAt = 0;
    this.connected = false;
    this.disposed = false;
    this.mode = 'socket';
    this.joinPayload = null;
    this.fallbackTimer = 0;
    this.pollTimer = 0;
    this.pollInFlight = false;
    this.stateInFlight = false;
    this.pendingState = null;
    this.lastVelocityPayload = null;
    this.lastVelocityAt = 0;
    this.supabase = null;
    this.channel = null;
    this.remoteStates = new Map();
    this.localState = null;
    this.pruneTimer = 0;
  }

  connect(joinPayload) {
    if (!this.roomId) {
      return;
    }
    this.disposed = false;
    this.joinPayload = joinPayload;
    if (this.startSupabaseSync(joinPayload)) {
      return;
    }
    this.startSocketSync(joinPayload);
  }

  startSocketSync(joinPayload) {
    this.socket = new WebSocket(gameSocketUrl());
    this.fallbackTimer = window.setTimeout(() => {
      if (!this.connected && !this.disposed) {
        this.startHttpSync('Online room sync is using database fallback');
      }
    }, SOCKET_FALLBACK_MS);
    this.socket.addEventListener('open', () => {
      window.clearTimeout(this.fallbackTimer);
      this.connected = true;
      this.send({ ...joinPayload, type: 'JOIN' }, true);
      this.onEvent?.('Connected to online room');
    });
    this.socket.addEventListener('message', (event) => {
      try {
        this.onMessage?.(JSON.parse(event.data));
      } catch {
        this.onEvent?.('Received a broken online update');
      }
    });
    this.socket.addEventListener('close', () => {
      this.connected = false;
      if (!this.disposed) {
        this.startHttpSync('Reconnected room sync through database');
      } else {
        this.onEvent?.('Disconnected from online room');
      }
    });
    this.socket.addEventListener('error', () => {
      if (!this.disposed) {
        this.startHttpSync('Online room sync is using database fallback');
      }
    });
  }

  dispose() {
    this.disposed = true;
    this.connected = false;
    window.clearTimeout(this.fallbackTimer);
    window.clearTimeout(this.pollTimer);
    window.clearTimeout(this.pruneTimer);
    this.removeHttpState();
    if (this.channel && this.supabase) {
      this.channel.send({
        type: 'broadcast',
        event: 'leave',
        payload: { id: this.localId, playerId: this.localId },
      }).catch(() => {});
      this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
    this.supabase = null;
    this.socket?.close();
    this.socket = null;
  }

  sendMove(payload, time) {
    const interval = this.mode === 'supabase'
      ? SUPABASE_SEND_INTERVAL_MS
      : this.mode === 'http'
        ? HTTP_SEND_INTERVAL_MS
        : SOCKET_SEND_INTERVAL_MS;
    if (time - this.lastMoveSentAt < interval) {
      return;
    }
    this.lastMoveSentAt = time;
    this.send({ ...this.payloadWithVelocity(payload, time), type: 'MOVE' });
  }

  sendHit(payload) {
    this.send({ ...payload, type: 'HIT' }, true);
  }

  send(payload, allowBeforeOpen = false) {
    if (this.mode === 'supabase') {
      if (payload.type === 'HIT') {
        this.sendSupabaseHit(payload);
        return;
      }
      if (payload.type === 'JOIN' || payload.type === 'MOVE') {
        this.sendSupabaseState(payload);
      }
      return;
    }
    if (this.mode === 'http') {
      if (payload.type === 'HIT') {
        this.sendHttpHit(payload);
        return;
      }
      if (payload.type === 'JOIN' || payload.type === 'MOVE') {
        this.queueHttpState(payload);
      }
      return;
    }
    if (!this.socket || (!allowBeforeOpen && !this.connected)) {
      return;
    }
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify({
      roomId: this.roomId,
      playerId: this.localId,
      ...payload,
    }));
  }

  startSupabaseSync(joinPayload) {
    const config = supabaseConfig();
    if (!config) {
      return false;
    }
    this.mode = 'supabase';
    this.supabase = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 30,
        },
      },
    });
    this.channel = this.supabase.channel(`deadzone-room-${this.roomId}`, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });
    this.channel
      .on('broadcast', { event: 'state' }, ({ payload }) => this.receiveSupabaseState(payload))
      .on('broadcast', { event: 'hit' }, ({ payload }) => this.receiveSupabaseHit(payload))
      .on('broadcast', { event: 'leave' }, ({ payload }) => this.receiveSupabaseLeave(payload))
      .subscribe((status) => {
        if (this.disposed) {
          return;
        }
        if (status === 'SUBSCRIBED') {
          this.connected = true;
          this.sendSupabaseState({ ...joinPayload, type: 'JOIN' });
          this.onEvent?.('Connected to live room');
          this.scheduleSupabasePrune();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!this.disposed && !this.connected) {
            this.startSocketSync(joinPayload);
          }
        }
      });
    return true;
  }

  sendSupabaseState(payload) {
    if (!this.channel || !this.connected) {
      return;
    }
    this.localState = {
      playerId: this.localId,
      id: this.localId,
      ...payload,
      updatedAt: performance.now(),
    };
    this.channel.send({
      type: 'broadcast',
      event: 'state',
      payload: this.localState,
    }).catch(() => {
      this.onEvent?.('Live room state send failed');
    });
  }

  sendSupabaseHit(payload) {
    if (!this.channel || !this.connected) {
      return;
    }
    this.channel.send({
      type: 'broadcast',
      event: 'hit',
      payload: {
        ...payload,
        shooterId: payload.shooterId || this.localId,
        sentAt: performance.now(),
      },
    }).catch(() => {
      this.onEvent?.('Live damage send failed');
    });
  }

  receiveSupabaseState(payload) {
    const id = payload?.id || payload?.playerId;
    if (!id || id === this.localId) {
      return;
    }
    this.remoteStates.set(id, {
      ...payload,
      id,
      updatedAt: performance.now(),
    });
    this.emitSupabaseState();
  }

  receiveSupabaseHit(payload) {
    if (!payload?.playerId) {
      return;
    }
    this.onMessage?.({
      type: 'HIT',
      ...payload,
    });
  }

  receiveSupabaseLeave(payload) {
    const id = payload?.id || payload?.playerId;
    if (!id) {
      return;
    }
    this.remoteStates.delete(id);
    this.emitSupabaseState();
  }

  emitSupabaseState() {
    const time = performance.now();
    const players = [];
    for (const [id, state] of this.remoteStates.entries()) {
      if (time - (state.updatedAt || 0) > REMOTE_STATE_TTL_MS) {
        this.remoteStates.delete(id);
        continue;
      }
      players.push(state);
    }
    if (this.localState) {
      players.push(this.localState);
    }
    this.onMessage?.({
      type: 'STATE',
      roomId: this.roomId,
      players,
    });
  }

  scheduleSupabasePrune() {
    window.clearTimeout(this.pruneTimer);
    if (this.disposed || this.mode !== 'supabase') {
      return;
    }
    this.emitSupabaseState();
    this.pruneTimer = window.setTimeout(() => this.scheduleSupabasePrune(), 1000);
  }

  payloadWithVelocity(payload, time) {
    const previous = this.lastVelocityPayload;
    const elapsed = this.lastVelocityAt ? Math.max(0.016, (time - this.lastVelocityAt) / 1000) : 0;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    if (previous && elapsed > 0) {
      vx = ((payload.x ?? previous.x ?? 0) - (previous.x ?? 0)) / elapsed;
      vy = ((payload.y ?? previous.y ?? 0) - (previous.y ?? 0)) / elapsed;
      vz = ((payload.z ?? previous.z ?? 0) - (previous.z ?? 0)) / elapsed;
      const horizontalSpeed = Math.hypot(vx, vz);
      if (horizontalSpeed > MAX_REPORTED_SPEED) {
        const scale = MAX_REPORTED_SPEED / horizontalSpeed;
        vx *= scale;
        vz *= scale;
      }
    }
    this.lastVelocityPayload = {
      x: payload.x ?? 0,
      y: payload.y ?? 0,
      z: payload.z ?? 0,
    };
    this.lastVelocityAt = time;
    return {
      ...payload,
      vx,
      vy,
      vz,
      clientSentAt: time,
    };
  }

  startHttpSync(message) {
    if (this.mode === 'http' || this.disposed) {
      return;
    }
    this.mode = 'http';
    this.connected = true;
    window.clearTimeout(this.fallbackTimer);
    this.socket?.close();
    this.socket = null;
    this.onEvent?.(message);
    if (this.joinPayload) {
      this.queueHttpState({ ...this.joinPayload, type: 'JOIN' });
    }
    this.pollHttpState();
  }

  realtimeUrl(path = '') {
    return `${sameOriginApiBase('/api/realtime')}/${encodeURIComponent(this.roomId)}${path}`;
  }

  authHeaders() {
    const token = localStorage.getItem(sessionTokenKey);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  queueHttpState(payload) {
    this.pendingState = payload;
    if (!this.stateInFlight) {
      this.flushHttpState();
    }
  }

  async flushHttpState() {
    if (this.disposed || !this.pendingState) {
      return;
    }
    const payload = this.pendingState;
    this.pendingState = null;
    this.stateInFlight = true;
    try {
      const response = await fetch(this.realtimeUrl('/state'), {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          playerId: this.localId,
          ...payload,
        }),
      });
      if (response.ok) {
        this.onMessage?.(await response.json());
      }
    } catch {
      this.onEvent?.('Room sync update failed');
    } finally {
      this.stateInFlight = false;
      if (this.pendingState && !this.disposed) {
        this.flushHttpState();
      }
    }
  }

  async pollHttpState() {
    if (this.disposed || this.mode !== 'http' || this.pollInFlight) {
      return;
    }
    this.pollInFlight = true;
    try {
      const response = await fetch(this.realtimeUrl('/state'), {
        headers: this.authHeaders(),
      });
      if (response.ok) {
        this.onMessage?.(await response.json());
      }
    } catch {
      this.onEvent?.('Room sync read failed');
    } finally {
      this.pollInFlight = false;
      if (!this.disposed && this.mode === 'http') {
        this.pollTimer = window.setTimeout(() => this.pollHttpState(), HTTP_POLL_INTERVAL_MS);
      }
    }
  }

  async sendHttpHit(payload) {
    if (this.disposed) {
      return;
    }
    try {
      const response = await fetch(this.realtimeUrl('/hit'), {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        this.onMessage?.(await response.json());
      }
    } catch {
      this.onEvent?.('Room damage sync failed');
    }
  }

  async removeHttpState() {
    if (this.mode !== 'http' || !this.roomId) {
      return;
    }
    try {
      await fetch(this.realtimeUrl(`/players/${encodeURIComponent(this.localId)}`), {
        method: 'DELETE',
        headers: this.authHeaders(),
      });
    } catch {
      // Leaving the page should never block cleanup; stale players expire server-side.
    }
  }
}
