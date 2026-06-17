import { useEffect, useMemo, useRef, useState } from 'react';
import { loadUser, loginUser, registerUser, saveUserProgress } from '../api/users';
import { GameWorld } from '../game/GameWorld';
import { levelForXp, MAPS, OUTFITS, WEAPONS, WEAPON_SKINS, xpForLevel } from '../game/config';
import { makeId } from '../game/utils';
import {
  ADMIN_WALLET,
  ADMIN_XP,
  DEFAULT_KEYBINDS,
  guestProgressKey,
  loadKeybinds,
  savedKeybindsKey,
  savedUserKey,
  starterRooms,
} from './appConstants';

export function useDeadzoneController() {
  const [screen, setScreen] = useState('lobby');
  const [panel, setPanel] = useState('play');
  const [rooms, setRooms] = useState(starterRooms);
  const [selectedRoomId, setSelectedRoomId] = useState(starterRooms[0].id);
  const [roomDraft, setRoomDraft] = useState({ name: 'Custom Arena', mapId: 'foundry', maxPlayers: 6, allowBots: true });
  const [name, setName] = useState('Player ' + makeId().toUpperCase().slice(0, 3));
  const [account, setAccount] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [accountStatus, setAccountStatus] = useState('Play as guest or create a saved account.');
  const [team, setTeam] = useState('blue');
  const [weaponId, setWeaponId] = useState('rifle');
  const [outfitId, setOutfitId] = useState('classic');
  const [weaponSkinId, setWeaponSkinId] = useState('standard');
  const [score, setScore] = useState({ blue: 0, red: 0, players: [] });
  const [wallet, setWallet] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  const [totalAssists, setTotalAssists] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [ownedOutfits, setOwnedOutfits] = useState(['classic']);
  const [ownedWeaponSkins, setOwnedWeaponSkins] = useState(['standard']);
  const [weaponUpgrades, setWeaponUpgrades] = useState({});
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const [keybinds, setKeybinds] = useState(loadKeybinds);
  const [editingKeybind, setEditingKeybind] = useState(null);
  const [events, setEvents] = useState(['Choose a room and enter the 3D arena.']);
  const [activeBuffs, setActiveBuffs] = useState('No buffs');
  const [isScoped, setIsScoped] = useState(false);
  const [ammo, setAmmo] = useState({ ammo: 0, magazineSize: 0, reloading: false, reloadProgress: 1 });
  const [deathInfo, setDeathInfo] = useState({ isDead: false, ready: false, seconds: 0 });

  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const keys = useRef(new Set());
  const mouse = useRef({ down: false });
  const localId = useMemo(() => 'player-' + makeId(), []);
  const matchConfig = useRef({ name, team, weaponId, mapId: 'foundry', maps: MAPS, maxPlayers: 6, outfitId, weaponSkinId, keybinds, money: wallet });

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || rooms[0];
  const selectedMap = MAPS.find((map) => map.id === selectedRoom?.mapId) || MAPS[0];
  const selectedOutfit = OUTFITS.find((outfit) => outfit.id === outfitId) || OUTFITS[0];
  const previewedOutfit = previewOutfit || selectedOutfit;
  const selectedWeaponSkin = WEAPON_SKINS.find((skin) => skin.id === weaponSkinId) || WEAPON_SKINS[0];
  const level = levelForXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const levelProgress = nextLevelXp === currentLevelXp ? 0 : Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);

  useEffect(() => {
    const savedId = localStorage.getItem(savedUserKey);
    if (!savedId) {
      try {
        const guest = JSON.parse(localStorage.getItem(guestProgressKey));
        if (guest) {
          setWallet(guest.wallet || 0);
          setXp(guest.xp || 0);
          setTotalKills(guest.totalKills || 0);
          setTotalAssists(guest.totalAssists || 0);
          setTotalDeaths(guest.totalDeaths || 0);
          setOwnedOutfits(guest.ownedOutfits || ['classic']);
          setOwnedWeaponSkins(guest.ownedWeaponSkins || ['standard']);
          setWeaponUpgrades(guest.weaponUpgrades || {});
          setOutfitId(guest.outfitId || 'classic');
          setWeaponSkinId(guest.weaponSkinId || 'standard');
        }
      } catch {
        localStorage.removeItem(guestProgressKey);
      }
      return;
    }

    loadUser(savedId)
      .then((user) => applyUser(user, 'Loaded saved account.'))
      .catch(() => {
        localStorage.removeItem(savedUserKey);
        setAccountStatus('Saved account was not available. Playing as guest.');
      });
  }, []);

  useEffect(() => {
    const down = (event) => {
      if (screen === 'match' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      keys.current.add(event.code);
    };
    const up = (event) => keys.current.delete(event.code);
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
      onWalletChange: handleWalletChange,
      onScopeChange: setIsScoped,
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
    setAccount(user);
    localStorage.setItem(savedUserKey, user.id);
    setName(user.username);
    setWallet(user.admin ? ADMIN_WALLET : user.wallet || 0);
    setXp(user.admin ? ADMIN_XP : user.xp || 0);
    setTotalKills(user.totalKills || 0);
    setTotalAssists(user.totalAssists || 0);
    setTotalDeaths(user.totalDeaths || 0);
    setOwnedOutfits(user.ownedOutfits || ['classic']);
    setOwnedWeaponSkins(user.ownedWeaponSkins || ['standard']);
    setWeaponUpgrades(user.weaponUpgrades || {});
    setOutfitId(user.outfitId || 'classic');
    setWeaponSkinId(user.weaponSkinId || 'standard');
    setAccountStatus(message);
  }

  function saveProgress(progress) {
    const normalizedProgress = account?.admin
      ? { ...progress, wallet: ADMIN_WALLET, xp: ADMIN_XP }
      : progress;
    if (!account?.id) {
      const current = {
        wallet,
        xp,
        totalKills,
        totalAssists,
        totalDeaths,
        ownedOutfits,
        ownedWeaponSkins,
        weaponUpgrades,
        outfitId,
        weaponSkinId,
        ...normalizedProgress,
      };
      localStorage.setItem(guestProgressKey, JSON.stringify(current));
      return;
    }
    saveUserProgress(account.id, normalizedProgress).catch(() => {
      setAccountStatus('Could not save progress. Start the server to keep wallet changes.');
    });
  }

  function handleWalletChange(amount) {
    const nextWallet = account?.admin ? ADMIN_WALLET : amount;
    setWallet(nextWallet);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId });
  }

  function handleProgressChange(progress) {
    const nextTotalKills = progress.reason === 'kill' ? totalKills + 1 : totalKills;
    const nextTotalAssists = progress.reason === 'assist' ? totalAssists + 1 : totalAssists;
    setTotalKills(nextTotalKills);
    setTotalAssists(nextTotalAssists);
    setXp((currentXp) => {
      const nextXp = account?.admin ? ADMIN_XP : currentXp + progress.xp;
      saveProgress({ wallet, xp: nextXp, totalKills: nextTotalKills, totalAssists: nextTotalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId });
      return nextXp;
    });
    setEvents((items) => [`+${progress.xp} XP for ${progress.reason}`, ...items].slice(0, 5));
  }

  async function handleAccountAction(action) {
    const username = credentials.username.trim();
    const password = credentials.password.trim();
    if (!username || !password) {
      setAccountStatus('Enter username and password first.');
      return;
    }
    try {
      const user = action === 'register'
        ? await registerUser(username, password)
        : await loginUser(username, password);
      applyUser(user, action === 'register' ? 'Account created and saved.' : 'Logged in.');
    } catch (error) {
      setAccountStatus(error.message);
    }
  }

  function signOut() {
    setAccount(null);
    localStorage.removeItem(savedUserKey);
    setAccountStatus('Signed out. Playing as guest.');
  }

  function updateKeybind(action, code) {
    const next = { ...keybinds, [action]: code };
    setKeybinds(next);
    localStorage.setItem(savedKeybindsKey, JSON.stringify(next));
    setEditingKeybind(null);
  }

  function resetKeybinds() {
    setKeybinds(DEFAULT_KEYBINDS);
    localStorage.setItem(savedKeybindsKey, JSON.stringify(DEFAULT_KEYBINDS));
    setEditingKeybind(null);
  }

  function autoTeamForRoom(room) {
    const blue = room.bluePlayers ?? Math.ceil((room.players || 0) / 2);
    const red = room.redPlayers ?? Math.floor((room.players || 0) / 2);
    return blue <= red ? 'blue' : 'red';
  }

  function mapUnlocked(map) {
    return level >= (map.unlockLevel || 1);
  }

  function weaponUnlocked(weapon) {
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
    setIsScoped(false);
    setDeathInfo({ isDead: false, ready: false, seconds: 0 });
    setEvents(['Returned to lobby.']);
  }

  const createRoom = () => {
    const id = 'ROOM-' + makeId().toUpperCase();
    const room = {
      id,
      name: roomDraft.name.trim() || 'Custom Arena',
      mapId: roomDraft.mapId,
      players: 1,
      maxPlayers: Number(roomDraft.maxPlayers),
      allowBots: roomDraft.allowBots,
      bluePlayers: 0,
      redPlayers: 0,
    };
    setRooms((items) => [room, ...items]);
    setSelectedRoomId(id);
    setPanel('play');
  };

  const joinMatch = () => {
    const room = rooms.find((item) => item.id === selectedRoomId) || rooms[0];
    const trimmedName = name.trim() || 'Player';
    const assignedTeam = autoTeamForRoom(room);
    const allowedWeaponId = weaponUnlocked(WEAPONS[weaponId]) ? weaponId : 'rifle';
    matchConfig.current = {
      name: trimmedName,
      team: assignedTeam,
      weaponId: allowedWeaponId,
      outfitId,
      weaponSkinId,
      weaponLevel: weaponUpgrades[allowedWeaponId] || 0,
      mapId: room.mapId,
      maps: MAPS,
      maxPlayers: room.maxPlayers,
      allowBots: room.allowBots,
      keybinds,
      onProgressChange: handleProgressChange,
      money: wallet,
    };
    setTeam(assignedTeam);
    setRooms((items) => items.map((item) => {
      if (item.id !== room.id) return item;
      return {
        ...item,
        players: Math.min(item.maxPlayers, (item.players || 0) + 1),
        bluePlayers: assignedTeam === 'blue' ? (item.bluePlayers || 0) + 1 : (item.bluePlayers || 0),
        redPlayers: assignedTeam === 'red' ? (item.redPlayers || 0) + 1 : (item.redPlayers || 0),
      };
    }));
    setName(trimmedName);
    setIsScoped(false);
    setDeathInfo({ isDead: false, ready: false, seconds: 0 });
    setWeaponId(allowedWeaponId);
    setEvents([`${trimmedName} entered ${room.name} with ${WEAPONS[allowedWeaponId].name}`]);
    setScreen('match');
  };

  const buyOrEquipOutfit = (outfit) => {
    if (ownedOutfits.includes(outfit.id)) {
      setOutfitId(outfit.id);
      setPreviewOutfit(null);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId: outfit.id, weaponSkinId });
      return;
    }
    if (wallet < outfit.price) {
      setEvents((items) => [`Need NIS ${outfit.price - wallet} more for ${outfit.name}`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - outfit.price;
    const nextOwnedOutfits = [...ownedOutfits, outfit.id];
    setWallet(nextWallet);
    setOwnedOutfits(nextOwnedOutfits);
    setOutfitId(outfit.id);
    setPreviewOutfit(null);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits: nextOwnedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId: outfit.id, weaponSkinId });
  };

  const buyOrEquipWeaponSkin = (skin) => {
    if (ownedWeaponSkins.includes(skin.id)) {
      setWeaponSkinId(skin.id);
      saveProgress({ wallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId: skin.id });
      return;
    }
    if (wallet < skin.price) {
      setEvents((items) => [`Need NIS ${skin.price - wallet} more for ${skin.name}`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - skin.price;
    const nextOwnedWeaponSkins = [...ownedWeaponSkins, skin.id];
    setWallet(nextWallet);
    setOwnedWeaponSkins(nextOwnedWeaponSkins);
    setWeaponSkinId(skin.id);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins: nextOwnedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId: skin.id });
  };

  const upgradeWeapon = (id) => {
    const current = weaponUpgrades[id] || 0;
    const price = 75 + current * 65;
    if (wallet < price) {
      setEvents((items) => [`Need NIS ${price - wallet} more to upgrade`, ...items].slice(0, 5));
      return;
    }
    const nextWallet = wallet - price;
    const nextUpgrades = { ...weaponUpgrades, [id]: current + 1 };
    setWallet(nextWallet);
    setWeaponUpgrades(nextUpgrades);
    saveProgress({ wallet: nextWallet, xp, totalKills, totalAssists, totalDeaths, ownedOutfits, ownedWeaponSkins, weaponUpgrades: nextUpgrades, outfitId, weaponSkinId });
  };

  return {
    screen,
    lobbyProps: {
      account,
      accountStatus,
      autoTeamForRoom,
      buyOrEquipOutfit,
      buyOrEquipWeaponSkin,
      createRoom,
      credentials,
      editingKeybind,
      handleAccountAction,
      joinMatch,
      keybinds,
      level,
      levelProgress,
      mapUnlocked,
      name,
      ownedOutfits,
      ownedWeaponSkins,
      panel,
      previewOutfit,
      previewedOutfit,
      resetKeybinds,
      roomDraft,
      rooms,
      selectedMap,
      selectedRoom,
      selectedRoomId,
      selectedWeaponSkin,
      setCredentials,
      setEditingKeybind,
      setName,
      setPanel,
      setPreviewOutfit,
      setRoomDraft,
      setSelectedRoomId,
      setWeaponId,
      signOut,
      updateKeybind,
      upgradeWeapon,
      wallet,
      weaponId,
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
      events,
      isScoped,
      leaveMatch,
      localId,
      score,
      selectedRoomId,
      wallet,
      worldRef,
    },
  };
}
