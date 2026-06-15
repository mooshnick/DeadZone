package com.deadZone.shooterserver;

import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.Player;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Map<String, Player> players = new ConcurrentHashMap<>();
    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        System.out.println("🟢 New connection: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        GameMessage gameMessage = objectMapper.readValue(payload, GameMessage.class);

        if ("JOIN".equals(gameMessage.getType())) {
            Player newPlayer = new Player(gameMessage.getPlayerId(), gameMessage.getX(), gameMessage.getY());
            players.put(session.getId(), newPlayer);
            System.out.println("Player Joined: " + gameMessage.getPlayerId());

        } else if ("MOVE".equals(gameMessage.getType())) {
            Player player = players.get(session.getId());
            if (player != null) {
                player.setX(gameMessage.getX());
                player.setY(gameMessage.getY());
            }
        }

        broadcastGameState();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        Player disconnectedPlayer = players.remove(session.getId());

        if (disconnectedPlayer != null) {
            System.out.println("🔴 Player disconnected: " + disconnectedPlayer.getId());
            broadcastGameState();
        }
    }

    private void broadcastGameState() throws Exception {
        String jsonState = objectMapper.writeValueAsString(players.values());
        TextMessage message = new TextMessage(jsonState);

        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                session.sendMessage(message);
            }
        }
    }
}