import type { Config } from '@netlify/functions';
import { db, json, readJson, requireUserId, text } from './_shared/deadzone.mts';

const PLAYER_TTL_SECONDS = 8;

async function ensureRealtimeTables() {
  await db().query(`
    create table if not exists match_players (
      room_id text not null,
      player_id text not null,
      user_id bigint,
      payload jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (room_id, player_id)
    )
  `);
  await db().query('create index if not exists idx_match_players_room_updated on match_players (room_id, updated_at desc)');
}

function cleanRoomId(value: string) {
  return value.trim().toUpperCase().slice(0, 32);
}

function cleanPlayerId(value: unknown) {
  return String(value || '').trim().slice(0, 80);
}

function cleanNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cleanScore(value: unknown) {
  return Math.max(0, Math.round(cleanNumber(value)));
}

function cleanState(body: Record<string, unknown>) {
  return {
    id: cleanPlayerId(body.playerId || body.id),
    name: String(body.name || 'Player').trim().slice(0, 40) || 'Player',
    team: String(body.team || 'blue').trim().slice(0, 16) || 'blue',
    weaponId: String(body.weaponId || 'rifle').trim().slice(0, 32) || 'rifle',
    weaponSkinId: String(body.weaponSkinId || 'standard').trim().slice(0, 32) || 'standard',
    outfitId: String(body.outfitId || 'classic').trim().slice(0, 32) || 'classic',
    accessoryIds: Array.isArray(body.accessoryIds) ? body.accessoryIds.map((item) => String(item).slice(0, 32)).slice(0, 8) : [],
    mapId: String(body.mapId || 'foundry').trim().slice(0, 32) || 'foundry',
    x: cleanNumber(body.x),
    y: cleanNumber(body.y),
    z: cleanNumber(body.z),
    yaw: cleanNumber(body.yaw),
    pitch: cleanNumber(body.pitch),
    vx: cleanNumber(body.vx),
    vy: cleanNumber(body.vy),
    vz: cleanNumber(body.vz),
    clientSentAt: cleanNumber(body.clientSentAt),
    health: Math.max(0, Math.min(100, Math.round(cleanNumber(body.health, 100)))),
    dead: Boolean(body.dead),
    kills: cleanScore(body.kills),
    assists: cleanScore(body.assists),
    deaths: cleanScore(body.deaths),
    score: cleanScore(body.score),
  };
}

function mergeIncomingState(incoming: Record<string, unknown>, existing?: Record<string, unknown>) {
  if (!existing) {
    return incoming;
  }
  const existingHealth = cleanNumber(existing.health, 100);
  const incomingHealth = cleanNumber(incoming.health, 100);
  const existingDead = Boolean(existing.dead);
  const incomingDead = Boolean(incoming.dead);
  const isRespawn = existingDead && !incomingDead && incomingHealth >= 80;
  const next = { ...incoming };

  if (!isRespawn && !incomingDead && existingHealth < incomingHealth) {
    next.health = existingHealth;
  }
  if (existingDead && !isRespawn) {
    next.dead = true;
    next.health = Math.min(existingHealth, incomingHealth);
  }
  return next;
}

async function roomState(roomId: string) {
  await db().query('delete from match_players where updated_at < now() - ($1::int * interval \'1 second\')', [PLAYER_TTL_SECONDS]);
  const result = await db().query(
    `select payload
     from match_players
     where room_id = $1 and updated_at > now() - ($2::int * interval '1 second')
     order by updated_at desc`,
    [roomId, PLAYER_TTL_SECONDS],
  );
  return {
    type: 'STATE',
    roomId,
    players: result.rows.map((row) => row.payload),
  };
}

async function upsertState(req: Request, roomId: string) {
  const userId = requireUserId(req);
  const body = await readJson(req);
  const incoming = cleanState(body as Record<string, unknown>);
  if (!incoming.id) return text('Player id is required.', 400);

  const client = await db().connect();
  try {
    await client.query('begin');
    const existing = await client.query(
      'select payload from match_players where room_id = $1 and player_id = $2 for update',
      [roomId, incoming.id],
    );
    const payload = mergeIncomingState(incoming, existing.rows[0]?.payload);
    await client.query(
      `insert into match_players (room_id, player_id, user_id, payload, updated_at)
       values ($1, $2, $3, $4::jsonb, now())
       on conflict (room_id, player_id)
       do update set user_id = excluded.user_id, payload = excluded.payload, updated_at = now()`,
      [roomId, incoming.id, userId, JSON.stringify(payload)],
    );
    await client.query('commit');
    return json(await roomState(roomId));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function applyHit(req: Request, roomId: string) {
  requireUserId(req);
  const body = await readJson(req);
  const targetId = cleanPlayerId((body as Record<string, unknown>).playerId);
  const damage = Math.max(1, Math.min(100, Math.round(cleanNumber((body as Record<string, unknown>).damage, 10))));
  if (!targetId) return text('Target player id is required.', 400);

  const client = await db().connect();
  try {
    await client.query('begin');
    const target = await client.query(
      'select payload from match_players where room_id = $1 and player_id = $2 for update',
      [roomId, targetId],
    );
    if (target.rows[0]) {
      const payload = target.rows[0].payload as Record<string, unknown>;
      const health = Math.max(0, cleanNumber(payload.health, 100) - damage);
      payload.health = health;
      payload.dead = health <= 0;
      await client.query(
        'update match_players set payload = $3::jsonb, updated_at = now() where room_id = $1 and player_id = $2',
        [roomId, targetId, JSON.stringify(payload)],
      );
    }
    await client.query('commit');
    return json(await roomState(roomId));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function removePlayer(req: Request, roomId: string, playerId: string) {
  requireUserId(req);
  await db().query('delete from match_players where room_id = $1 and player_id = $2', [roomId, playerId]);
  return json(await roomState(roomId));
}

export default async (req: Request) => {
  try {
    await ensureRealtimeTables();
    const url = new URL(req.url);
    const segments = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const roomId = cleanRoomId(segments[2] || '');
    if (!roomId) return text('Room id is required.', 400);

    if (req.method === 'GET' && segments.length === 4 && segments[3] === 'state') {
      requireUserId(req);
      return json(await roomState(roomId));
    }
    if (req.method === 'POST' && segments.length === 4 && segments[3] === 'state') {
      return upsertState(req, roomId);
    }
    if (req.method === 'POST' && segments.length === 4 && segments[3] === 'hit') {
      return applyHit(req, roomId);
    }
    if (req.method === 'DELETE' && segments.length === 5 && segments[3] === 'players') {
      return removePlayer(req, roomId, cleanPlayerId(segments[4]));
    }
    return text('Not found.', 404);
  } catch (error) {
    if (error instanceof Response) return error;
    return text(error instanceof Error ? error.message : 'Realtime request failed.', 500);
  }
};

export const config: Config = {
  path: ['/api/realtime/*'],
};
