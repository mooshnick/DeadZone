import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoomOnServer, fetchRooms, findRoomByCode, joinRoomOnServer, leaveRoomOnServer } from '../api/rooms';
import { clearSession, hasSession, loadUser, loginUser, loginWithGoogle, registerUser, saveUserProgress, verifyEmail } from '../api/users';
import {
  acceptFriendRequest,
  acceptRoomInvite,
  declineFriendRequest,
  declineRoomInvite,
  fetchSocialOverview,
  inviteFriendToRoom,
  searchPlayers,
  sendFriendRequest,
} from '../api/social';
import { GameWorld } from '../game/GameWorld';
import { ACCESSORIES, DEFAULT_GAME_MODE, GAME_MODE_RULES, GRENADE_SKINS, levelForXp, MAPS, MISSIONS, OUTFITS, WEAPONS, WEAPON_SKINS, xpForLevel } from '../game/config';
import { makeId } from '../game/utils';
import {
  ADMIN_WALLET,
  ADMIN_XP,
  DEFAULT_KEYBINDS,
  keybindsKeyForUser,
  loadKeybindsForUser,
  starterRooms,
} from './appConstants';

const ROUTES = {
  auth: '/auth',
  login: '/login',
  register: '/register',
  main: '/menu',
  player: '/my-player',
  settings: '/settings',
  play: '/rooms',
  create: '/rooms/new',
  match: '/game',
  verifyEmail: '/verify-email',
};

const DAILY_MISSION_COUNT = 3;
const EMPTY_MISSION_STATS = {
  activeMissionIds: [],
  claimed: [],
  dayKey: '',
  mapPlays: {},
  rerolls: { dayKey: '', count: 0 },
  totalAssists: 0,
  totalKills: 0,
  weaponKills: {},
};

function normalizeRoom(room, fallback = {}) {
  const gameMode = room?.gameMode || fallback.gameMode || DEFAULT_GAME_MODE;
  const rules = GAME_MODE_RULES[gameMode] || GAME_MODE_RULES[DEFAULT_GAME_MODE];
  return {
    ...fallback,
    ...room,
    gameMode,
    scoreLimit: room?.scoreLimit || fallback.scoreLimit || rules.defaultScore,
    timeLimitMinutes: room?.timeLimitMinutes || fallback.timeLimitMinutes || 20,
  };
}

function parseMissionStats(value) {
  if (!value) return normalizeMissionStats(EMPTY_MISSION_STATS);
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return normalizeMissionStats({
      activeMissionIds: Array.isArray(parsed.activeMissionIds) ? parsed.activeMissionIds : [],
      claimed: Array.isArray(parsed.claimed) ? parsed.claimed : [],
      dayKey: typeof parsed.dayKey === 'string' ? parsed.dayKey : '',
      mapPlays: parsed.mapPlays && typeof parsed.mapPlays === 'object' ? parsed.mapPlays : {},
      rerolls: parsed.rerolls && typeof parsed.rerolls === 'object' ? parsed.rerolls : { dayKey: '', count: 0 },
      totalAssists: Number(parsed.totalAssists) || 0,
      totalKills: Number(parsed.totalKills) || 0,
      weaponKills: parsed.weaponKills && typeof parsed.weaponKills === 'object' ? parsed.weaponKills : {},
    });
  } catch {
    return normalizeMissionStats(EMPTY_MISSION_STATS);
  }
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function msUntilNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now.getTime());
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function pickMissionIds(count, blockedIds = []) {
  const blocked = new Set(blockedIds);
  const candidates = MISSIONS.filter((mission) => !blocked.has(mission.id));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((mission) => mission.id);
}

function normalizeMissionStats(stats) {
  const currentDay = todayKey();
  const claimed = Array.isArray(stats.claimed) ? [...new Set(stats.claimed)] : [];
  const claimedSet = new Set(claimed);
  const previousActiveIds = Array.isArray(stats.activeMissionIds) ? stats.activeMissionIds : [];
  const activeMissionIds = previousActiveIds.filter((id) => MISSIONS.some((mission) => mission.id === id));
  const shouldRefreshCompletedSlots = stats.dayKey && stats.dayKey !== currentDay;
  const carriedActiveIds = shouldRefreshCompletedSlots
    ? activeMissionIds.filter((id) => !claimedSet.has(id))
    : activeMissionIds;
  const nextActiveIds = [...carriedActiveIds];
  if (nextActiveIds.length < DAILY_MISSION_COUNT) {
    nextActiveIds.push(...pickMissionIds(DAILY_MISSION_COUNT - nextActiveIds.length, [
      ...nextActiveIds,
      ...(shouldRefreshCompletedSlots ? [] : claimed),
    ]));
  }
  return {
    activeMissionIds: nextActiveIds.slice(0, DAILY_MISSION_COUNT),
    claimed: shouldRefreshCompletedSlots ? [] : claimed,
    dayKey: currentDay,
    mapPlays: { ...(stats.mapPlays || {}) },
    rerolls: {
      dayKey: stats.rerolls?.dayKey === currentDay ? currentDay : currentDay,
      count: stats.rerolls?.dayKey === currentDay ? Number(stats.rerolls?.count) || 0 : 0,
    },
    totalAssists: Number(stats.totalAssists) || 0,
    totalKills: Number(stats.totalKills) || 0,
    weaponKills: { ...(stats.weaponKills || {}) },
  };
}

function missionProgress(mission, stats) {
  if (mission.type === 'kills') return stats.totalKills || 0;
  if (mission.type === 'assists') return stats.totalAssists || 0;
  if (mission.type === 'weaponKills') return stats.weaponKills?.[mission.weaponId] || 0;
  if (mission.type === 'mapPlays') return stats.mapPlays?.[mission.mapId] || 0;
  return 0;
}

function rerollCost(count = 0) {
  if (count <= 0) return 0;
  return 50 * count;
}

function routeStateFromPath(pathname = window.location.pathname) {
  switch (pathname) {
    case ROUTES.auth:
      return { screen: 'auth', authMode: null };
    case ROUTES.register:
      return { screen: 'auth', authMode: 'register' };
    case ROUTES.login:
      return { screen: 'auth', authMode: 'login' };
    case ROUTES.verifyEmail:
      return { screen: 'verify-email', token: new URLSearchParams(window.location.search).get('token') || '' };
    case ROUTES.player:
      return { screen: 'lobby', panel: 'player' };
    case ROUTES.settings:
      return { screen: 'lobby', panel: 'settings' };
    case ROUTES.play:
      return { screen: 'lobby', panel: 'play' };
    case ROUTES.create:
      return { screen: 'lobby', panel: 'create' };
    case ROUTES.match:
      return { screen: 'match', panel: 'play' };
    case ROUTES.main:
    default:
      return { screen: 'lobby', panel: 'main' };
  }
}

function routeForPanel(panel) {
  return ROUTES[panel] || ROUTES.main;
}

function updateRoute(path, replace = false) {
  if (window.location.pathname === path) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
}

export function useDeadzoneController() {
  const [screen, setScreen] = useState('loading');
  const [panel, setPanel] = useState('main');
  const [authMode, setAuthMode] = useState(() => routeStateFromPath().authMode || null);
  const [rooms, setRooms] = useState(starterRooms);
  const [selectedRoomId, setSelectedRoomId] = useState(starterRooms[0].id);
  const [roomDraft, setRoomDraft] = useState({
    name: 'Custom Arena',
    mapId: 'foundry',
    gameMode: DEFAULT_GAME_MODE,
    scoreLimit: GAME_MODE_RULES[DEFAULT_GAME_MODE].defaultScore,
    timeLimitMinutes: 20,
    maxPlayers: 10,
    allowBots: true,
  });
  const [name, setName] = useState('Player ' + makeId().toUpperCase().slice(0, 3));
  const [account, setAccount] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
  });
  const [accountStatus, setAccountStatus] = useState('');
  const [lobbyStatus, setLobbyStatus] = useState('');
  const [team, setTeam] = useState('blue');
  const [weaponId, setWeaponId] = useState('rifle');
  const [outfitId, setOutfitId] = useState('classic');
  const [weaponSkinId, setWeaponSkinId] = useState('standard');
  const [grenadeSkinId, setGrenadeSkinId] = useState('standard');
  const [accessoryIds, setAccessoryIds] = useState([]);
  const [score, setScore] = useState({ blue: 0, red: 0, players: [] });
  const [wallet, setWallet] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  const [totalAssists, setTotalAssists] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [ownedOutfits, setOwnedOutfits] = useState(['classic']);
  const [ownedWeaponSkins, setOwnedWeaponSkins] = useState(['standard']);
  const [ownedGrenadeSkins, setOwnedGrenadeSkins] = useState(['standard']);
  const [ownedAccessories, setOwnedAccessories] = useState([]);
  const [weaponUpgrades, setWeaponUpgrades] = useState({});
  const [missionStats, setMissionStats] = useState(EMPTY_MISSION_STATS);
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const [previewWeaponSkin, setPreviewWeaponSkin] = useState(null);
  const [previewGrenadeSkin, setPreviewGrenadeSkin] = useState(null);
  const [previewAccessory, setPreviewAccessory] = useState(null);
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
  const [editingKeybind, setEditingKeybind] = useState(null);
  const [events, setEvents] = useState(['Choose a room and enter the 3D arena.']);
  const [activeBuffs, setActiveBuffs] = useState('No buffs');
  const [isScoped, setIsScoped] = useState(false);
  const [ammo, setAmmo] = useState({ ammo: 0, magazineSize: 0, reloading: false, reloadProgress: 1 });
  const [health, setHealth] = useState(100);
  const [deathInfo, setDeathInfo] = useState({ isDead: false, ready: false, seconds: 0, killerName: '', focusSeconds: 0 });
  const [grenadeCharge, setGrenadeCharge] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [missionClock, setMissionClock] = useState(Date.now());
  const [social, setSocial] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    roomInvites: [],
  });
  const [playerSearchResults, setPlayerSearchResults] = useState([]);

  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const keys = useRef(new Set());
  const mouse = useRef({ down: false });
  const localId = useMemo(() => 'player-' + makeId(), []);
  const matchConfig = useRef({ name, team, weaponId, mapId: 'foundry', gameMode: DEFAULT_GAME_MODE, maps: MAPS, maxPlayers: 10, outfitId, accessoryIds, weaponSkinId, keybinds, money: wallet });

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  const selectedMap = MAPS.find((map) => map.id === selectedRoom?.mapId) || MAPS[0];
  const selectedOutfit = OUTFITS.find((outfit) => outfit.id === outfitId) || OUTFITS[0];
  const previewedOutfit = previewOutfit || selectedOutfit;
  const selectedWeaponSkin = WEAPON_SKINS.find((skin) => skin.id === weaponSkinId) || WEAPON_SKINS[0];
  const selectedGrenadeSkin = GRENADE_SKINS.find((skin) => skin.id === grenadeSkinId) || GRENADE_SKINS[0];
  const previewedWeaponSkin = previewWeaponSkin || selectedWeaponSkin;
  const previewedGrenadeSkin = previewGrenadeSkin || selectedGrenadeSkin;
  const equippedAccessories = accessoryIds.map((id) => ACCESSORIES.find((item) => item.id === id)).filter(Boolean);
  const previewedAccessories = previewAccessory
    ? [...equippedAccessories.filter((item) => item.slot !== previewAccessory.slot), previewAccessory]
    : equippedAccessories;
  const level = levelForXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const levelProgress = nextLevelXp === currentLevelXp ? 0 : Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
  const normalizedMissionStats = useMemo(() => normalizeMissionStats(missionStats), [missionStats, missionClock]);
  const missionResetCountdown = formatCountdown(msUntilNextMidnight());
  const missionCards = normalizedMissionStats.activeMissionIds
    .map((missionId) => MISSIONS.find((mission) => mission.id === missionId))
    .filter(Boolean)
    .map((mission) => {
    const progress = missionProgress(mission, normalizedMissionStats);
    const claimed = normalizedMissionStats.claimed.includes(mission.id);
    return {
      ...mission,
      claimed,
      ready: !claimed && progress >= mission.target,
      rerollCost: rerollCost(normalizedMissionStats.rerolls.count),
      resetCountdown: missionResetCountdown,
      progress,
      percent: Math.min(100, Math.round((progress / mission.target) * 100)),
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMissionClock(Date.now());
      setMissionStats((current) => normalizeMissionStats(current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const applyBrowserRoute = () => {
      const route = routeStateFromPath();
      if (route.screen === 'auth') {
        setAuthMode(route.authMode);
        if (!account) {
          setScreen('auth');
        }
        return;
      }
      if (route.screen === 'match') {
        setPanel('play');
        if (account) setScreen('match');
        return;
      }
      setPanel(route.panel || 'main');
      if (account) setScreen('lobby');
    };

    window.addEventListener('popstate', applyBrowserRoute);
    return () => window.removeEventListener('popstate', applyBrowserRoute);
  }, [account]);

  useEffect(() => {
    const route = routeStateFromPath();
    if (route.screen === 'verify-email') {
      clearSession();
      setScreen('auth');
      setAuthMode('verify');
      setAccountStatus('Enter the 6-digit code from your email.');
      updateRoute(ROUTES.auth, true);
      return;
    }

    if (!hasSession()) {
      if (route.screen !== 'auth') {
        updateRoute(ROUTES.auth, true);
        setAuthMode(null);
      } else {
        setAuthMode(route.authMode || null);
      }
      setScreen('auth');
      return;
    }

    loadUser()
      .then((user) => {
        const restoredRoute = routeStateFromPath();
        applyUser(user, 'Session restored.');
        if (restoredRoute.screen === 'auth') {
          setPanel('main');
          setScreen('lobby');
          updateRoute(ROUTES.main, true);
          return;
        }
        setPanel(restoredRoute.panel || 'main');
        if (restoredRoute.screen === 'match') {
          const room = starterRooms[0];
          const restoredWeaponId = WEAPONS[user.weaponId] ? user.weaponId : 'rifle';
          const restoredTeam = autoTeamForRoom(room);
          setSelectedRoomId(room.id);
          setTeam(restoredTeam);
          matchConfig.current = {
            name: user.username,
            team: restoredTeam,
            weaponId: restoredWeaponId,
            outfitId: user.outfitId || 'classic',
            accessoryIds: user.accessoryIds || [],
            weaponSkinId: user.weaponSkinId || 'standard',
            weaponLevel: user.weaponUpgrades?.[restoredWeaponId] || 0,
            mapId: room.mapId,
            gameMode: room.gameMode || DEFAULT_GAME_MODE,
            scoreLimit: room.scoreLimit,
            timeLimitMinutes: room.timeLimitMinutes,
            maps: MAPS,
            maxPlayers: room.maxPlayers,
            allowBots: room.allowBots,
            keybinds: loadKeybindsForUser(user),
            onProgressChange: handleProgressChange,
            money: user.admin ? ADMIN_WALLET : user.wallet || 0,
          };
        }
        setScreen(restoredRoute.screen === 'match' ? 'match' : 'lobby');
      })
      .catch(() => {
        clearSession();
        setAccountStatus('Your saved session expired. Please log in again.');
        setAuthMode(null);
        updateRoute(ROUTES.auth, true);
        setScreen('auth');
      });
  }, []);

  useEffect(() => {
    if (!account || screen !== 'lobby') return undefined;
    let active = true;
    const refreshLobby = () => {
      Promise.all([fetchRooms(), fetchSocialOverview()])
        .then(([openRooms, socialOverview]) => {
          if (!active) return;
        const normalizedRooms = openRooms.map((room) => normalizeRoom(room));
        setRooms(normalizedRooms);
          setSocial(socialOverview);
        setSelectedRoomId((current) => (
          normalizedRooms.some((room) => room.id === current) ? current : normalizedRooms[0]?.id || ''
        ));
      })
        .catch((error) => {
          if (active) setAccountStatus(error.message);
        });
    };
    refreshLobby();
    const timer = window.setInterval(refreshLobby, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [account, screen]);

  useEffect(() => {
    if (!editingKeybind) return undefined;
    const capture = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setKeybinds((current) => {
        const next = { ...current, [editingKeybind]: event.code };
        if (account) {
          localStorage.setItem(keybindsKeyForUser(account), JSON.stringify(next));
        }
        return next;
      });
      setEditingKeybind(null);
    };
    window.addEventListener('keydown', capture, { capture: true });
    return () => window.removeEventListener('keydown', capture, { capture: true });
  }, [account, editingKeybind]);

  useEffect(() => {
    const down = (event) => {
      if (screen === 'match' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) {
        event.preventDefault();
      }
      if (screen === 'match' && event.code === 'Tab') {
        setShowScoreboard(true);
      }
      keys.current.add(event.code);
    };
    const up = (event) => {
      if (event.code === 'Tab') {
        setShowScoreboard(false);
      }
      keys.current.delete(event.code);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== 'match' || !canvasRef.current) {
      return undefined;
    }

    const world = new GameWorld({
      canvas: canvasRef.current,
      config: matchConfig.current,
      localId,
      keys,
      mouse,
      onScoreChange: setScore,
      onBuffsChange: setActiveBuffs,
      onAmmoChange: setAmmo,
      onDeathChange: setDeathInfo,
      onHealthChange: setHealth,
      onWalletChange: handleWalletChange,
      onScopeChange: setIsScoped,
      onGrenadeChargeChange: setGrenadeCharge,
      onMatchEnd: setMatchResult,
      onEvent: (message) => setEvents((items) => [message, ...items].slice(0, 5)),
    });

    try {
      worldRef.current = world;
      world.start();
    } catch (error) {
      console.error(error);
      setEvents((items) => [`World start failed: ${(error.stack || error.message).slice(0, 220)}`, ...items].slice(0, 5));
    }
    return () => {
      world.dispose();
      worldRef.current = null;
    };
    // The world should not restart during a match when wallet/progress callbacks update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId, screen]);

  function applyUser(user, message) {
    if (!user?.username) {
      throw new Error('The login response did not include a valid user.');
    }
    setAccount(user);
    setName(user.username);
    setWallet(user.admin ? ADMIN_WALLET : user.wallet || 0);
    setXp(user.admin ? ADMIN_XP : user.xp || 0);
    setTotalKills(user.totalKills || 0);
    setTotalAssists(user.totalAssists || 0);
    setTotalDeaths(user.totalDeaths || 0);
    setOwnedOutfits(user.ownedOutfits || ['classic']);
    setOwnedWeaponSkins(user.ownedWeaponSkins || ['standard']);
    setOwnedGrenadeSkins(user.ownedGrenadeSkins || ['standard']);
    setOwnedAccessories(user.ownedAccessories || []);
    setWeaponUpgrades(user.weaponUpgrades || {});
    setOutfitId(user.outfitId || 'classic');
    setAccessoryIds(user.accessoryIds || []);
    setWeaponId(WEAPONS[user.weaponId] ? user.weaponId : 'rifle');
    setWeaponSkinId(user.weaponSkinId || 'standard');
    setGrenadeSkinId(user.grenadeSkinId || 'standard');
    setMissionStats(parseMissionStats(user.missionStats));
    setKeybinds(loadKeybindsForUser(user));
    setAccountStatus(message);
  }

  function saveProgress(progress) {
    const normalizedProgress = account?.admin
      ? { ...progress, wallet: ADMIN_WALLET, xp: ADMIN_XP }
      : progress;
    if (!account?.id) return;
    saveUserProgress(normalizedProgress).catch(() => {
      setAccountStatus('Could not save player progress.');
    });
  }

  function handleWalletChange(amount) {
    const nextWallet = account?.admin ? ADMIN_WALLET : amount;
    setWallet(nextWallet);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId });
  }

  function handleProgressChange(progress) {
    const nextTotalKills = progress.reason === 'kill' ? totalKills + 1 : totalKills;
    const nextTotalAssists = progress.reason === 'assist' ? totalAssists + 1 : totalAssists;
    const nextMissionStats = normalizeMissionStats(missionStats);
    if (progress.reason === 'kill') {
      nextMissionStats.totalKills = (nextMissionStats.totalKills || 0) + 1;
    }
    if (progress.reason === 'assist') {
      nextMissionStats.totalAssists = (nextMissionStats.totalAssists || 0) + 1;
    }
    if (progress.reason === 'kill' && progress.weaponId) {
      nextMissionStats.weaponKills[progress.weaponId] = (nextMissionStats.weaponKills[progress.weaponId] || 0) + 1;
    }
    setMissionStats(nextMissionStats);
    const walletBase = progress.wallet ?? wallet;
    const nextWallet = account?.admin ? ADMIN_WALLET : walletBase;
    setWallet(nextWallet);
    setTotalKills(nextTotalKills);
    setTotalAssists(nextTotalAssists);
    setXp((currentXp) => {
      const nextXp = account?.admin ? ADMIN_XP : currentXp + progress.xp;
      saveProgress({
        wallet: nextWallet,
        xp: nextXp,
        totalKills: nextTotalKills,
        totalAssists: nextTotalAssists,
        totalDeaths,
        ownedOutfits,
        ownedWeaponSkins,
        ownedGrenadeSkins,
        ownedAccessories,
        accessoryIds,
        weaponUpgrades,
        outfitId,
        weaponId,
        weaponSkinId,
        grenadeSkinId,
        missionStats: JSON.stringify(nextMissionStats),
      });
      return nextXp;
    });
    const readyMissions = nextMissionStats.activeMissionIds
      .map((missionId) => MISSIONS.find((mission) => mission.id === missionId))
      .filter((mission) => mission && !nextMissionStats.claimed.includes(mission.id) && missionProgress(mission, nextMissionStats) >= mission.target)
      .map((mission) => `Mission ready: ${mission.title}`);
    setEvents((items) => [`+${progress.xp} XP for ${progress.reason}`, ...readyMissions, ...items].slice(0, 5));
  }

  async function handleAccountAction(action) {
    const username = credentials.username.trim();
    const password = credentials.password;
    if (action === 'verify') {
      if (!credentials.email.trim() || !credentials.verificationCode.trim()) {
        setAccountStatus('Enter your email and 6-digit verification code.');
        return;
      }
      try {
        await verifyEmail(credentials.email.trim(), credentials.verificationCode.trim());
        setCredentials({ username: '', email: credentials.email.trim(), password: '', confirmPassword: '', verificationCode: '' });
        setAuthMode('login');
        setAccountStatus('Email verified. You can log in now.');
      } catch (error) {
        setAccountStatus(error.message);
      }
      return;
    }
    if (!username || !password) {
      setAccountStatus('Enter username and password first.');
      return;
    }
    if (action === 'register' && !credentials.email.trim()) {
      setAccountStatus('Enter an email address.');
      return;
    }
    if (action === 'register' && password !== credentials.confirmPassword) {
      setAccountStatus('Passwords do not match.');
      return;
    }
    try {
      const user = action === 'register'
        ? await registerUser(username, credentials.email.trim(), password)
        : await loginUser(username, password);
      if (action === 'register' && !user.emailVerified) {
        setCredentials({ username: '', email: credentials.email.trim(), password: '', confirmPassword: '', verificationCode: '' });
        setAuthMode('verify');
        setScreen('auth');
        setAccountStatus(user.verificationEmailSent
          ? 'Account created. Enter the 6-digit code we sent to your email.'
          : 'Account created. SMTP is not configured locally. Check the backend terminal for your 6-digit code.');
        return;
      }
      applyUser(user, action === 'register' ? 'Account created and saved.' : 'Logged in.');
      setCredentials({ username: '', email: '', password: '', confirmPassword: '', verificationCode: '' });
      setPanel('main');
      setScreen('lobby');
      updateRoute(ROUTES.main, true);
    } catch (error) {
      if (String(error.message || '').includes('6-digit code')) {
        setAuthMode('verify');
      }
      setAccountStatus(error.message);
    }
  }

  async function handleGoogleLogin(idToken) {
    if (!idToken) {
      setAccountStatus('Google login did not return a valid token.');
      return;
    }
    try {
      const user = await loginWithGoogle(idToken);
      applyUser(user, 'Logged in with Google.');
      setCredentials({ username: '', email: '', password: '', confirmPassword: '', verificationCode: '' });
      setPanel('main');
      setScreen('lobby');
      updateRoute(ROUTES.main, true);
    } catch (error) {
      setAccountStatus(error.message);
    }
  }

  function signOut() {
    setAccount(null);
    clearSession();
    setCredentials({ username: '', email: '', password: '', confirmPassword: '', verificationCode: '' });
    setKeybinds(DEFAULT_KEYBINDS);
    setEditingKeybind(null);
    setPanel('main');
    setScreen('auth');
    setAuthMode(null);
    updateRoute(ROUTES.auth, true);
    setAccountStatus('You have been logged out.');
  }

  function updateKeybind(action, code) {
    const next = { ...keybinds, [action]: code };
    setKeybinds(next);
    if (account) {
      localStorage.setItem(keybindsKeyForUser(account), JSON.stringify(next));
    }
    setEditingKeybind(null);
  }

  function resetKeybinds() {
    setKeybinds(DEFAULT_KEYBINDS);
    if (account) {
      localStorage.setItem(keybindsKeyForUser(account), JSON.stringify(DEFAULT_KEYBINDS));
    }
    setEditingKeybind(null);
  }

  function openPanel(nextPanel, replace = false) {
    if (nextPanel === 'create' || nextPanel === 'play') {
      setLobbyStatus('');
    }
    if (nextPanel === 'create') {
      setAccountStatus('');
    }
    setPanel(nextPanel);
    setScreen('lobby');
    updateRoute(routeForPanel(nextPanel), replace);
  }

  function openAuthMode(nextMode) {
    setAuthMode(nextMode);
    setScreen('auth');
    updateRoute(nextMode === 'register' ? ROUTES.register : nextMode === 'login' ? ROUTES.login : ROUTES.auth);
  }

  function equipOwnedOutfitDuringMatch(nextOutfitId) {
    if (!ownedOutfits.includes(nextOutfitId)) return;
    setOutfitId(nextOutfitId);
    matchConfig.current.outfitId = nextOutfitId;
    worldRef.current?.updateLocalCosmetics({
      outfitId: nextOutfitId,
      accessoryIds,
      weaponSkinId,
    });
    saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId: nextOutfitId, weaponId, weaponSkinId, grenadeSkinId });
  }

  function toggleOwnedAccessoryDuringMatch(accessory) {
    if (!ownedAccessories.includes(accessory.id)) return;
    const hasAccessory = accessoryIds.includes(accessory.id);
    const nextAccessoryIds = hasAccessory
      ? accessoryIds.filter((id) => id !== accessory.id)
      : [
        ...accessoryIds.filter((id) => ACCESSORIES.find((item) => item.id === id)?.slot !== accessory.slot),
        accessory.id,
      ];
    setAccessoryIds(nextAccessoryIds);
    matchConfig.current.accessoryIds = nextAccessoryIds;
    worldRef.current?.updateLocalCosmetics({
      outfitId,
      accessoryIds: nextAccessoryIds,
      weaponSkinId,
    });
    saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds: nextAccessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId });
  }

  function equipWeaponDuringMatch(nextWeaponId) {
    if (!weaponUnlocked(WEAPONS[nextWeaponId])) return;
    setWeaponId(nextWeaponId);
    matchConfig.current.weaponId = nextWeaponId;
    matchConfig.current.weaponLevel = weaponUpgrades[nextWeaponId] || 0;
    worldRef.current?.updateLocalCosmetics({
      outfitId,
      accessoryIds,
      weaponId: nextWeaponId,
      weaponLevel: weaponUpgrades[nextWeaponId] || 0,
      weaponSkinId,
    });
    saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId: nextWeaponId, weaponSkinId, grenadeSkinId });
  }

  function setVirtualMovement({ x = 0, y = 0 } = {}) {
    const movementKeys = [
      keybinds.forward || 'KeyW',
      keybinds.backward || 'KeyS',
      keybinds.left || 'KeyA',
      keybinds.right || 'KeyD',
    ];
    movementKeys.forEach((code) => keys.current.delete(code));
    if (screen !== 'match') return;
    const threshold = 0.28;
    if (y < -threshold) keys.current.add(keybinds.forward || 'KeyW');
    if (y > threshold) keys.current.add(keybinds.backward || 'KeyS');
    if (x < -threshold) keys.current.add(keybinds.left || 'KeyA');
    if (x > threshold) keys.current.add(keybinds.right || 'KeyD');
  }

  function setVirtualShoot(active) {
    mouse.current.down = Boolean(active && screen === 'match');
    if (active && screen === 'match') {
      worldRef.current?.fireLocalWeapon();
    }
  }

  function clearVirtualControls() {
    setVirtualMovement({ x: 0, y: 0 });
    [
      keybinds.grenade || 'KeyQ',
      keybinds.jump || 'Space',
      keybinds.reload || 'KeyR',
    ].forEach((code) => keys.current.delete(code));
    mouse.current.down = false;
    worldRef.current?.setScoped(false);
    setIsScoped(false);
  }

  function toggleVirtualScope() {
    if (screen !== 'match') return;
    const next = !isScoped;
    worldRef.current?.setScoped(next);
    setIsScoped(next);
  }

  function pulseVirtualKey(code, duration = 130) {
    if (screen !== 'match') return;
    keys.current.add(code);
    window.setTimeout(() => keys.current.delete(code), duration);
  }

  function setVirtualGrenade(active) {
    const code = keybinds.grenade || 'KeyQ';
    if (screen !== 'match') {
      keys.current.delete(code);
      return;
    }
    if (active) {
      keys.current.add(code);
    } else {
      keys.current.delete(code);
    }
  }

  function lookWithTouch(dx, dy) {
    if (screen !== 'match') return;
    worldRef.current?.look(dx * 1.15, dy * 1.15);
  }

  function autoTeamForRoom(room) {
    if (!room) return 'blue';
    const blue = room.bluePlayers ?? Math.ceil((room.players || 0) / 2);
    const red = room.redPlayers ?? Math.floor((room.players || 0) / 2);
    return blue <= red ? 'blue' : 'red';
  }

  function mapUnlocked(map) {
    return level >= (map.unlockLevel || 1);
  }

  function weaponUnlocked(weapon) {
    if (!weapon) return false;
    return level >= (weapon.unlockLevel || 1);
  }

  function leaveMatch() {
    const leavingTeam = matchConfig.current.team;
    setRooms((items) => items.map((item) => {
      if (item.id !== selectedRoomId) return item;
      return {
        ...item,
        players: Math.max(0, (item.players || 0) - 1),
        bluePlayers: leavingTeam === 'blue' ? Math.max(0, (item.bluePlayers || 0) - 1) : (item.bluePlayers || 0),
        redPlayers: leavingTeam === 'red' ? Math.max(0, (item.redPlayers || 0) - 1) : (item.redPlayers || 0),
      };
    }));
    document.exitPointerLock?.();
    keys.current.clear();
    mouse.current.down = false;
    setScreen('lobby');
    setPanel('play');
    updateRoute(ROUTES.play);
    setIsScoped(false);
    setGrenadeCharge(0);
    setShowScoreboard(false);
    setHealth(100);
    setDeathInfo({ isDead: false, ready: false, seconds: 0, killerName: '', focusSeconds: 0 });
    setEvents(['Returned to lobby.']);
    setMatchResult(null);
    leaveRoomOnServer(selectedRoomId)
      .then((updatedRoom) => {
        const normalized = normalizeRoom(updatedRoom);
        setRooms((items) => items.map((item) => (item.id === normalized.id ? normalized : item)));
      })
      .catch(() => {});
  }

  const createRoom = async () => {
    const roomPayload = {
      name: roomDraft.name.trim() || 'Custom Arena',
      mapId: roomDraft.mapId,
      maxPlayers: Math.max(2, Math.min(10, Number(roomDraft.maxPlayers) || 10)),
      allowBots: roomDraft.allowBots,
      gameMode: roomDraft.gameMode || DEFAULT_GAME_MODE,
      scoreLimit: roomDraft.scoreLimit,
      timeLimitMinutes: roomDraft.timeLimitMinutes,
    };
    const applyCreatedRoom = (serverRoom, message) => {
      const room = normalizeRoom(serverRoom, roomPayload);
      setRooms((items) => [room, ...items.filter((item) => item.id !== room.id)]);
      setSelectedRoomId(room.id);
      setPanel('play');
      updateRoute(ROUTES.play);
      setLobbyStatus(message);
    };

    try {
      const room = await createRoomOnServer(roomPayload);
      applyCreatedRoom(room, `Room created. Invite code: ${room.id}`);
    } catch (error) {
      setLobbyStatus(`Room was not created: ${error.message}`);
    }
  };

  const joinRoomByCode = async (code) => {
    if (!code.trim()) {
      setLobbyStatus('Enter a game code.');
      return;
    }
    try {
      const room = await findRoomByCode(code);
      const normalizedRoom = normalizeRoom(room);
      setRooms((items) => [normalizedRoom, ...items.filter((item) => item.id !== normalizedRoom.id)]);
      setSelectedRoomId(normalizedRoom.id);
      setLobbyStatus(`Room ${normalizedRoom.id} selected.`);
    } catch (error) {
      setLobbyStatus(error.message);
    }
  };

  function recordMapMission(mapId) {
    const nextMissionStats = normalizeMissionStats(missionStats);
    nextMissionStats.mapPlays[mapId] = (nextMissionStats.mapPlays[mapId] || 0) + 1;
    setMissionStats(nextMissionStats);
    saveProgress({
      wallet,
      xp,
      totalKills,
      totalAssists,
      totalDeaths,
      ownedOutfits,
      ownedWeaponSkins,
      ownedGrenadeSkins,
      ownedAccessories,
      accessoryIds,
      weaponUpgrades,
      outfitId,
      weaponId,
      weaponSkinId,
      grenadeSkinId,
      missionStats: JSON.stringify(nextMissionStats),
    });
    const readyMissions = nextMissionStats.activeMissionIds
      .map((missionId) => MISSIONS.find((mission) => mission.id === missionId))
      .filter((mission) => mission && !nextMissionStats.claimed.includes(mission.id) && missionProgress(mission, nextMissionStats) >= mission.target)
      .map((mission) => `Mission ready: ${mission.title}`);
    if (readyMissions.length) {
      setEvents((items) => [...readyMissions, ...items].slice(0, 5));
    }
  }

  function claimMissionReward(missionId) {
    const mission = MISSIONS.find((item) => item.id === missionId);
    if (!mission) return;
    const nextMissionStats = normalizeMissionStats(missionStats);
    if (nextMissionStats.claimed.includes(mission.id) || missionProgress(mission, nextMissionStats) < mission.target) {
      return;
    }
    nextMissionStats.claimed = [...nextMissionStats.claimed, mission.id];
    const nextWallet = account?.admin ? ADMIN_WALLET : wallet + mission.rewardMoney;
    const nextXp = account?.admin ? ADMIN_XP : xp + mission.rewardXp;
    setMissionStats(nextMissionStats);
    setWallet(nextWallet);
    setXp(nextXp);
    saveProgress({
      wallet: nextWallet,
      xp: nextXp,
      totalKills,
      totalAssists,
      totalDeaths,
      ownedOutfits,
      ownedWeaponSkins,
      ownedGrenadeSkins,
      ownedAccessories,
      accessoryIds,
      weaponUpgrades,
      outfitId,
      weaponId,
      weaponSkinId,
      grenadeSkinId,
      missionStats: JSON.stringify(nextMissionStats),
    });
    setEvents((items) => [`Claimed ${mission.title}: +🪙 ${mission.rewardMoney} +${mission.rewardXp} XP`, ...items].slice(0, 5));
  }

  function rerollMission(missionId) {
    const nextMissionStats = normalizeMissionStats(missionStats);
    const currentMission = MISSIONS.find((mission) => mission.id === missionId);
    if (!currentMission || nextMissionStats.claimed.includes(missionId) || missionProgress(currentMission, nextMissionStats) >= currentMission.target) {
      return;
    }
    const cost = rerollCost(nextMissionStats.rerolls.count);
    if (!account?.admin && wallet < cost) {
      setAccountStatus(`You need 🪙 ${cost} to change this mission.`);
      return;
    }
    const blocked = [...nextMissionStats.activeMissionIds, ...nextMissionStats.claimed];
    const replacementId = pickMissionIds(1, blocked)[0];
    if (!replacementId) {
      setAccountStatus('No other daily missions are available right now.');
      return;
    }
    nextMissionStats.activeMissionIds = nextMissionStats.activeMissionIds.map((id) => (id === missionId ? replacementId : id));
    nextMissionStats.rerolls = {
      dayKey: todayKey(),
      count: nextMissionStats.rerolls.count + 1,
    };
    const nextWallet = account?.admin ? ADMIN_WALLET : wallet - cost;
    setMissionStats(nextMissionStats);
    setWallet(nextWallet);
    saveProgress({
      wallet: nextWallet,
      xp,
      totalKills,
      totalAssists,
      totalDeaths,
      ownedOutfits,
      ownedWeaponSkins,
      ownedGrenadeSkins,
      ownedAccessories,
      accessoryIds,
      weaponUpgrades,
      outfitId,
      weaponId,
      weaponSkinId,
      grenadeSkinId,
      missionStats: JSON.stringify(nextMissionStats),
    });
    setAccountStatus(cost === 0 ? 'Mission changed for free.' : `Mission changed for 🪙 ${cost}.`);
  }

  const joinMatch = async () => {
    const room = rooms.find((item) => item.id === selectedRoomId) || rooms[0];
    if (!room) {
      setLobbyStatus('Select or create a room first.');
      return;
    }
    const trimmedName = name.trim() || 'Player';
    const assignedTeam = autoTeamForRoom(room);
    const allowedWeaponId = weaponUnlocked(WEAPONS[weaponId]) ? weaponId : 'rifle';
    let joinedRoom;
    try {
      joinedRoom = normalizeRoom(await joinRoomOnServer(room.id), room);
      setRooms((items) => items.map((item) => (item.id === joinedRoom.id ? joinedRoom : item)));
    } catch (error) {
      setLobbyStatus(`Could not join room: ${error.message}`);
      return;
    }
    matchConfig.current = {
      name: trimmedName,
      team: assignedTeam,
      weaponId: allowedWeaponId,
      outfitId,
      accessoryIds,
      weaponSkinId,
      weaponLevel: weaponUpgrades[allowedWeaponId] || 0,
      mapId: room.mapId,
      roomId: room.id,
      gameMode: room.gameMode || DEFAULT_GAME_MODE,
      scoreLimit: room.scoreLimit,
      timeLimitMinutes: room.timeLimitMinutes,
      maps: MAPS,
      maxPlayers: room.maxPlayers,
      allowBots: room.allowBots,
      keybinds,
      onProgressChange: handleProgressChange,
      money: wallet,
    };
    setTeam(assignedTeam);
    setName(trimmedName);
    setIsScoped(false);
    setGrenadeCharge(0);
    setShowScoreboard(false);
    setHealth(100);
    setDeathInfo({ isDead: false, ready: false, seconds: 0, killerName: '', focusSeconds: 0 });
    setMatchResult(null);
    setWeaponId(allowedWeaponId);
    setEvents([`${trimmedName} entered ${room.name} with ${WEAPONS[allowedWeaponId].name}`]);
    recordMapMission(room.mapId);
    setScreen('match');
    updateRoute(ROUTES.match);
  };

  async function refreshSocial() {
    const overview = await fetchSocialOverview();
    setSocial(overview);
    return overview;
  }

  async function findPlayers(username) {
    if (username.trim().length < 2) {
      setPlayerSearchResults([]);
      return;
    }
    try {
      setPlayerSearchResults(await searchPlayers(username));
    } catch (error) {
      setLobbyStatus(error.message);
    }
  }

  async function requestFriendship(username) {
    try {
      await sendFriendRequest(username);
      await refreshSocial();
      setPlayerSearchResults([]);
      setLobbyStatus(`Friend request sent to ${username}.`);
    } catch (error) {
      setLobbyStatus(error.message);
    }
  }

  async function answerFriendRequest(requestId, accept) {
    try {
      await (accept ? acceptFriendRequest(requestId) : declineFriendRequest(requestId));
      await refreshSocial();
      setLobbyStatus(accept ? 'Friend request accepted.' : 'Friend request declined.');
    } catch (error) {
      setLobbyStatus(error.message);
    }
  }

  async function inviteFriend(friendId) {
    if (!selectedRoomId) {
      setLobbyStatus('Select or create a room before inviting a friend.');
      return;
    }
    try {
      await inviteFriendToRoom(friendId, selectedRoomId);
      setLobbyStatus('Room invitation sent.');
    } catch (error) {
      setLobbyStatus(error.message);
    }
  }

  async function answerRoomInvite(invitationId, accept) {
    try {
      if (!accept) {
        await declineRoomInvite(invitationId);
        await refreshSocial();
        setLobbyStatus('Room invitation declined.');
        return;
      }
      const room = normalizeRoom(await acceptRoomInvite(invitationId));
      setRooms((items) => [room, ...items.filter((item) => item.id !== room.id)]);
      setSelectedRoomId(room.id);
      await refreshSocial();
      setPanel('play');
      updateRoute(ROUTES.play);
      setLobbyStatus(`Invitation accepted. Room ${room.id} is selected.`);
    } catch (error) {
      setLobbyStatus(error.message);
    }
  }

  const selectWeapon = (id) => {
    if (!weaponUnlocked(WEAPONS[id])) {
      return;
    }
    setWeaponId(id);
    saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId: id, weaponSkinId, grenadeSkinId });
  };

  const buyOrEquipAccessory = (accessory) => {
    if (ownedAccessories.includes(accessory.id)) {
      const nextAccessoryIds = [
        ...accessoryIds.filter((id) => ACCESSORIES.find((item) => item.id === id)?.slot !== accessory.slot),
        accessory.id,
      ];
      setAccessoryIds(nextAccessoryIds);
      setPreviewAccessory(null);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds: nextAccessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId });
      return;
    }
    if (wallet < accessory.price) {
      setEvents((items) => [`Need 🪙 ${accessory.price - wallet} more for ${accessory.name}`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - accessory.price;
    const nextOwnedAccessories = [...ownedAccessories, accessory.id];
    const nextAccessoryIds = [
      ...accessoryIds.filter((id) => ACCESSORIES.find((item) => item.id === id)?.slot !== accessory.slot),
      accessory.id,
    ];
    setWallet(nextWallet);
    setOwnedAccessories(nextOwnedAccessories);
    setAccessoryIds(nextAccessoryIds);
    setPreviewAccessory(null);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories: nextOwnedAccessories, accessoryIds: nextAccessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId });
  };

  const buyOrEquipOutfit = (outfit) => {
    if (ownedOutfits.includes(outfit.id)) {
      setOutfitId(outfit.id);
      setPreviewOutfit(null);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId: outfit.id, weaponId, weaponSkinId, grenadeSkinId });
      return;
    }
    if (wallet < outfit.price) {
      setEvents((items) => [`Need 🪙 ${outfit.price - wallet} more for ${outfit.name}`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - outfit.price;
    const nextOwnedOutfits = [...ownedOutfits, outfit.id];
    setWallet(nextWallet);
    setOwnedOutfits(nextOwnedOutfits);
    setOutfitId(outfit.id);
    setPreviewOutfit(null);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits: nextOwnedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId: outfit.id, weaponId, weaponSkinId, grenadeSkinId });
  };

  const buyOrEquipWeaponSkin = (skin) => {
    if (ownedWeaponSkins.includes(skin.id)) {
      setWeaponSkinId(skin.id);
      setPreviewWeaponSkin(null);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId: skin.id, grenadeSkinId });
      return;
    }
    if (wallet < skin.price) {
      setEvents((items) => [`Need 🪙 ${skin.price - wallet} more for ${skin.name}`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - skin.price;
    const nextOwnedWeaponSkins = [...ownedWeaponSkins, skin.id];
    setWallet(nextWallet);
    setOwnedWeaponSkins(nextOwnedWeaponSkins);
    setWeaponSkinId(skin.id);
    setPreviewWeaponSkin(null);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins: nextOwnedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId: skin.id, grenadeSkinId });
  };

  const buyOrEquipGrenadeSkin = (skin) => {
    if (ownedGrenadeSkins.includes(skin.id)) {
      setGrenadeSkinId(skin.id);
      setPreviewGrenadeSkin(null);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId: skin.id });
      return;
    }
    if (wallet < skin.price) {
      setAccountStatus(`You need 🪙 ${skin.price - wallet} more for ${skin.name}.`);
      return;
    }
    const nextWallet = wallet - skin.price;
    const nextOwnedGrenadeSkins = [...ownedGrenadeSkins, skin.id];
    setWallet(nextWallet);
    setOwnedGrenadeSkins(nextOwnedGrenadeSkins);
    setGrenadeSkinId(skin.id);
    setPreviewGrenadeSkin(null);
    saveProgress({
      wallet: nextWallet,
      xp,
      totalKills,
      totalAssists,
      totalDeaths,
      ownedOutfits,
      ownedWeaponSkins,
      ownedAccessories,
      accessoryIds,
      weaponUpgrades,
      outfitId,
      weaponId,
      weaponSkinId,
      grenadeSkinId: skin.id,
      ownedGrenadeSkins: nextOwnedGrenadeSkins,
    });
  };

  const upgradeWeapon = (id) => {
    const current = weaponUpgrades[id] || 0;
    const price = 75 + current * 65;
    if (wallet < price) {
      setEvents((items) => [`Need 🪙 ${price - wallet} more to upgrade`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - price;
    const nextUpgrades = { ...weaponUpgrades, [id]: current + 1 };
    setWallet(nextWallet);
    setWeaponUpgrades(nextUpgrades);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, ownedGrenadeSkins, ownedAccessories, accessoryIds, weaponUpgrades: nextUpgrades, outfitId, weaponId, weaponSkinId, grenadeSkinId });
  };

  return {
    screen,
    lobbyProps: {
      account,
      accountStatus,
      answerFriendRequest,
      answerRoomInvite,
      authMode,
      autoTeamForRoom,
      accessoryIds,
      buyOrEquipAccessory,
      buyOrEquipGrenadeSkin,
      buyOrEquipOutfit,
      buyOrEquipWeaponSkin,
      createRoom,
      credentials,
      editingKeybind,
      handleAccountAction,
      handleGoogleLogin,
      joinMatch,
      joinRoomByCode,
      findPlayers,
      inviteFriend,
      keybinds,
      level,
      levelProgress,
      lobbyStatus,
      mapUnlocked,
      missionCards,
      claimMissionReward,
      name,
      outfitId,
      ownedOutfits,
      ownedGrenadeSkins,
      ownedAccessories,
      ownedWeaponSkins,
      panel,
      previewOutfit,
      previewWeaponSkin,
      previewGrenadeSkin,
      previewAccessory,
      previewedOutfit,
      previewedWeaponSkin,
      previewedGrenadeSkin,
      previewedAccessories,
      resetKeybinds,
      rerollMission,
      roomDraft,
      rooms,
      social,
      playerSearchResults,
      selectedMap,
      selectedGrenadeSkin,
      selectedRoom,
      selectedRoomId,
      selectedWeaponSkin,
      setCredentials,
      setEditingKeybind,
      setName,
      setPanel: openPanel,
      setAuthMode: openAuthMode,
      setPreviewOutfit,
      setPreviewWeaponSkin,
      setPreviewGrenadeSkin,
      setPreviewAccessory,
      setRoomDraft,
      setSelectedRoomId,
      requestFriendship,
      selectWeapon,
      signOut,
      updateKeybind,
      upgradeWeapon,
      wallet,
      weaponId,
      grenadeSkinId,
      weaponSkinId,
      weaponUnlocked,
      weaponUpgrades,
      xp,
    },
      matchProps: {
      activeBuffs,
      ammo,
      canvasRef,
      currentMatch: matchConfig.current,
      deathInfo,
      equippedAccessoryIds: accessoryIds,
      equipOwnedOutfitDuringMatch,
      equipWeaponDuringMatch,
      events,
      grenadeCharge,
      isScoped,
      health,
      leaveMatch,
      localId,
      onToggleAccessoryDuringMatch: toggleOwnedAccessoryDuringMatch,
      outfitId,
      ownedAccessories,
      ownedOutfits,
      weaponId,
      weaponSkinId,
      grenadeSkinId,
      weaponUnlocked,
      score,
      selectedRoomId,
      wallet,
      xp,
      level,
      levelProgress,
      matchResult,
      onMobileGrenadeEnd: () => setVirtualGrenade(false),
      onMobileGrenadeStart: () => setVirtualGrenade(true),
      onMobileJump: () => pulseVirtualKey(keybinds.jump || 'Space'),
      onMobileLook: lookWithTouch,
      onMobileMove: setVirtualMovement,
      onMobileReload: () => pulseVirtualKey(keybinds.reload || 'KeyR'),
      onMobileReset: clearVirtualControls,
      onMobileScopeToggle: toggleVirtualScope,
      onMobileShootEnd: () => setVirtualShoot(false),
      onMobileShootStart: () => setVirtualShoot(true),
      showScoreboard,
      worldRef,
    },
  };
}
