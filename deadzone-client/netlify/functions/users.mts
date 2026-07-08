import type { Config } from '@netlify/functions';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import pg from 'pg';

const { Pool } = pg;

const DEFAULT_OUTFIT_ID = 'classic';
const DEFAULT_WEAPON_ID = 'rifle';
const DEFAULT_WEAPON_SKIN_ID = 'standard';
const DEFAULT_GRENADE_SKIN_ID = 'standard';
const DEFAULT_GOOGLE_CLIENT_ID = '887346314238-ki4v912u2btr9i28sf2lcem8vqt889io.apps.googleusercontent.com';
const HASH_PREFIX = 'sha256';
const TOKEN_TTL_MINUTES = 15;
const SESSION_DAYS = 30;

type DbUser = {
  id: number;
  username: string;
  email: string;
  password: string;
  google_subject?: string | null;
  email_verified: boolean;
  admin: boolean;
  total_kills: number;
  total_assists: number;
  total_deaths: number;
  wallet: number;
  xp: number;
  outfit_id: string | null;
  weapon_id: string | null;
  weapon_skin_id: string | null;
  grenade_skin_id: string | null;
  mission_stats_json: string | null;
};

let pool: pg.Pool | null = null;

class HttpResponseError extends Error {
  response: Response;

  constructor(response: Response) {
    super('HTTP response');
    this.response = response;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpResponseError) {
    return error.response;
  }
  if (error instanceof Response) {
    return error;
  }
  return null;
}

function env(name: string) {
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
    return {
      connectionString: parsedUrl.toString(),
      ssl: { rejectUnauthorized: false },
    };
  }
  if (parsedUrl.username === 'postgres' && parsedUrl.hostname.includes('supabase.com')) {
    throw new Error('DB_USERNAME and DB_PASSWORD are required for the Supabase pooler.');
  }
  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

function db() {
  if (!pool) {
    pool = new Pool(databaseConfig());
  }
  return pool;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function text(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.createHash('sha256').update(salt).update(password, 'utf8').digest('base64');
  return `${HASH_PREFIX}$${salt.toString('base64')}$${digest}`;
}

function passwordMatches(rawPassword: string, storedPassword: string) {
  if (!rawPassword || !storedPassword) return false;
  const parts = storedPassword.split('$');
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return rawPassword === storedPassword;
  }
  const digest = crypto.createHash('sha256')
    .update(Buffer.from(parts[1], 'base64'))
    .update(rawPassword, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(digest));
}

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function jwt(user: DbUser) {
  const secret = env('JWT_SECRET') || env('DEADZONE_JWT_SECRET');
  if (!secret) {
    throw new Error('JWT secret is not configured.');
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ sub: user.id, username: user.username, exp }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function requireUserId(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const secret = env('JWT_SECRET') || env('DEADZONE_JWT_SECRET');
  if (!token || !secret) throw new HttpResponseError(text('Your session is invalid or expired.', 401));
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpResponseError(text('Your session is invalid or expired.', 401));
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) {
    throw new HttpResponseError(text('Your session is invalid or expired.', 401));
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpResponseError(text('Your session is invalid or expired.', 401));
  }
  return Number(payload.sub);
}

function verificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function sendVerificationEmail(to: string, code: string) {
  const resendKey = env('RESEND_API_KEY');
  const from = env('MAIL_FROM') || env('SMTP_USERNAME') || 'noreply@deadzone.local';
  const subject = `DeadZone verification code: ${code}`;
  const textBody = `DeadZone email verification\n\n${code}\n\nEnter this 6-digit code in the DeadZone verification screen.\nThe code expires in 15 minutes.`;

  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${resendKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text: textBody }),
    });
    if (!response.ok) {
      throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
    }
    return true;
  }

  const username = env('SMTP_USERNAME') || env('MAIL_FROM');
  const password = (env('SMTP_PASSWORD') || '').replace(/\s+/g, '');
  if (!username || !password) {
    throw new Error('SMTP settings are missing.');
  }

  const host = env('SMTP_HOST') || 'smtp.gmail.com';
  const port = Number(env('SMTP_PORT') || 465);
  const secure = port === 465 || env('SMTP_SSL_ENABLE') === 'true';
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: username, pass: password },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000,
  });
  await transporter.sendMail({ from, to, subject, text: textBody });
  return true;
}

async function sendVerificationEmailBestEffort(to: string, code: string) {
  try {
    return await sendVerificationEmail(to, code);
  } catch (error) {
    console.error('Could not send verification email.', error);
    return false;
  }
}

async function getList(client: pg.PoolClient, table: string, idColumn: string, userId: number) {
  const result = await client.query(
    `select ${idColumn} as value from ${table} where user_id = $1 order by sort_order asc`,
    [userId],
  );
  return result.rows.map((row) => row.value).filter(Boolean);
}

async function getMap(client: pg.PoolClient, table: string, keyColumn: string, valueColumn: string, userId: number) {
  const result = await client.query(
    `select ${keyColumn} as key, ${valueColumn} as value from ${table} where user_id = $1`,
    [userId],
  );
  return Object.fromEntries(result.rows.map((row) => [row.key, Number(row.value || 0)]));
}

async function userResponse(client: pg.PoolClient, user: DbUser) {
  const [
    ownedOutfits,
    ownedWeaponSkins,
    ownedGrenadeSkins,
    ownedAccessories,
    accessoryIds,
    claimed,
    mapPlays,
    weaponKills,
    weaponUpgrades,
  ] = await Promise.all([
    getList(client, 'user_owned_outfits', 'outfit_id', user.id),
    getList(client, 'user_owned_weapon_skins', 'skin_id', user.id),
    getList(client, 'user_owned_grenade_skins', 'skin_id', user.id),
    getList(client, 'user_owned_accessories', 'accessory_id', user.id),
    getList(client, 'user_equipped_accessories', 'accessory_id', user.id),
    getList(client, 'user_claimed_missions', 'mission_id', user.id),
    getMap(client, 'user_map_plays', 'map_id', 'plays', user.id),
    getMap(client, 'user_weapon_kills', 'weapon_id', 'kills', user.id),
    getMap(client, 'user_weapon_upgrades', 'weapon_id', 'upgrade_level', user.id),
  ]);
  const missionStats = user.mission_stats_json || JSON.stringify({ claimed, mapPlays, weaponKills });
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.email_verified,
    admin: user.admin,
    totalKills: user.total_kills,
    totalAssists: user.total_assists,
    totalDeaths: user.total_deaths,
    wallet: user.wallet,
    xp: user.xp,
    outfitId: user.outfit_id || DEFAULT_OUTFIT_ID,
    weaponId: user.weapon_id || DEFAULT_WEAPON_ID,
    weaponSkinId: user.weapon_skin_id || DEFAULT_WEAPON_SKIN_ID,
    grenadeSkinId: user.grenade_skin_id || DEFAULT_GRENADE_SKIN_ID,
    ownedOutfits: ownedOutfits.length ? ownedOutfits : [DEFAULT_OUTFIT_ID],
    ownedWeaponSkins: ownedWeaponSkins.length ? ownedWeaponSkins : [DEFAULT_WEAPON_SKIN_ID],
    ownedGrenadeSkins: ownedGrenadeSkins.length ? ownedGrenadeSkins : [DEFAULT_GRENADE_SKIN_ID],
    ownedAccessories,
    accessoryIds,
    weaponUpgrades,
    missionStats,
  };
}

async function findUser(client: pg.PoolClient, field: 'id' | 'username', value: number | string) {
  const result = await client.query<DbUser>(`select * from users where ${field} = $1`, [value]);
  return result.rows[0] || null;
}

async function findLoginUser(client: pg.PoolClient, identifier: string) {
  const normalized = identifier.trim();
  if (normalized.includes('@')) {
    const emailResult = await client.query<DbUser>(
      'select * from users where lower(email) = lower($1) order by id asc limit 1',
      [normalized],
    );
    if (emailResult.rows[0]) return emailResult.rows[0];
  }
  return findUser(client, 'username', normalized);
}

async function findGoogleUser(client: pg.PoolClient, subject: string, email: string) {
  const subjectResult = await client.query<DbUser>('select * from users where google_subject = $1 limit 1', [subject]);
  if (subjectResult.rows[0]) return subjectResult.rows[0];
  const emailResult = await client.query<DbUser>(
    'select * from users where lower(email) = lower($1) order by id asc limit 1',
    [email],
  );
  return emailResult.rows[0] || null;
}

async function uniqueGoogleUsername(client: pg.PoolClient, email: string, name: string) {
  const fallback = email.split('@', 1)[0] || 'google-player';
  const base = (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 24) || 'google-player';
  let candidate = base;
  let suffix = 2;
  while (await findUser(client, 'username', candidate)) {
    const ending = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 32 - ending.length))}${ending}`;
    suffix += 1;
  }
  return candidate;
}

async function seedDefaults(client: pg.PoolClient, userId: number) {
  await client.query('insert into user_owned_outfits (user_id, sort_order, outfit_id) values ($1, 0, $2) on conflict do nothing', [userId, DEFAULT_OUTFIT_ID]);
  await client.query('insert into user_owned_weapon_skins (user_id, sort_order, skin_id) values ($1, 0, $2) on conflict do nothing', [userId, DEFAULT_WEAPON_SKIN_ID]);
  await client.query('insert into user_owned_grenade_skins (user_id, sort_order, skin_id) values ($1, 0, $2) on conflict do nothing', [userId, DEFAULT_GRENADE_SKIN_ID]);
}

async function createVerification(client: pg.PoolClient, user: DbUser) {
  await client.query('delete from email_verification_tokens where user_id = $1 and used_at is null', [user.id]);
  const code = verificationCode();
  await client.query(
    "insert into email_verification_tokens (token, user_id, expires_at) values ($1, $2, now() + interval '15 minutes')",
    [code, user.id],
  );
  return code;
}

async function register(req: Request) {
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !email || !password) {
    return text('Username, email and password are required.', 400);
  }

  const client = await db().connect();
  let code = '';
  try {
    await client.query('begin');
    let user = await findUser(client, 'username', username);
    if (user && (user.email_verified || user.email.toLowerCase() !== email)) {
      await client.query('rollback');
      return text('Username is already taken!', 400);
    }
    if (user) {
      const result = await client.query<DbUser>(
        'update users set password = $1, email = $2 where id = $3 returning *',
        [hashPassword(password), email, user.id],
      );
      user = result.rows[0];
    } else {
      const result = await client.query<DbUser>(
        `insert into users (
          username, email, password, email_verified, total_kills, total_assists, total_deaths,
          wallet, xp, outfit_id, weapon_id, weapon_skin_id, grenade_skin_id, mission_stats_json, admin
        ) values ($1, $2, $3, false, 0, 0, 0, 0, 0, $4, $5, $6, $7, '', false) returning *`,
        [username, email, hashPassword(password), DEFAULT_OUTFIT_ID, DEFAULT_WEAPON_ID, DEFAULT_WEAPON_SKIN_ID, DEFAULT_GRENADE_SKIN_ID],
      );
      user = result.rows[0];
      await seedDefaults(client, user.id);
    }
    code = await createVerification(client, user);
    const responseUser = await userResponse(client, user);
    const token = jwt(user);
    await client.query('commit');
    const verificationEmailSent = await sendVerificationEmailBestEffort(email, code);
    return json({ token, user: responseUser, verificationEmailSent });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return text(error instanceof Error ? error.message : 'Could not create account.', 503);
  } finally {
    client.release();
  }
}

async function verifyEmail(req: Request) {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').replace(/\D/g, '');
  if (!email || !code) return text('Email and verification code are required.', 400);
  const client = await db().connect();
  try {
    await client.query('begin');
    const tokenResult = await client.query(
      `select t.id, t.user_id from email_verification_tokens t
       join users u on u.id = t.user_id
       where lower(u.email) = $1 and t.token = $2 and t.used_at is null and t.expires_at > now()
       order by t.expires_at desc limit 1`,
      [email, code],
    );
    if (!tokenResult.rows[0]) {
      await client.query('rollback');
      return text('Verification code is invalid.', 400);
    }
    await client.query('update email_verification_tokens set used_at = now() where id = $1', [tokenResult.rows[0].id]);
    const userResult = await client.query<DbUser>(
      'update users set email_verified = true, email_verified_at = now() where id = $1 returning *',
      [tokenResult.rows[0].user_id],
    );
    const responseUser = await userResponse(client, userResult.rows[0]);
    await client.query('commit');
    return json(responseUser);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return text(error instanceof Error ? error.message : 'Could not verify email.', 500);
  } finally {
    client.release();
  }
}

async function login(req: Request) {
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) return text('Username and password are required.', 400);
  const client = await db().connect();
  try {
    let user = await findLoginUser(client, username);
    if (!user || !passwordMatches(password, user.password)) {
      return text('Invalid username or password!', 401);
    }
    let verificationEmailSent = false;
    if (!user.email_verified) {
      const code = await createVerification(client, user);
      verificationEmailSent = await sendVerificationEmailBestEffort(user.email, code);
      const verified = await client.query<DbUser>(
        'update users set email_verified = true, email_verified_at = now() where id = $1 returning *',
        [user.id],
      );
      user = verified.rows[0] || user;
    }
    return json({ token: jwt(user), user: await userResponse(client, user), verificationEmailSent });
  } finally {
    client.release();
  }
}

async function googleLogin(req: Request) {
  const body = await readJson(req);
  const idToken = String(body.credential || body.idToken || body.token || '').trim();
  if (!idToken) return text('Google token is required.', 400);

  const configuredClientIds = (env('GOOGLE_CLIENT_IDS') || env('GOOGLE_CLIENT_ID') || env('VITE_GOOGLE_CLIENT_ID') || DEFAULT_GOOGLE_CLIENT_ID)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!configuredClientIds.length) return text('Google login is not configured.', 503);

  const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!tokenResponse.ok) return text('Google login token is invalid.', 401);
  const profile = await tokenResponse.json() as Record<string, unknown>;
  const audience = String(profile.aud || '');
  const subject = String(profile.sub || '').trim();
  const email = String(profile.email || '').trim().toLowerCase();
  const emailVerified = profile.email_verified === true || String(profile.email_verified || '').toLowerCase() === 'true';
  const name = String(profile.given_name || profile.name || '').trim();
  if (!configuredClientIds.includes(audience) || !subject || !email || !emailVerified) {
    return text('Google account could not be verified.', 401);
  }

  const client = await db().connect();
  try {
    await client.query('begin');
    let user = await findGoogleUser(client, subject, email);
    if (user) {
      const result = await client.query<DbUser>(
        `update users
         set google_subject = $1, email = $2, email_verified = true, email_verified_at = coalesce(email_verified_at, now())
         where id = $3 returning *`,
        [subject, email, user.id],
      );
      user = result.rows[0];
    } else {
      const username = await uniqueGoogleUsername(client, email, name);
      const result = await client.query<DbUser>(
        `insert into users (
          username, email, password, google_subject, email_verified, email_verified_at,
          total_kills, total_assists, total_deaths, wallet, xp,
          outfit_id, weapon_id, weapon_skin_id, grenade_skin_id, mission_stats_json, admin
        ) values ($1, $2, $3, $4, true, now(), 0, 0, 0, 0, 0, $5, $6, $7, $8, '', false) returning *`,
        [username, email, hashPassword(crypto.randomUUID()), subject, DEFAULT_OUTFIT_ID, DEFAULT_WEAPON_ID, DEFAULT_WEAPON_SKIN_ID, DEFAULT_GRENADE_SKIN_ID],
      );
      user = result.rows[0];
      await seedDefaults(client, user.id);
    }
    const responseUser = await userResponse(client, user);
    const token = jwt(user);
    await client.query('commit');
    return json({ token, user: responseUser, verificationEmailSent: false });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return text(error instanceof Error ? error.message : 'Could not complete Google login.', 500);
  } finally {
    client.release();
  }
}

async function me(req: Request) {
  const userId = requireUserId(req);
  const client = await db().connect();
  try {
    const user = await findUser(client, 'id', userId);
    if (!user) return text('User was not found.', 404);
    return json(await userResponse(client, user));
  } finally {
    client.release();
  }
}

async function progress(req: Request) {
  const userId = requireUserId(req);
  const body = await readJson(req);
  const client = await db().connect();
  try {
    const result = await client.query<DbUser>(
      `update users set
        wallet = coalesce($2, wallet),
        xp = greatest(xp, coalesce($3, xp)),
        total_kills = greatest(total_kills, coalesce($4, total_kills)),
        total_assists = greatest(total_assists, coalesce($5, total_assists)),
        total_deaths = greatest(total_deaths, coalesce($6, total_deaths)),
        outfit_id = coalesce($7, outfit_id),
        weapon_id = coalesce($8, weapon_id),
        weapon_skin_id = coalesce($9, weapon_skin_id),
        grenade_skin_id = coalesce($10, grenade_skin_id),
        mission_stats_json = coalesce($11, mission_stats_json)
       where id = $1 returning *`,
      [
        userId,
        body.wallet ?? null,
        body.xp ?? null,
        body.totalKills ?? null,
        body.totalAssists ?? null,
        body.totalDeaths ?? null,
        body.outfitId ?? null,
        body.weaponId ?? null,
        body.weaponSkinId ?? null,
        body.grenadeSkinId ?? null,
        body.missionStats ?? null,
      ],
    );
    if (!result.rows[0]) return text('User was not found.', 404);
    return json(await userResponse(client, result.rows[0]));
  } finally {
    client.release();
  }
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    if (req.method === 'POST' && path.endsWith('/api/auth/google')) return googleLogin(req);
    if (req.method === 'POST' && path.endsWith('/register')) return register(req);
    if (req.method === 'POST' && path.endsWith('/verify-email')) return verifyEmail(req);
    if (req.method === 'POST' && path.endsWith('/login')) return login(req);
    if (req.method === 'GET' && path.endsWith('/me')) return me(req);
    if (req.method === 'PATCH' && path.endsWith('/me/progress')) return progress(req);
    return text('Not found.', 404);
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    return text(error instanceof Error ? error.message : 'Server request failed.', 500);
  }
};

export const config: Config = {
  path: ['/api/users', '/api/users/*', '/api/auth/google'],
};
