package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.game.GameMessageType;
import com.deadZone.shooterserver.game.GameSanitizer;
import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RealtimeMessageService {
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final RoomService roomService;
    private final GameSanitizer sanitizer;

    public RealtimeMessageService(ObjectMapper objectMapper, RoomService roomService, GameSanitizer sanitizer) {
        this.objectMapper = objectMapper;
        this.roomService = roomService;
        this.sanitizer = sanitizer;
    }

    public void addSession(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    public void removeSession(String sessionId) {
        sessions.remove(sessionId);
    }

    public void sendError(WebSocketSession session, String error) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", GameMessageType.ERROR);
        payload.put("message", error);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }

    public void broadcastRoomState(GameRoom room) throws Exception {
        if (room == null) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", GameMessageType.STATE);
        payload.put("roomId", room.getId());
        payload.put("mapId", room.getMapId());
        payload.put("players", room.players());
        TextMessage message = new TextMessage(objectMapper.writeValueAsString(payload));

        for (Map.Entry<String, String> entry : roomService.sessionRoomEntries()) {
          if (room.getId().equals(entry.getValue())) {
              sendIfOpen(entry.getKey(), message);
          }
        }
    }

    public void broadcastShot(String roomId, GameMessage gameMessage, String senderSessionId) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", GameMessageType.SHOT);
        payload.put("roomId", roomId);
        payload.put("playerId", gameMessage.getPlayerId());
        payload.put("x", gameMessage.getX());
        payload.put("y", gameMessage.getY());
        payload.put("facing", gameMessage.getFacing());
        payload.put("vx", gameMessage.getVx());
        payload.put("vy", gameMessage.getVy());
        payload.put("damage", gameMessage.getDamage() <= 0 ? 16 : gameMessage.getDamage());
        payload.put("life", gameMessage.getLife() <= 0 ? 58 : gameMessage.getLife());
        payload.put("weaponId", sanitizer.weaponId(gameMessage.getWeaponId()));
        TextMessage message = new TextMessage(objectMapper.writeValueAsString(payload));

        for (Map.Entry<String, String> entry : roomService.sessionRoomEntries()) {
            if (roomId.equals(entry.getValue()) && !senderSessionId.equals(entry.getKey())) {
                sendIfOpen(entry.getKey(), message);
            }
        }
    }

    private void sendIfOpen(String sessionId, TextMessage message) throws Exception {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            session.sendMessage(message);
        }
    }
}
