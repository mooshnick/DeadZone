const API_BASE = 'http://127.0.0.1:8080/api/users';
const localUsersKey = 'deadzone-local-users';

function readLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(localUsersKey)) || [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users) {
  localStorage.setItem(localUsersKey, JSON.stringify(users));
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    admin: user.admin || false,
    totalKills: user.totalKills || 0,
    totalAssists: user.totalAssists || 0,
    totalDeaths: user.totalDeaths || 0,
    wallet: user.wallet || 0,
    xp: user.xp || 0,
    outfitId: user.outfitId || 'classic',
    weaponSkinId: user.weaponSkinId || 'standard',
    weaponUpgrades: user.weaponUpgrades || {},
    ownedOutfits: user.ownedOutfits || ['classic'],
    ownedWeaponSkins: user.ownedWeaponSkins || ['standard'],
  };
}

function adminTestUser() {
  return {
    id: 'local-admin-test',
    username: 'test',
    password: '1234',
    admin: true,
    totalKills: 99999,
    totalAssists: 99999,
    totalDeaths: 0,
    wallet: 1000000000,
    xp: 10000000,
    outfitId: 'gold',
    weaponSkinId: 'goldline',
    weaponUpgrades: { rifle: 10, shotgun: 10, smg: 10, sniper: 10, blaster: 10, rpg: 10 },
    ownedOutfits: ['classic', 'shadow', 'neon', 'forest', 'gold', 'lava', 'knight', 'striker'],
    ownedWeaponSkins: ['standard', 'ember', 'arctic', 'toxic', 'royal', 'goldline'],
  };
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Server request failed');
  }

  return response.json();
}

export function registerUser(username, password) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).catch(() => {
    const users = readLocalUsers();
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username is already taken!');
    }
    const user = {
      id: `local-${crypto.randomUUID?.() || Date.now()}`,
      username,
      password,
      wallet: 0,
      totalKills: 0,
      totalAssists: 0,
      totalDeaths: 0,
      xp: 0,
      outfitId: 'classic',
      weaponSkinId: 'standard',
      ownedOutfits: ['classic'],
      ownedWeaponSkins: ['standard'],
    };
    writeLocalUsers([...users, user]);
    return publicUser(user);
  });
}

export function loginUser(username, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).catch(() => {
    if (username === 'test' && password === '1234') {
      const users = readLocalUsers().filter((user) => user.username !== 'test');
      const testUser = adminTestUser();
      writeLocalUsers([...users, testUser]);
      return publicUser(testUser);
    }
    const user = readLocalUsers().find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!user || user.password !== password) {
      throw new Error('Invalid username or password!');
    }
    return publicUser(user);
  });
}

export function loadUser(userId) {
  return request(`/${userId}`).catch(() => {
    const user = readLocalUsers().find((item) => String(item.id) === String(userId));
    if (!user) {
      throw new Error('Saved account was not found.');
    }
    return publicUser(user);
  });
}

export function saveUserProgress(userId, progress) {
  const serverSave = String(userId).startsWith('local-')
    ? Promise.reject(new Error('Local account'))
    : request(`/${userId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify(progress),
  });

  return serverSave.catch(() => {
    const users = readLocalUsers();
    const index = users.findIndex((item) => String(item.id) === String(userId));
    if (index === -1) {
      throw new Error('Saved account was not found.');
    }
    users[index] = { ...users[index], ...progress };
    writeLocalUsers(users);
    return publicUser(users[index]);
  });
}
