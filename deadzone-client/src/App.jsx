import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { loadUser, loginUser, registerUser, saveUserProgress } from './api/users';
import { GameWorld } from './game/GameWorld';
import { levelForXp, MAPS, OUTFITS, WEAPONS, WEAPON_SKINS, xpForLevel } from './game/config';
import { makeId } from './game/utils';

const starterRooms = [
  { id: 'ROOM-ALPHA', name: 'Alpha Rush', mapId: 'foundry', players: 3, bluePlayers: 2, redPlayers: 1, maxPlayers: 6, allowBots: true },
  { id: 'ROOM-NEON', name: 'Neon Duel', mapId: 'neon', players: 2, bluePlayers: 1, redPlayers: 1, maxPlayers: 4, allowBots: false },
  { id: 'ROOM-JUNGLE', name: 'Overgrowth Ops', mapId: 'jungle', players: 5, bluePlayers: 3, redPlayers: 2, maxPlayers: 6, allowBots: true },
];

const savedUserKey = 'deadzone-user-id';
const savedKeybindsKey = 'deadzone-keybinds';
const guestProgressKey = 'deadzone-guest-progress';

const DEFAULT_KEYBINDS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  reload: 'KeyR',
  grenade: 'KeyQ',
};

const KEYBIND_LABELS = {
  forward: 'Move Forward',
  backward: 'Move Backward',
  left: 'Move Left',
  right: 'Move Right',
  jump: 'Jump',
  reload: 'Reload',
  grenade: 'Throw Grenade',
};

function loadKeybinds() {
  try {
    return { ...DEFAULT_KEYBINDS, ...(JSON.parse(localStorage.getItem(savedKeybindsKey)) || {}) };
  } catch {
    return DEFAULT_KEYBINDS;
  }
}

function App() {
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
    const down = (event) => keys.current.add(event.code);
    const up = (event) => keys.current.delete(event.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

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
  }, [localId, screen]);

  function applyUser(user, message) {
    setAccount(user);
    localStorage.setItem(savedUserKey, user.id);
    setName(user.username);
    setWallet(user.wallet || 0);
    setXp(user.xp || 0);
    setOwnedOutfits(user.ownedOutfits || ['classic']);
    setOwnedWeaponSkins(user.ownedWeaponSkins || ['standard']);
    setWeaponUpgrades(user.weaponUpgrades || {});
    setOutfitId(user.outfitId || 'classic');
    setWeaponSkinId(user.weaponSkinId || 'standard');
    setAccountStatus(message);
  }

  function saveProgress(progress) {
    if (!account?.id) {
      const current = {
        wallet,
        xp,
        ownedOutfits,
        ownedWeaponSkins,
        weaponUpgrades,
        outfitId,
        weaponSkinId,
        ...progress,
      };
      localStorage.setItem(guestProgressKey, JSON.stringify(current));
      return;
    }
    saveUserProgress(account.id, progress).catch(() => {
      setAccountStatus('Could not save progress. Start the server to keep wallet changes.');
    });
  }

  function handleWalletChange(amount) {
    setWallet(amount);
    saveProgress({ wallet: amount, xp, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId });
  }

  function handleProgressChange(progress) {
    setXp((currentXp) => {
      const nextXp = currentXp + progress.xp;
      saveProgress({ wallet, xp: nextXp, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId });
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
      saveProgress({ wallet, xp, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId: outfit.id, weaponSkinId });
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
    saveProgress({ wallet: nextWallet, xp, ownedOutfits: nextOwnedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId: outfit.id, weaponSkinId });
  };

  const buyOrEquipWeaponSkin = (skin) => {
    if (ownedWeaponSkins.includes(skin.id)) {
      setWeaponSkinId(skin.id);
      saveProgress({ wallet, xp, ownedOutfits, ownedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId: skin.id });
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
    saveProgress({ wallet: nextWallet, xp, ownedOutfits, ownedWeaponSkins: nextOwnedWeaponSkins, weaponUpgrades, outfitId, weaponSkinId: skin.id });
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
    saveProgress({ wallet: nextWallet, xp, ownedOutfits, ownedWeaponSkins, weaponUpgrades: nextUpgrades, outfitId, weaponSkinId });
  };

  if (screen === 'lobby') {
    return (
      <main className="shell" dir="ltr">
        <section className="lobby-hub">
          <div className="brand lobby-brand">
            <span>DEADZONE 3D</span>
            <strong>Ready Room</strong>
            <small>Pick a room, tune your loadout, and drop into a 6 player arena.</small>
          </div>

          <div className="hub-actions">
            <button className={panel === 'name' ? 'hub-action selected' : 'hub-action'} onClick={() => setPanel('name')}>Choose Name</button>
            <button className={panel === 'shop' ? 'hub-action selected' : 'hub-action'} onClick={() => setPanel('shop')}>Shop</button>
            <button className={panel === 'settings' ? 'hub-action selected' : 'hub-action'} onClick={() => setPanel('settings')}>Settings</button>
            <button className={panel === 'play' ? 'hub-action selected' : 'hub-action'} onClick={() => setPanel('play')}>Start Playing</button>
            <button className={panel === 'create' ? 'hub-action selected' : 'hub-action'} onClick={() => setPanel('create')}>Create Room</button>
          </div>

          <div className="season-strip">
            <span>{rooms.length} open rooms</span>
            <span>{MAPS.length} arenas</span>
            <span>{Object.keys(WEAPONS).length} weapons</span>
            <span>NIS {wallet}</span>
            <span>Level {level}</span>
          </div>

          <div className="hub-main">
            <aside className="player-preview">
              <div className="egg-preview" style={{ '--shell': previewedOutfit.shell, '--trim': previewedOutfit.trim }}>
                <span />
              </div>
              <strong>{name}</strong>
              <small>{previewedOutfit.name} / {WEAPONS[weaponId].name}</small>
              <small>{selectedWeaponSkin.name}</small>
              <small>Wallet NIS {wallet}</small>
              <small>Level {level} / {xp} XP / {levelProgress}%</small>
              <div className="quick-stats">
                <span>AUTO TEAM</span>
                <span>{selectedMap.name}</span>
              </div>
            </aside>

            <section className="setup-panel hub-panel">
              {panel === 'name' && (
                <>
                  <div className="section-title">Name</div>
                  <label>
                    Player name
                    <input value={name} maxLength={16} onChange={(event) => setName(event.target.value)} />
                  </label>
                  <div className="section-title">Saved User</div>
                  <div className="account-box">
                    <input
                      placeholder="Username"
                      value={credentials.username}
                      maxLength={16}
                      onChange={(event) => setCredentials((draft) => ({ ...draft, username: event.target.value }))}
                    />
                    <input
                      placeholder="Password"
                      type="password"
                      value={credentials.password}
                      maxLength={24}
                      onChange={(event) => setCredentials((draft) => ({ ...draft, password: event.target.value }))}
                    />
                    <button onClick={() => handleAccountAction('login')}>Login</button>
                    <button onClick={() => handleAccountAction('register')}>Create User</button>
                    {account && <button className="ghost-button" onClick={signOut}>Sign Out</button>}
                    <small>{account ? `Connected: ${account.username}` : accountStatus}</small>
                  </div>
                  <div className="auto-team-note">Team is selected automatically when you join a room.</div>
                </>
              )}

              {panel === 'shop' && (
                <>
                  <div className="section-title">Character Outfits</div>
                  <div className="option-grid outfit-grid">
                    {OUTFITS.map((outfit) => (
                      <button
                        className={(previewOutfit?.id || outfitId) === outfit.id ? 'option outfit-option selected' : 'option outfit-option'}
                        key={outfit.id}
                        onClick={() => setPreviewOutfit(outfit)}
                      >
                        <i style={{ '--shell': outfit.shell, '--trim': outfit.trim }} />
                        <strong>{outfit.name}</strong>
                        <span>{ownedOutfits.includes(outfit.id) ? 'Owned' : `Preview / NIS ${outfit.price}`}</span>
                      </button>
                    ))}
                  </div>
                  {previewOutfit && (
                    <div className="shop-confirm">
                      <strong>{previewOutfit.name}</strong>
                      <span>{ownedOutfits.includes(previewOutfit.id) ? 'Already owned' : `Price NIS ${previewOutfit.price}`}</span>
                      <button onClick={() => buyOrEquipOutfit(previewOutfit)}>
                        {ownedOutfits.includes(previewOutfit.id) ? 'Equip Outfit' : 'Buy Outfit'}
                      </button>
                      <button className="ghost-button" onClick={() => setPreviewOutfit(null)}>Cancel Preview</button>
                    </div>
                  )}
                  <div className="section-title">Weapon Skins</div>
                  <div className="option-grid outfit-grid">
                    {WEAPON_SKINS.map((skin) => (
                      <button
                        className={weaponSkinId === skin.id ? 'option weapon-skin-option selected' : 'option weapon-skin-option'}
                        key={skin.id}
                        onClick={() => buyOrEquipWeaponSkin(skin)}
                      >
                        <i style={{ '--skin': skin.color }} />
                        <strong>{skin.name}</strong>
                        <span>{ownedWeaponSkins.includes(skin.id) ? 'Owned' : `NIS ${skin.price}`}</span>
                      </button>
                    ))}
                  </div>
                  <div className="section-title">Weapon Loadout</div>
                  <div className="option-grid weapon-grid">
                    {Object.entries(WEAPONS).map(([id, weapon]) => (
                      <button
                        className={weaponId === id ? 'option selected' : 'option'}
                        disabled={!weaponUnlocked(weapon)}
                        key={id}
                        onClick={() => weaponUnlocked(weapon) && setWeaponId(id)}
                      >
                        <strong>{weapon.name}</strong>
                        <span>{weaponUnlocked(weapon) ? `${weapon.tag} / Mk ${weaponUpgrades[id] || 0}` : `Unlocks level ${weapon.unlockLevel}`}</span>
                        {weaponUnlocked(weapon) && (
                          <em onClick={(event) => { event.stopPropagation(); upgradeWeapon(id); }}>
                            Upgrade NIS {75 + (weaponUpgrades[id] || 0) * 65}
                          </em>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {panel === 'settings' && (
                <>
                  <div className="section-title">Keyboard Settings</div>
                  <div className="keybind-list">
                    {Object.entries(KEYBIND_LABELS).map(([action, label]) => (
                      <button
                        className={editingKeybind === action ? 'keybind-row listening' : 'keybind-row'}
                        key={action}
                        onClick={() => setEditingKeybind(action)}
                        onKeyDown={(event) => {
                          if (editingKeybind === action) {
                            event.preventDefault();
                            updateKeybind(action, event.code);
                          }
                        }}
                      >
                        <span>{label}</span>
                        <strong>{editingKeybind === action ? 'Press key...' : keybinds[action]}</strong>
                      </button>
                    ))}
                  </div>
                  <button className="ghost-button" onClick={resetKeybinds}>Reset Defaults</button>
                </>
              )}

              {panel === 'play' && (
                <>
                  <div className="section-title">Open Rooms</div>
                  <div className="room-list">
                    {rooms.map((room) => {
                      const map = MAPS.find((item) => item.id === room.mapId) || MAPS[0];
                      const unlocked = mapUnlocked(map);
                      return (
                        <button
                          className={selectedRoomId === room.id ? 'room-row selected' : 'room-row'}
                          disabled={!unlocked}
                          key={room.id}
                          onClick={() => unlocked && setSelectedRoomId(room.id)}
                        >
                          <strong>{room.name}</strong>
                          <span>{room.id}</span>
                          <small>{map.name} / {unlocked ? `${room.players}/${room.maxPlayers}` : `Level ${map.unlockLevel}`} / B{room.bluePlayers ?? 0}-R{room.redPlayers ?? 0} / {room.allowBots ? 'Bots' : 'No bots'}</small>
                        </button>
                      );
                    })}
                  </div>
                  <button className="start-button" onClick={joinMatch}>Join Selected Room</button>
                </>
              )}

              {panel === 'create' && (
                <>
                  <div className="section-title">New Room</div>
                  <label>
                    Room name
                    <input value={roomDraft.name} maxLength={18} onChange={(event) => setRoomDraft((draft) => ({ ...draft, name: event.target.value }))} />
                  </label>
                  <div className="section-title">Arena Type</div>
                  <div className="option-grid map-grid">
                    {MAPS.map((map) => (
                      <button
                        className={roomDraft.mapId === map.id ? 'option map-option selected' : 'option map-option'}
                        disabled={!mapUnlocked(map)}
                        key={map.id}
                        onClick={() => mapUnlocked(map) && setRoomDraft((draft) => ({ ...draft, mapId: map.id }))}
                        style={{ '--accent': map.accent, background: `linear-gradient(135deg, ${map.sky}, ${map.ground})` }}
                      >
                        <strong>{map.name}</strong>
                        <span>{mapUnlocked(map) ? '3D arena' : `Unlocks level ${map.unlockLevel}`}</span>
                      </button>
                    ))}
                  </div>
                  <label>
                    Max players
                    <input type="number" min="2" max="6" value={roomDraft.maxPlayers} onChange={(event) => setRoomDraft((draft) => ({ ...draft, maxPlayers: Math.max(2, Math.min(6, Number(event.target.value) || 2)) }))} />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={roomDraft.allowBots}
                      onChange={(event) => setRoomDraft((draft) => ({ ...draft, allowBots: event.target.checked }))}
                    />
                    Add bots to fill empty spots
                  </label>
                  <button className="start-button" onClick={createRoom}>Create Room</button>
                </>
              )}
            </section>
          </div>

          <div className="selected-room-strip">
            <strong>{selectedRoom?.name}</strong>
            <span>{selectedMap.name}</span>
            <span>{selectedRoom?.players}/{selectedRoom?.maxPlayers} players</span>
            <span>Auto team: {autoTeamForRoom(selectedRoom).toUpperCase()}</span>
            <span>{selectedRoom?.allowBots ? 'Bots enabled' : 'Bots disabled'}</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={isScoped ? 'game-3d-shell scoped' : 'game-3d-shell'} dir="ltr">
      <canvas className="world-canvas" ref={canvasRef} />
      <div className="scope-vignette" />
      <div className="crosshair" />
      {deathInfo.isDead && (
        <div className="death-screen">
          <strong>You were eliminated</strong>
          <span>{deathInfo.ready ? 'Ready to return' : `Respawn available in ${deathInfo.seconds}`}</span>
          <button disabled={!deathInfo.ready} onMouseDown={(event) => event.stopPropagation()} onClick={() => worldRef.current?.respawnLocal()}>Return to Match</button>
          <button className="ghost-button" onMouseDown={(event) => event.stopPropagation()} onClick={leaveMatch}>Exit to Lobby</button>
        </div>
      )}
      <header className="hud overlay">
        <div>
          <span className="eyebrow">Room / Map</span>
          <strong>{selectedRoomId} / {MAPS.find((map) => map.id === matchConfig.current.mapId)?.name}</strong>
        </div>
        <div className="scoreboard">
          <span className="blue-score">Blue {score.blue}</span>
          <b>:</b>
          <span className="red-score">{score.red} Red</span>
        </div>
        <button className="exit-match" onClick={leaveMatch}>Exit</button>
      </header>
      <footer className="match-panel overlay">
        <div className="loadout-status">
          <strong>{WEAPONS[matchConfig.current.weaponId].name}</strong>
          <span>{ammo.reloading ? `Reloading ${Math.round(ammo.reloadProgress * 100)}%` : `${ammo.ammo}/${ammo.magazineSize}`} / G:{ammo.grenades ?? 0} / NIS {wallet} / {activeBuffs}</span>
        </div>
        <div className="score-table">
          {score.players.slice(0, 4).map((player) => (
            <span className={player.id === localId ? 'me' : ''} key={player.id}>
              {player.name} {player.kills}/{player.assists}/{player.deaths} {player.score}
            </span>
          ))}
        </div>
        <div className="feed">
          {events.slice(0, 3).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      </footer>
    </main>
  );
}

export default App;
