import { gameSocketUrl } from '../../api/config';

const SEND_INTERVAL_MS = 50;

export class RealtimeClient {
  constructor({ localId, onEvent, onMessage, roomId }) {
    this.localId = localId;
    this.onEvent = onEvent;
    this.onMessage = onMessage;
    this.roomId = roomId;
    this.socket = null;
    this.lastMoveSentAt = 0;
    this.connected = false;
  }

  connect(joinPayload) {
    if (!this.roomId) {
      return;
    }
    this.socket = new WebSocket(gameSocketUrl());
    this.socket.addEventListener('open', () => {
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
      this.onEvent?.('Disconnected from online room');
    });
    this.socket.addEventListener('error', () => {
      this.onEvent?.('Online connection failed');
    });
  }

  dispose() {
    this.connected = false;
    this.socket?.close();
    this.socket = null;
  }

  sendMove(payload, time) {
    if (time - this.lastMoveSentAt < SEND_INTERVAL_MS) {
      return;
    }
    this.lastMoveSentAt = time;
    this.send({ ...payload, type: 'MOVE' });
  }

  sendHit(payload) {
    this.send({ ...payload, type: 'HIT' }, true);
  }

  send(payload, allowBeforeOpen = false) {
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
}
