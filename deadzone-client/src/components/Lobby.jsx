import { KEYBIND_LABELS } from '../app/appConstants';
import { MAPS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';

export function Lobby({
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
}) {
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
                <div className="profile-panel">
                  <div className="profile-panel-header">
                    <span>Player Profile</span>
                    <strong>{account ? `Signed in as ${account.username}` : 'Create or load your fighter'}</strong>
                  </div>
                  <label>
                    Display name
                    <input value={name} maxLength={16} onChange={(event) => setName(event.target.value)} />
                  </label>
                  <div className="account-box">
                    <label>
                      Username
                      <input
                        placeholder="test"
                        value={credentials.username}
                        maxLength={16}
                        onChange={(event) => setCredentials((draft) => ({ ...draft, username: event.target.value }))}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        placeholder="1234"
                        type="password"
                        value={credentials.password}
                        maxLength={24}
                        onChange={(event) => setCredentials((draft) => ({ ...draft, password: event.target.value }))}
                      />
                    </label>
                    <div className="account-actions">
                      <button className="login-button" onClick={() => handleAccountAction('login')}>Login</button>
                      <button className="create-account-button" onClick={() => handleAccountAction('register')}>Create Account</button>
                      {account && <button className="ghost-button" onClick={signOut}>Sign Out</button>}
                    </div>
                    <small className={account ? 'account-status connected' : 'account-status'}>{account ? 'Progress, money and unlocks are saved.' : accountStatus}</small>
                  </div>
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
                      className={(previewOutfit?.id || previewedOutfit.id) === outfit.id ? 'option outfit-option selected' : 'option outfit-option'}
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
