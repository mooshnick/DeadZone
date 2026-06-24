import { useState } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { ACCESSORIES, GAME_MODES, GAME_MODE_RULES, GRENADE_SKINS, MAPS, MATCH_TIME_OPTIONS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';
import { KEYBIND_LABELS } from '../app/appConstants';

export function Lobby(props) {
  if (props.screen === 'loading') {
    return (
      <main className="menu-shell">
        <div className="session-loader">Restoring session...</div>
      </main>
    );
  }

  if (props.screen === 'auth') {
    return <AuthenticationScreen {...props} />;
  }

  if (props.panel === 'player') {
    return <PlayerScreen {...props} />;
  }

  if (props.panel === 'settings') {
    return <SettingsScreen {...props} />;
  }

  if (props.panel === 'play' || props.panel === 'create') {
    return <PlayScreen {...props} />;
  }

  return <MainMenu {...props} />;
}

function AuthenticationScreen({ accountStatus, authMode, credentials, handleAccountAction, setAuthMode, setCredentials }) {
  const mode = authMode || null;
  const outfit = OUTFITS[0];

  return (
    <main className="menu-shell auth-screen">
      <section className={mode ? 'auth-stage form-mode' : 'auth-stage'}>
        <div className="auth-landing-art">
          <h1 className="auth-title">DEAD ZONE</h1>
          <span className="auth-subtitle">Enter the arena</span>
        </div>
        <CharacterPreview outfit={outfit} variant="hero" />

        {!mode && (
          <div className="auth-choice">
            <button className="primary-command" onClick={() => setAuthMode('login')}>Login</button>
            <button className="secondary-command" onClick={() => setAuthMode('register')}>Register</button>
          </div>
        )}

        {mode && (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleAccountAction(mode);
            }}
          >
            <header>
              <strong>{mode === 'login' ? 'Welcome back' : mode === 'verify' ? 'Verify email' : 'Create account'}</strong>
              <button type="button" className="icon-command" title="Close" onClick={() => setAuthMode(null)}>×</button>
            </header>
            {mode !== 'verify' && (
              <label>
                Username
                <input
                  autoFocus
                  autoComplete="username"
                  value={credentials.username}
                  onChange={(event) => setCredentials((draft) => ({ ...draft, username: event.target.value }))}
                />
              </label>
            )}
            {(mode === 'register' || mode === 'verify') && (
              <label>
                Email
                <input
                  autoFocus={mode === 'verify'}
                  type="email"
                  autoComplete="email"
                  value={credentials.email}
                  onChange={(event) => setCredentials((draft) => ({ ...draft, email: event.target.value }))}
                />
              </label>
            )}
            {mode !== 'verify' && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={credentials.password}
                  onChange={(event) => setCredentials((draft) => ({ ...draft, password: event.target.value }))}
                />
              </label>
            )}
            {mode === 'register' && (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={credentials.confirmPassword}
                  onChange={(event) => setCredentials((draft) => ({ ...draft, confirmPassword: event.target.value }))}
                />
              </label>
            )}
            {mode === 'verify' && (
              <label>
                6-digit code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={credentials.verificationCode}
                  onChange={(event) => setCredentials((draft) => ({ ...draft, verificationCode: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
                />
              </label>
            )}
            {accountStatus && <div className="form-message">{accountStatus}</div>}
            <button className="primary-command" type="submit">
              {mode === 'login' ? 'Login' : mode === 'verify' ? 'Verify Code' : 'Create Account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function MainMenu({
  accessoryIds,
  account,
  claimMissionReward,
  grenadeSkinId,
  level,
  levelProgress,
  missionCards,
  outfitId,
  selectedGrenadeSkin,
  selectedWeaponSkin,
  rerollMission,
  setPanel,
  signOut,
  wallet,
  weaponSkinId,
  xp,
}) {
  const outfit = OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0];
  const accessories = (accessoryIds || []).map((id) => ACCESSORIES.find((item) => item.id === id)).filter(Boolean);

  return (
    <main className="menu-shell">
      <header className="menu-topbar">
        <div className="menu-brand compact">
          <span>DEADZONE</span>
          <small>{account?.username} / 🪙 {wallet}</small>
        </div>
        <ProgressBadge level={level} levelProgress={levelProgress} xp={xp} />
        <div className="topbar-actions">
          <button className="settings-command" title="Settings" aria-label="Settings" onClick={() => setPanel('settings')}>⚙</button>
          <button className="logout-command" onClick={signOut}>Logout</button>
        </div>
      </header>
      <section className="main-menu">
        <CharacterPreview
          outfit={outfit}
          accessories={accessories}
          weaponId="rifle"
          weaponColor={WEAPON_SKINS.find((skin) => skin.id === weaponSkinId)?.color || selectedWeaponSkin.color}
          grenadeColor={GRENADE_SKINS.find((skin) => skin.id === grenadeSkinId)?.color || selectedGrenadeSkin.color}
          variant="hero"
        />
        <div className="main-actions">
          <button className="secondary-command" onClick={() => setPanel('player')}>My Player</button>
          <button className="primary-command" onClick={() => setPanel('play')}>Start Playing</button>
        </div>
        <MissionBoard missions={missionCards} onClaim={claimMissionReward} onReroll={rerollMission} />
      </section>
    </main>
  );
}

function MissionBoard({ missions = [], onClaim, onReroll }) {
  return (
    <aside className="mission-board">
      <header>
        <span>Daily Missions</span>
        <strong>Earn rewards</strong>
      </header>
      <div className="mission-list">
        {missions.map((mission) => (
          <article className={mission.claimed ? 'mission-card claimed' : mission.ready ? 'mission-card ready' : 'mission-card'} key={mission.id}>
            <div>
              <strong>{mission.title}</strong>
              <small>{mission.description}</small>
            </div>
            <span>{Math.min(mission.progress, mission.target)}/{mission.target}</span>
            <i><b style={{ width: `${mission.percent}%` }} /></i>
            <em>
              {mission.claimed
                ? `New mission in ${mission.resetCountdown}`
                : `🪙 ${mission.rewardMoney} / ${mission.rewardXp} XP`}
            </em>
            {mission.ready && !mission.claimed && (
              <button className="mission-action claim" onClick={() => onClaim?.(mission.id)}>Claim Reward</button>
            )}
            {!mission.ready && !mission.claimed && (
              <button className="mission-action" onClick={() => onReroll?.(mission.id)}>
                {mission.rerollCost === 0 ? 'Change Free' : `Change 🪙 ${mission.rerollCost}`}
              </button>
            )}
          </article>
        ))}
      </div>
    </aside>
  );
}
function ProgressBadge({ level, levelProgress, xp }) {
  return (
    <div className="menu-progress-badge">
      <span>Level {level}</span>
      <strong>{xp} XP</strong>
      <i><b style={{ width: `${levelProgress}%` }} /></i>
    </div>
  );
}

function SettingsScreen({
  editingKeybind,
  keybinds,
  level,
  levelProgress,
  resetKeybinds,
  setEditingKeybind,
  setPanel,
  xp,
}) {
  return (
    <main className="menu-shell">
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>Back to Main Menu</button>
        <ProgressBadge level={level} levelProgress={levelProgress} xp={xp} />
        <strong>Settings</strong>
      </header>
      <section className="settings-screen">
        <div className="settings-card">
          <header>
            <span>Controls</span>
            <strong>Keyboard Settings</strong>
          </header>
          <div className="keybind-list">
            {Object.entries(KEYBIND_LABELS).map(([action, label]) => (
              <button
                className={editingKeybind === action ? 'keybind-row listening' : 'keybind-row'}
                key={action}
                onClick={() => setEditingKeybind(action)}
              >
                <span>{label}</span>
                <strong>{editingKeybind === action ? 'Press key...' : keybinds[action]}</strong>
              </button>
            ))}
          </div>
          <div className="settings-actions">
            <button className="secondary-command" onClick={resetKeybinds}>Reset Controls</button>
            <button className="primary-command" onClick={() => setPanel('main')}>Done</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PlayerScreen({
  accessoryIds,
  buyOrEquipAccessory,
  buyOrEquipGrenadeSkin,
  buyOrEquipOutfit,
  buyOrEquipWeaponSkin,
  grenadeSkinId,
  ownedGrenadeSkins,
  ownedAccessories,
  ownedOutfits,
  ownedWeaponSkins,
  outfitId,
  level,
  levelProgress,
  previewOutfit,
  previewWeaponSkin,
  previewGrenadeSkin,
  previewAccessory,
  previewedOutfit,
  previewedWeaponSkin,
  previewedGrenadeSkin,
  previewedAccessories,
  selectedGrenadeSkin,
  selectedWeaponSkin,
  setPanel,
  setPreviewGrenadeSkin,
  setPreviewAccessory,
  setPreviewOutfit,
  setPreviewWeaponSkin,
  selectWeapon,
  upgradeWeapon,
  wallet,
  weaponId,
  weaponSkinId,
  weaponUnlocked,
  weaponUpgrades,
  xp,
}) {
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [customizerTab, setCustomizerTab] = useState('outfits');
  const outfit = previewOutfit || previewedOutfit || OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0];
  const weaponSkin = previewWeaponSkin || previewedWeaponSkin || selectedWeaponSkin;
  const grenadeSkin = previewGrenadeSkin || previewedGrenadeSkin || selectedGrenadeSkin;
  const accessories = previewedAccessories || [];

  const requestPurchase = (item, owned, action) => {
    if (owned || item.price === 0) {
      action();
      return;
    }
    setPendingPurchase({ item, action });
  };
  const accessoriesBySlot = (slots) => ACCESSORIES.filter((item) => slots.includes(item.slot));
  const activeAccessoryIdForSlot = (slot) => previewAccessory?.slot === slot
    ? previewAccessory.id
    : accessoryIds.find((id) => ACCESSORIES.find((accessory) => accessory.id === id)?.slot === slot);
  const renderAccessoryStoreItem = (item) => (
    <StoreItem
      key={item.id}
      active={activeAccessoryIdForSlot(item.slot) === item.id}
      color={item.color}
      equipped={accessoryIds.includes(item.id)}
      kind={item.slot}
      name={item.name}
      owned={ownedAccessories.includes(item.id)}
      price={item.price}
      subtitle={item.slot}
      onPreview={() => setPreviewAccessory(item)}
      onAction={() => requestPurchase(item, ownedAccessories.includes(item.id), () => buyOrEquipAccessory(item))}
    />
  );

  return (
    <main className="menu-shell">
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>← Back to Main Menu</button>
        <div className="topbar-actions">
          <ProgressBadge level={level} levelProgress={levelProgress} xp={xp} />
          <button className="settings-command" title="Settings" aria-label="Settings" onClick={() => setPanel('settings')}>⚙</button>
          <strong>🪙 {wallet}</strong>
        </div>
      </header>
      <section className="player-customizer">
        <aside className="customizer-preview">
          <CharacterPreview accessories={accessories} outfit={outfit} weaponColor={weaponSkin.color} grenadeColor={grenadeSkin.color} variant="side" weaponId={weaponId} />
          <strong>{outfit.name}</strong>
          <span>{WEAPONS[weaponId].name} / {weaponSkin.name} / {grenadeSkin.name}</span>
          {!!accessories.length && <small>{accessories.map((item) => item.name).join(' / ')}</small>}
        </aside>
        <div className="store-panel">
          <div className="customizer-tabs" role="tablist" aria-label="Customizer sections">
            <button className={customizerTab === 'outfits' ? 'active' : ''} onClick={() => setCustomizerTab('outfits')}>Outfits</button>
            <button className={customizerTab === 'weapons' ? 'active' : ''} onClick={() => setCustomizerTab('weapons')}>Weapons</button>
          </div>
          <div className="store-scroll-area">
            {customizerTab === 'outfits' ? (
              <>
                <StoreSection title="Player Colors">
                  {OUTFITS.map((item) => (
                    <StoreItem
                      key={item.id}
                      active={(previewOutfit?.id || outfitId) === item.id}
                      color={item.displayColor || item.shell}
                      equipped={outfitId === item.id}
                      kind="outfit"
                      name={item.name}
                      owned={ownedOutfits.includes(item.id)}
                      price={item.price}
                      onPreview={() => setPreviewOutfit(item)}
                      onAction={() => requestPurchase(item, ownedOutfits.includes(item.id), () => buyOrEquipOutfit(item))}
                    />
                  ))}
                </StoreSection>
                <StoreSection title="Hats, Hair & Face">
                  {accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessoryStoreItem)}
                </StoreSection>
                <StoreSection title="Middle Wear">
                  {accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail']).map(renderAccessoryStoreItem)}
                </StoreSection>
                <StoreSection title="Shoes & Rides">
                  {accessoriesBySlot(['shoes']).map(renderAccessoryStoreItem)}
                </StoreSection>
              </>
            ) : (
              <>
                <StoreSection title="Weapons">
                  {Object.entries(WEAPONS).map(([id, weapon]) => (
                    <button
                      className={weaponId === id ? 'loadout-row active' : 'loadout-row'}
                      disabled={!weaponUnlocked(weapon)}
                      key={id}
                      onClick={() => weaponUnlocked(weapon) && selectWeapon(id)}
                    >
                      <StoreVisual color={weapon.color} kind="weapon" weaponId={id} />
                      <span><strong>{weapon.name}</strong><small>{weapon.tag}</small></span>
                      <span>MK {weaponUpgrades[id] || 0}</span>
                      {weaponUnlocked(weapon) && (
                        <em onClick={(event) => { event.stopPropagation(); upgradeWeapon(id); }}>
                          Upgrade
                        </em>
                      )}
                    </button>
                  ))}
                </StoreSection>
                <StoreSection title="Weapon Skins">
                  {WEAPON_SKINS.map((item) => (
                    <StoreItem
                      key={item.id}
                      active={(previewWeaponSkin?.id || weaponSkinId) === item.id}
                      color={item.color}
                      equipped={weaponSkinId === item.id}
                      kind="weapon-skin"
                      name={item.name}
                      owned={ownedWeaponSkins.includes(item.id)}
                      price={item.price}
                      onPreview={() => setPreviewWeaponSkin(item)}
                      onAction={() => requestPurchase(item, ownedWeaponSkins.includes(item.id), () => buyOrEquipWeaponSkin(item))}
                    />
                  ))}
                </StoreSection>
                <StoreSection title="Grenade Skins">
                  {GRENADE_SKINS.map((item) => (
                    <StoreItem
                      key={item.id}
                      active={(previewGrenadeSkin?.id || grenadeSkinId) === item.id}
                      color={item.color}
                      equipped={grenadeSkinId === item.id}
                      kind="grenade"
                      name={item.name}
                      owned={ownedGrenadeSkins.includes(item.id)}
                      price={item.price}
                      onPreview={() => setPreviewGrenadeSkin(item)}
                      onAction={() => requestPurchase(item, ownedGrenadeSkins.includes(item.id), () => buyOrEquipGrenadeSkin(item))}
                    />
                  ))}
                </StoreSection>
              </>
            )}
          </div>
          <div className="customizer-footer">
            <button className="primary-command" onClick={() => setPanel('main')}>Continue</button>
          </div>
        </div>
      </section>
      {pendingPurchase && (
        <div className="purchase-modal" role="dialog" aria-modal="true">
          <div>
            <strong>Confirm purchase</strong>
            <span>{pendingPurchase.item.name} costs 🪙 {pendingPurchase.item.price}.</span>
            <div className="purchase-actions">
              <button className="secondary-command" onClick={() => setPendingPurchase(null)}>Cancel</button>
              <button
                className="primary-command"
                onClick={() => {
                  pendingPurchase.action();
                  setPendingPurchase(null);
                }}
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StoreSection({ children, title }) {
  return (
    <section className="store-section">
      <h2>{title}</h2>
      <div className="store-grid">{children}</div>
    </section>
  );
}

function StoreItem({ active, color, equipped, kind, name, onAction, onPreview, owned, price, subtitle }) {
  return (
    <article className={active ? 'store-item active' : 'store-item'}>
      <button className="store-preview" onClick={onPreview || onAction}>
        <StoreVisual color={color} kind={kind} />
        <strong>{name}</strong>
        {subtitle && <small>{subtitle}</small>}
      </button>
      <button className="store-buy" onClick={onAction}>
        {owned ? (equipped ? 'Equipped' : 'Equip') : `🪙 ${price}`}
      </button>
    </article>
  );
}

function PlayScreen({
  accountStatus,
  answerFriendRequest,
  answerRoomInvite,
  createRoom,
  findPlayers,
  inviteFriend,
  joinMatch,
  joinRoomByCode,
  level,
  levelProgress,
  mapUnlocked,
  panel,
  roomDraft,
  rooms,
  social,
  playerSearchResults,
  requestFriendship,
  selectedRoom,
  selectedRoomId,
  setPanel,
  setRoomDraft,
  setSelectedRoomId,
  xp,
}) {
  const [gameCode, setGameCode] = useState('');

  return (
    <main className="menu-shell">
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>← Back to Main Menu</button>
        <div className="topbar-actions">
          <ProgressBadge level={level} levelProgress={levelProgress} xp={xp} />
          <button className="settings-command" title="Settings" aria-label="Settings" onClick={() => setPanel('settings')}>⚙</button>
          <strong>Multiplayer Lobby</strong>
        </div>
      </header>
      <section className="play-lobby">
        <div className="multiplayer-hub">
          <div className="room-browser">
          <header>
            <div>
              <span>OPEN ROOMS</span>
              <strong>Choose a battle</strong>
            </div>
            <button className="add-room-command" title="Create a new room" onClick={() => setPanel('create')}>+</button>
          </header>

          {panel === 'create' ? (
            <CreateRoomForm
              createRoom={createRoom}
              mapUnlocked={mapUnlocked}
              roomDraft={roomDraft}
              setPanel={setPanel}
              setRoomDraft={setRoomDraft}
            />
          ) : (
            <>
              <div className="room-list-clean">
                {rooms.map((room) => {
                  const map = MAPS.find((item) => item.id === room.mapId) || MAPS[0];
                  const mode = GAME_MODES.find((item) => item.id === room.gameMode) || GAME_MODES[0];
                  return (
                    <button
                      className={room.id === selectedRoomId ? 'room-card active' : 'room-card'}
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                    >
                      <span className="room-color" style={{ background: map.accent }} />
                      <span><strong>{room.name}</strong><small>{mode.short} / {map.name} / First to {room.scoreLimit} / {room.timeLimitMinutes} min / Code {room.id}</small></span>
                      <span>{room.players}/{room.maxPlayers}</span>
                    </button>
                  );
                })}
                {!rooms.length && <div className="empty-rooms">No rooms are currently open.</div>}
              </div>
              <button className="primary-command join-room-command" disabled={!selectedRoomId} onClick={joinMatch}>
                Join Selected Room
              </button>
              <form
                className="game-code-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  joinRoomByCode(gameCode);
                }}
              >
                <label>
                  Game Code
                  <input
                    placeholder="Enter invite code"
                    value={gameCode}
                    onChange={(event) => setGameCode(event.target.value.toUpperCase())}
                  />
                </label>
                <button type="submit">Find Room</button>
              </form>
            </>
          )}
          {accountStatus && <div className="lobby-message">{accountStatus}</div>}
          </div>
          <SocialPanel
            answerFriendRequest={answerFriendRequest}
            answerRoomInvite={answerRoomInvite}
            findPlayers={findPlayers}
            inviteFriend={inviteFriend}
            playerSearchResults={playerSearchResults}
            requestFriendship={requestFriendship}
            selectedRoom={selectedRoom}
            social={social}
          />
        </div>
      </section>
    </main>
  );
}

function SocialPanel({
  answerFriendRequest,
  answerRoomInvite,
  findPlayers,
  inviteFriend,
  playerSearchResults = [],
  requestFriendship,
  selectedRoom,
  social = {},
}) {
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const requestCount = (social.incomingRequests?.length || 0) + (social.roomInvites?.length || 0);

  return (
    <aside className="social-panel">
      <header>
        <div>
          <span>SQUAD</span>
          <strong>Friends & Invites</strong>
        </div>
        {!!requestCount && <b>{requestCount}</b>}
      </header>
      <div className="social-tabs">
        <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>Friends</button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Requests</button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}>Invites</button>
      </div>
      <div className="social-scroll">
        {tab === 'friends' && (
          <>
            <form
              className="friend-search"
              onSubmit={(event) => {
                event.preventDefault();
                findPlayers(query);
              }}
            >
              <input
                placeholder="Search username"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit" title="Search players">Search</button>
            </form>
            {!!playerSearchResults.length && (
              <div className="social-list search-results">
                {playerSearchResults.map((player) => (
                  <div className="social-row" key={player.id}>
                    <span><strong>{player.username}</strong><small>Level {player.level}</small></span>
                    <button onClick={() => requestFriendship(player.username)}>Add</button>
                  </div>
                ))}
              </div>
            )}
            <div className="social-section-title">
              <span>Your friends</span>
              <small>{selectedRoom ? `Invite to ${selectedRoom.id}` : 'Select a room first'}</small>
            </div>
            <div className="social-list">
              {(social.friends || []).map((friend) => (
                <div className="social-row" key={friend.id}>
                  <span><strong>{friend.username}</strong><small>Level {friend.level}</small></span>
                  <button disabled={!selectedRoom} onClick={() => inviteFriend(friend.id)}>Invite</button>
                </div>
              ))}
              {!social.friends?.length && <p className="social-empty">Search for a username and send your first friend request.</p>}
            </div>
          </>
        )}
        {tab === 'requests' && (
          <div className="social-list">
            {(social.incomingRequests || []).map((request) => (
              <div className="social-row stacked" key={request.id}>
                <span><strong>{request.user.username}</strong><small>wants to be your friend</small></span>
                <div>
                  <button onClick={() => answerFriendRequest(request.id, true)}>Accept</button>
                  <button className="muted" onClick={() => answerFriendRequest(request.id, false)}>Decline</button>
                </div>
              </div>
            ))}
            {(social.outgoingRequests || []).map((request) => (
              <div className="social-row pending" key={request.id}>
                <span><strong>{request.user.username}</strong><small>Request pending</small></span>
              </div>
            ))}
            {!social.incomingRequests?.length && !social.outgoingRequests?.length && (
              <p className="social-empty">No pending friend requests.</p>
            )}
          </div>
        )}
        {tab === 'invites' && (
          <div className="social-list">
            {(social.roomInvites || []).map((invite) => (
              <div className="social-row stacked" key={invite.id}>
                <span>
                  <strong>{invite.sender.username}</strong>
                  <small>{invite.room.name} / Code {invite.room.id}</small>
                </span>
                <div>
                  <button onClick={() => answerRoomInvite(invite.id, true)}>Accept</button>
                  <button className="muted" onClick={() => answerRoomInvite(invite.id, false)}>Decline</button>
                </div>
              </div>
            ))}
            {!social.roomInvites?.length && <p className="social-empty">No room invitations right now.</p>}
          </div>
        )}
      </div>
    </aside>
  );
}

function CreateRoomForm({ createRoom, mapUnlocked, roomDraft, setPanel, setRoomDraft }) {
  const modeRules = GAME_MODE_RULES[roomDraft.gameMode] || GAME_MODE_RULES['team-deathmatch'];
  return (
    <div className="create-room-form">
      <label>
        Room name
        <input
          value={roomDraft.name}
          onChange={(event) => setRoomDraft((draft) => ({ ...draft, name: event.target.value }))}
        />
      </label>
      <div className="map-choice-grid">
        {MAPS.map((map) => (
          <button
            className={roomDraft.mapId === map.id ? 'map-choice active' : 'map-choice'}
            disabled={!mapUnlocked(map)}
            key={map.id}
            onClick={() => setRoomDraft((draft) => ({ ...draft, mapId: map.id }))}
          >
            <i style={{ background: map.accent }} />
            <span>{map.name}</span>
          </button>
        ))}
      </div>
      <div className="mode-choice-grid">
        {GAME_MODES.map((mode) => (
          <button
            className={roomDraft.gameMode === mode.id ? 'mode-choice active' : 'mode-choice'}
            key={mode.id}
            onClick={() => setRoomDraft((draft) => ({
              ...draft,
              gameMode: mode.id,
              scoreLimit: GAME_MODE_RULES[mode.id].defaultScore,
            }))}
          >
            <strong>{mode.short}</strong>
            <span>{mode.name}</span>
            <small>{mode.description}</small>
          </button>
        ))}
      </div>
      <div className="room-rule-grid">
        <label>
          Score target
          <input
            type="number"
            min={modeRules.minScore}
            max={modeRules.maxScore}
            step={modeRules.scoreStep}
            value={roomDraft.scoreLimit}
            onChange={(event) => setRoomDraft((draft) => ({
              ...draft,
              scoreLimit: Math.max(modeRules.minScore, Math.min(modeRules.maxScore, Number(event.target.value) || modeRules.defaultScore)),
            }))}
          />
          <small>Allowed: {modeRules.minScore}–{modeRules.maxScore}</small>
        </label>
        <label>
          Match time
          <select
            value={roomDraft.timeLimitMinutes}
            onChange={(event) => setRoomDraft((draft) => ({ ...draft, timeLimitMinutes: Number(event.target.value) }))}
          >
            {MATCH_TIME_OPTIONS.map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}
          </select>
          <small>Maximum 20 minutes</small>
        </label>
      </div>
      <label>
        Max players
        <input
          type="number"
          min="2"
          max="6"
          value={roomDraft.maxPlayers}
          onChange={(event) => setRoomDraft((draft) => ({
            ...draft,
            maxPlayers: Math.max(2, Math.min(6, Number(event.target.value) || 2)),
          }))}
        />
      </label>
      <label className="simple-check">
        <input
          type="checkbox"
          checked={roomDraft.allowBots}
          onChange={(event) => setRoomDraft((draft) => ({ ...draft, allowBots: event.target.checked }))}
        />
        Fill empty spots with bots
      </label>
      <div className="create-actions">
        <button className="secondary-command" onClick={() => setPanel('play')}>Cancel</button>
        <button className="primary-command" onClick={createRoom}>Create Room</button>
      </div>
    </div>
  );
}

