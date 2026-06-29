import type { Config } from '@netlify/functions';
import { db, json, readJson, requireUserId, roomResponse, text } from './_shared/deadzone.mts';

const DEFAULT_ROOMS = [
  ['TEAM01', 'Frontline Teams', 'foundry', 'team-deathmatch', 30, 20, 0, 10, 0, 0, true, true],
  ['FFA001', 'Solo Mayhem', 'apocalyptic', 'free-for-all', 25, 20, 0, 10, 0, 0, true, true],
  ['MIX001', 'Rotating Objective', 'overgrowth', 'capture-point', 20, 20, 0, 10, 0, 0, true, true],
] as const;

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, Math.round(numeric))) : fallback;
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ROOM-';
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function seedDefaultRooms() {
  const client = await db().connect();
  try {
    for (const room of DEFAULT_ROOMS) {
      await client.query(
        `insert into lobby_rooms (
          id, name, map_id, game_mode, score_limit, time_limit_minutes, players, max_players,
          blue_players, red_players, allow_bots, permanent, last_activity_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        on conflict (id) do nothing`,
        room,
      );
    }
  } finally {
    client.release();
  }
}

async function listRooms(req: Request) {
  requireUserId(req);
  await seedDefaultRooms();
  const result = await db().query(
    `select * from lobby_rooms
     where permanent = true or players > 0 or last_activity_at > now() - interval '5 minutes'
     order by permanent desc, last_activity_at desc`,
  );
  return json(result.rows.map(roomResponse));
}

async function findRoom(req: Request, code: string) {
  requireUserId(req);
  const result = await db().query('select * from lobby_rooms where upper(id) = upper($1)', [code]);
  if (!result.rows[0]) return text('No open room matches that game code.', 404);
  return json(roomResponse(result.rows[0]));
}

async function createRoom(req: Request) {
  requireUserId(req);
  const body = await readJson(req);
  const id = roomCode();
  const name = String(body.name || 'Custom Arena').trim().slice(0, 80) || 'Custom Arena';
  const mapId = String(body.mapId || 'foundry').trim().slice(0, 32) || 'foundry';
  const gameMode = String(body.gameMode || 'team-deathmatch').trim().slice(0, 32) || 'team-deathmatch';
  const scoreLimit = clamp(body.scoreLimit, 3, 60, 30);
  const timeLimitMinutes = clamp(body.timeLimitMinutes, 1, 20, 20);
  const maxPlayers = clamp(body.maxPlayers, 2, 10, 10);
  const allowBots = Boolean(body.allowBots);
  const result = await db().query(
    `insert into lobby_rooms (
      id, name, map_id, game_mode, score_limit, time_limit_minutes, players, max_players,
      blue_players, red_players, allow_bots, permanent, last_activity_at
    ) values ($1,$2,$3,$4,$5,$6,0,$7,0,0,$8,false,now()) returning *`,
    [id, name, mapId, gameMode, scoreLimit, timeLimitMinutes, maxPlayers, allowBots],
  );
  return json(roomResponse(result.rows[0]));
}

async function joinRoom(req: Request, code: string) {
  requireUserId(req);
  const client = await db().connect();
  try {
    await client.query('begin');
    const existing = await client.query('select * from lobby_rooms where upper(id) = upper($1) for update', [code]);
    const room = existing.rows[0];
    if (!room) {
      await client.query('rollback');
      return text('No open room matches that game code.', 404);
    }
    if (Number(room.players || 0) >= Number(room.max_players || 10)) {
      await client.query('rollback');
      return text('This room is full.', 409);
    }
    const bluePlayers = Number(room.blue_players || 0);
    const redPlayers = Number(room.red_players || 0);
    const joinBlue = bluePlayers <= redPlayers;
    const updated = await client.query(
      `update lobby_rooms set
        players = players + 1,
        blue_players = blue_players + $2,
        red_players = red_players + $3,
        last_activity_at = now()
       where id = $1 returning *`,
      [room.id, joinBlue ? 1 : 0, joinBlue ? 0 : 1],
    );
    await client.query('commit');
    return json(roomResponse(updated.rows[0]));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function leaveRoom(req: Request, code: string) {
  requireUserId(req);
  const result = await db().query(
    `update lobby_rooms set
      players = greatest(players - 1, 0),
      blue_players = greatest(blue_players - 1, 0),
      last_activity_at = now()
     where upper(id) = upper($1) returning *`,
    [code],
  );
  if (!result.rows[0]) return text('No open room matches that game code.', 404);
  return json(roomResponse(result.rows[0]));
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);
    const code = segments[2] || '';
    if (req.method === 'GET' && segments.length === 2) return listRooms(req);
    if (req.method === 'POST' && segments.length === 2) return createRoom(req);
    if (req.method === 'GET' && segments.length === 3) return findRoom(req, code);
    if (req.method === 'POST' && segments.length === 4 && segments[3] === 'join') return joinRoom(req, code);
    if (req.method === 'POST' && segments.length === 4 && segments[3] === 'leave') return leaveRoom(req, code);
    return text('Not found.', 404);
  } catch (error) {
    if (error instanceof Response) return error;
    return text(error instanceof Error ? error.message : 'Room request failed.', 500);
  }
};

export const config: Config = {
  path: ['/api/rooms', '/api/rooms/*'],
};
