import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function env(name: string) {
  return globalThis.Netlify?.env?.get(name) || process.env[name] || '';
}

function databaseConfig() {
  const rawUrl = env('NETLIFY_DATABASE_URL') || env('DATABASE_URL') || env('DB_URL');
  if (!rawUrl) {
    throw new Error('Database URL is not configured.');
  }
  const parsedUrl = new URL(rawUrl.replace(/^jdbc:/, ''));
  parsedUrl.searchParams.delete('sslmode');
  parsedUrl.searchParams.delete('sslcert');
  parsedUrl.searchParams.delete('sslrootcert');
  parsedUrl.searchParams.delete('sslkey');
  const username = env('DB_USERNAME');
  const password = env('DB_PASSWORD');
  if (username && password) {
    parsedUrl.username = username;
    parsedUrl.password = password;
  } else if (parsedUrl.username === 'postgres' && parsedUrl.hostname.includes('supabase.com')) {
    throw new Error('DB_USERNAME and DB_PASSWORD are required for the Supabase pooler.');
  }
  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

export function db() {
  if (!pool) {
    pool = new Pool(databaseConfig());
  }
  return pool;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function text(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function requireUserId(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const secret = env('JWT_SECRET') || env('DEADZONE_JWT_SECRET');
  if (!token || !secret) throw text('Your session is invalid or expired.', 401);
  const parts = token.split('.');
  if (parts.length !== 3) throw text('Your session is invalid or expired.', 401);
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) {
    throw text('Your session is invalid or expired.', 401);
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw text('Your session is invalid or expired.', 401);
  }
  return Number(payload.sub);
}

export function levelFromXp(xp: number) {
  return Math.max(1, 1 + Math.floor((xp || 0) / 1000));
}

export function roomResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    mapId: row.map_id,
    gameMode: row.game_mode || 'team-deathmatch',
    scoreLimit: Number(row.score_limit || 30),
    timeLimitMinutes: Number(row.time_limit_minutes || 20),
    players: Number(row.players || 0),
    maxPlayers: Number(row.max_players || 10),
    bluePlayers: Number(row.blue_players || 0),
    redPlayers: Number(row.red_players || 0),
    allowBots: Boolean(row.allow_bots),
    permanent: Boolean(row.permanent),
  };
}
