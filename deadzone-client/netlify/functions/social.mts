import type { Config } from '@netlify/functions';
import { db, json, levelFromXp, readJson, requireUserId, roomResponse, text } from './_shared/deadzone.mts';

const PENDING = 'PENDING';
const ACCEPTED = 'ACCEPTED';
const DECLINED = 'DECLINED';

type UserRow = {
  id: string;
  username: string;
  xp: number;
};

function summary(user: UserRow) {
  return {
    id: Number(user.id),
    username: user.username,
    level: levelFromXp(Number(user.xp || 0)),
  };
}

async function requireUser(id: number) {
  const result = await db().query<UserRow>('select id, username, xp from users where id = $1', [id]);
  if (!result.rows[0]) throw text('Player was not found.', 404);
  return result.rows[0];
}

async function areFriends(firstId: number, secondId: number) {
  const first = Math.min(firstId, secondId);
  const second = Math.max(firstId, secondId);
  const result = await db().query(
    'select 1 from friendships where first_user_id = $1 and second_user_id = $2 limit 1',
    [first, second],
  );
  return Boolean(result.rows[0]);
}

async function requestView(row: Record<string, unknown>, otherUserId: number) {
  return {
    id: Number(row.id),
    user: summary(await requireUser(otherUserId)),
    createdAt: row.created_at,
  };
}

async function inviteView(row: Record<string, unknown>) {
  const roomResult = await db().query('select * from lobby_rooms where id = $1', [row.room_code]);
  if (!roomResult.rows[0]) return null;
  return {
    id: Number(row.id),
    sender: summary(await requireUser(Number(row.sender_id))),
    room: roomResponse(roomResult.rows[0]),
    createdAt: row.created_at,
  };
}

async function overview(req: Request) {
  const userId = requireUserId(req);
  await requireUser(userId);
  const [friendRows, incomingRows, outgoingRows, inviteRows] = await Promise.all([
    db().query(
      `select u.id, u.username, u.xp
       from friendships f
       join users u on u.id = case when f.first_user_id = $1 then f.second_user_id else f.first_user_id end
       where f.first_user_id = $1 or f.second_user_id = $1
       order by lower(u.username) asc`,
      [userId],
    ),
    db().query('select * from friend_requests where recipient_id = $1 and status = $2 order by created_at desc', [userId, PENDING]),
    db().query('select * from friend_requests where sender_id = $1 and status = $2 order by created_at desc', [userId, PENDING]),
    db().query(
      `select * from room_invitations
       where recipient_id = $1 and status = $2 and expires_at > now()
       order by created_at desc`,
      [userId, PENDING],
    ),
  ]);
  const roomInvites = (await Promise.all(inviteRows.rows.map(inviteView))).filter(Boolean);
  return json({
    friends: friendRows.rows.map(summary),
    incomingRequests: await Promise.all(incomingRows.rows.map((row) => requestView(row, Number(row.sender_id)))),
    outgoingRequests: await Promise.all(outgoingRows.rows.map((row) => requestView(row, Number(row.recipient_id)))),
    roomInvites,
  });
}

async function search(req: Request, url: URL) {
  const userId = requireUserId(req);
  const username = (url.searchParams.get('username') || '').trim();
  if (username.length < 2) return json([]);
  const result = await db().query<UserRow>(
    `select id, username, xp from users
     where id <> $1 and lower(username) like lower($2)
     order by lower(username) asc limit 10`,
    [userId, `%${username}%`],
  );
  return json(result.rows.map(summary));
}

async function sendFriendRequest(req: Request) {
  const senderId = requireUserId(req);
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const recipientResult = await db().query<UserRow>('select id, username, xp from users where username = $1', [username]);
  const recipient = recipientResult.rows[0];
  if (!recipient) return text('No player has that username.', 404);
  const recipientId = Number(recipient.id);
  if (senderId === recipientId) return text('You cannot add yourself.', 400);
  if (await areFriends(senderId, recipientId)) return text('This player is already your friend.', 409);

  const reverse = await db().query(
    'select id from friend_requests where sender_id = $1 and recipient_id = $2 and status = $3',
    [recipientId, senderId, PENDING],
  );
  if (reverse.rows[0]) {
    await acceptFriendRequest(req, Number(reverse.rows[0].id), senderId);
    return new Response(null, { status: 204 });
  }

  const pending = await db().query(
    'select 1 from friend_requests where sender_id = $1 and recipient_id = $2 and status = $3',
    [senderId, recipientId, PENDING],
  );
  if (pending.rows[0]) return text('A friend request is already waiting.', 409);

  await db().query(
    `insert into friend_requests (sender_id, recipient_id, status, created_at)
     values ($1, $2, $3, now())
     on conflict (sender_id, recipient_id)
     do update set status = excluded.status, created_at = excluded.created_at`,
    [senderId, recipientId, PENDING],
  );
  return new Response(null, { status: 204 });
}

async function acceptFriendRequest(req: Request, requestId: number, forcedUserId?: number) {
  const userId = forcedUserId ?? requireUserId(req);
  const client = await db().connect();
  try {
    await client.query('begin');
    const request = await client.query(
      'select * from friend_requests where id = $1 and recipient_id = $2 and status = $3 for update',
      [requestId, userId, PENDING],
    );
    if (!request.rows[0]) {
      await client.query('rollback');
      return text('This friend request is not available.', 403);
    }
    const senderId = Number(request.rows[0].sender_id);
    const recipientId = Number(request.rows[0].recipient_id);
    const first = Math.min(senderId, recipientId);
    const second = Math.max(senderId, recipientId);
    await client.query('update friend_requests set status = $2 where id = $1', [requestId, ACCEPTED]);
    await client.query(
      'insert into friendships (first_user_id, second_user_id, created_at) values ($1, $2, now()) on conflict do nothing',
      [first, second],
    );
    await client.query('commit');
    return new Response(null, { status: 204 });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function declineFriendRequest(req: Request, requestId: number) {
  const userId = requireUserId(req);
  const result = await db().query(
    'update friend_requests set status = $1 where id = $2 and recipient_id = $3 and status = $4 returning id',
    [DECLINED, requestId, userId, PENDING],
  );
  if (!result.rows[0]) return text('This friend request is not available.', 403);
  return new Response(null, { status: 204 });
}

async function inviteToRoom(req: Request) {
  const senderId = requireUserId(req);
  const body = await readJson(req);
  const friendId = Number(body.friendId);
  const roomCode = String(body.roomCode || '').trim().toUpperCase();
  if (!friendId || !roomCode) return text('Friend and room are required.', 400);
  if (!(await areFriends(senderId, friendId))) return text('You can only invite players from your friends list.', 403);
  const room = await db().query('select * from lobby_rooms where upper(id) = upper($1)', [roomCode]);
  if (!room.rows[0]) return text('No open room matches that game code.', 404);
  if (Number(room.rows[0].players || 0) >= Number(room.rows[0].max_players || 10)) return text('This room is already full.', 409);
  const pending = await db().query(
    'select 1 from room_invitations where sender_id = $1 and recipient_id = $2 and room_code = $3 and status = $4',
    [senderId, friendId, room.rows[0].id, PENDING],
  );
  if (pending.rows[0]) return text('This friend already has an invitation to the room.', 409);
  await db().query(
    `insert into room_invitations (sender_id, recipient_id, room_code, status, created_at, expires_at)
     values ($1, $2, $3, $4, now(), now() + interval '30 minutes')`,
    [senderId, friendId, room.rows[0].id, PENDING],
  );
  return new Response(null, { status: 204 });
}

async function acceptRoomInvite(req: Request, invitationId: number) {
  const userId = requireUserId(req);
  const client = await db().connect();
  try {
    await client.query('begin');
    const invite = await client.query(
      'select * from room_invitations where id = $1 and recipient_id = $2 and status = $3 for update',
      [invitationId, userId, PENDING],
    );
    if (!invite.rows[0]) {
      await client.query('rollback');
      return text('This room invitation is not available.', 403);
    }
    if (new Date(invite.rows[0].expires_at).getTime() <= Date.now()) {
      await client.query('update room_invitations set status = $1 where id = $2', [DECLINED, invitationId]);
      await client.query('commit');
      return text('This room invitation has expired.', 410);
    }
    const room = await client.query('select * from lobby_rooms where id = $1', [invite.rows[0].room_code]);
    if (!room.rows[0]) {
      await client.query('rollback');
      return text('No open room matches that game code.', 404);
    }
    if (Number(room.rows[0].players || 0) >= Number(room.rows[0].max_players || 10)) {
      await client.query('rollback');
      return text('This room is already full.', 409);
    }
    await client.query('update room_invitations set status = $1 where id = $2', [ACCEPTED, invitationId]);
    await client.query('commit');
    return json(roomResponse(room.rows[0]));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function declineRoomInvite(req: Request, invitationId: number) {
  const userId = requireUserId(req);
  const result = await db().query(
    'update room_invitations set status = $1 where id = $2 and recipient_id = $3 and status = $4 returning id',
    [DECLINED, invitationId, userId, PENDING],
  );
  if (!result.rows[0]) return text('This room invitation is not available.', 403);
  return new Response(null, { status: 204 });
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);
    if (req.method === 'GET' && segments.length === 2) return overview(req);
    if (req.method === 'GET' && segments[2] === 'users') return search(req, url);
    if (req.method === 'POST' && segments[2] === 'friend-requests' && segments.length === 3) return sendFriendRequest(req);
    if (req.method === 'POST' && segments[2] === 'friend-requests' && segments[4] === 'accept') return acceptFriendRequest(req, Number(segments[3]));
    if (req.method === 'DELETE' && segments[2] === 'friend-requests') return declineFriendRequest(req, Number(segments[3]));
    if (req.method === 'POST' && segments[2] === 'room-invites' && segments.length === 3) return inviteToRoom(req);
    if (req.method === 'POST' && segments[2] === 'room-invites' && segments[4] === 'accept') return acceptRoomInvite(req, Number(segments[3]));
    if (req.method === 'DELETE' && segments[2] === 'room-invites') return declineRoomInvite(req, Number(segments[3]));
    return text('Not found.', 404);
  } catch (error) {
    if (error instanceof Response) return error;
    return text(error instanceof Error ? error.message : 'Social request failed.', 500);
  }
};

export const config: Config = {
  path: ['/api/social', '/api/social/*'],
};
