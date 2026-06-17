package com.deadZone.shooterserver.websocket;

import com.deadZone.shooterserver.game.GameConstants;
import com.deadZone.shooterserver.game.GameMessageType;
import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.deadZone.shooterserver.model.Player;
import com.deadZone.shooterserver.service.GameRulesService;
import com.deadZone.shooterserver.service.RealtimeMessageService;
import com.deadZone.shooterserver.service.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper objectMapper;
    private final RoomService roomService;
    private final GameRulesService gameRulesService;
    private final RealtimeMessageService realtimeMessageService;

    public GameWebSocketHandler(
            ObjectMapper objectMapper,
            RoomService roomService,
            GameRulesService gameRulesService,
            RealtimeMessageService realtimeMessageService
    ) {
        this.objectMapper = objectMapper;
        this.roomService = roomService;
        this.gameRulesService = gameRulesService;
        this.realtimeMessageService = realtimeMessageService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        realtimeMessageService.addSession(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        GameMessage gameMessage = objectMapper.readValue(message.getPayload(), GameMessage.class);
        String roomId = roomService.normalizeRoomId(gameMessage.getRoomId());

        if (GameMessageType.JOIN.equals(gameMessage.getType())) {
            handleJoin(session, roomId, gameMessage);
            return;
        }

        Player player = roomService.playerForSession(session.getId());
        GameRoom room = roomService.room(roomId);
        if (player == null || room == null) {
            return;
        }

        if (GameMessageType.MOVE.equals(gameMessage.getType())) {
            gameRulesService.move(player, gameMessage);
        }

        if (GameMessageType.SHOOT.equals(gameMessage.getType())) {
            realtimeMessageService.broadcastShot(roomId, gameMessage, session.getId());
            return;
        }

        if (GameMessageType.HIT.equals(gameMessage.getType())) {
            gameRulesService.applyHit(room, gameMessage);
        }

        realtimeMessageService.broadcastRoomState(room);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        GameRoom room = roomService.roomForSession(session.getId());
        roomService.leave(session.getId());
        realtimeMessageService.removeSession(session.getId());
        if (room != null && !room.isEmpty()) {
            realtimeMessageService.broadcastRoomState(room);
        }
    }

    private void handleJoin(WebSocketSession session, String roomId, GameMessage gameMessage) throws Exception {
        if (!roomService.canJoin(session.getId(), roomId)) {
            realtimeMessageService.sendError(session, "Room is full. Maximum players: " + GameConstants.MAX_PLAYERS_PER_ROOM);
            return;
        }

        GameRoom room = roomService.join(session.getId(), roomId, gameMessage);
        realtimeMessageService.broadcastRoomState(room);
    }
}
