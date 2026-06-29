import { useEffect, useState } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { MatchPauseMenu } from './MatchPauseMenu';
import { MobileTouchControls } from './MobileTouchControls';
import { ACCESSORIES, GAME_MODES, GRENADE_SKINS, MAPS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';

const MOBILE_CONTROL_DEFAULTS = {
  aim: { x: 76, y: 25, size: 1 },
  grenade: { x: 76, y: 72, size: 1 },
  joystick: { x: 14, y: 72, size: 1 },
  jump: { x: 76, y: 41, size: 1 },
  reload: { x: 76, y: 56, size: 1 },
  shoot: { x: 89, y: 49, size: 1 },
};

const MOBILE_CONTROL_NAMES = {
  aim: 'Aim',
  grenade: 'Grenade',
  joystick: 'Movement',
  jump: 'Jump',
  reload: 'Reload',
  shoot: 'Shoot',
};

function loadMobileControls() {
  try {
    return {
      ...MOBILE_CONTROL_DEFAULTS,
      ...(JSON.parse(localStorage.getItem('deadzone-mobile-controls')) || {}),
    };
  } catch {
    return MOBILE_CONTROL_DEFAULTS;
  }
}

export function MatchHud({
  activeBuffs,
  ammo,
  canvasRef,
  currentMatch,
  deathInfo,
  equippedAccessoryIds,
  equipOwnedOutfitDuringMatch,
  equipWeaponDuringMatch,
  events,
  grenadeCharge,
  grenadeSkinId,
  health,
  isScoped,
  leaveMatch,
  localId,
  onToggleAccessoryDuringMatch,
  outfitId,
  ownedAccessories,
  ownedOutfits,
  score,
  selectedRoomId,
  wallet,
  weaponId,
  weaponSkinId,
  weaponUnlocked,
  level,
  levelProgress,
  matchResult,
  onMobileGrenadeEnd,
  onMobileGrenadeStart,
  onMobileJump,
  onMobileLook,
  onMobileMove,
  onMobileReload,
  onMobileReset,
  onMobileScopeToggle,
  onMobileShootEnd,
  onMobileShootStart,
  showScoreboard,
  worldRef,
  xp,
}) {
  const [showDeathCustomizer, setShowDeathCustomizer] = useState(false);
  const [deathCustomizerTab, setDeathCustomizerTab] = useState('outfits');
  const [pauseCustomizerTab, setPauseCustomizerTab] = useState('outfits');
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [compactHud, setCompactHud] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [mobileEditMode, setMobileEditMode] = useState(false);
  const [selectedMobileControl, setSelectedMobileControl] = useState('shoot');
  const [mobileControls, setMobileControls] = useState(loadMobileControls);
  const weapon = WEAPONS[weaponId] || WEAPONS[currentMatch.weaponId] || WEAPONS.rifle;
  const previewOutfit = OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0];
  const previewAccessories = equippedAccessoryIds.map((id) => ACCESSORIES.find((item) => item.id === id)).filter(Boolean);
  const previewWeaponSkin = WEAPON_SKINS.find((item) => item.id === weaponSkinId) || WEAPON_SKINS[0];
  const previewGrenadeSkin = GRENADE_SKINS.find((item) => item.id === grenadeSkinId) || GRENADE_SKINS[0];
  const mapName = MAPS.find((map) => map.id === currentMatch.mapId)?.name || 'Arena';
  const mode = GAME_MODES.find((item) => item.id === (score.mode || currentMatch.gameMode)) || GAME_MODES[0];
  const reloadPercent = Math.round((ammo.reloadProgress || 0) * 100);
  const grenadeCount = Math.min(3, ammo.grenades ?? 0);
  const freeForAll = mode.id === 'free-for-all';
  const leader = score.players[0];
  const remainingMinutes = Math.floor((score.remainingSeconds || 0) / 60);
  const remainingClockSeconds = String((score.remainingSeconds || 0) % 60).padStart(2, '0');
  const bluePlayers = score.players.filter((player) => player.team === 'blue');
  const redPlayers = score.players.filter((player) => player.team === 'red');
  const activeAccessoryIdForSlot = (slot) => equippedAccessoryIds.find((id) => ACCESSORIES.find((item) => item.id === id)?.slot === slot);
  const accessoriesBySlot = (slots) => ACCESSORIES.filter((item) => ownedAccessories.includes(item.id) && slots.includes(item.slot));
  const renderAccessoryOption = (item) => (
    <button
      className={activeAccessoryIdForSlot(item.slot) === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
      key={item.id}
      onClick={() => onToggleAccessoryDuringMatch(item)}
    >
      <StoreVisual color={item.color} kind={item.slot} />
      <b>{item.name}</b>
      <small>{item.slot}</small>
    </button>
  );

  const sniperScoped = isScoped && weaponId === 'sniper';
  const setPaused = (value) => {
    if (!value) {
      onMobileReset?.();
    }
    setShowPauseMenu(value);
    worldRef.current?.setPaused(value);
  };
  const returnToMatch = () => {
    onMobileReset?.();
    const returned = worldRef.current?.respawnLocal(true);
    if (returned) {
      window.setTimeout(() => onMobileReset?.(), 0);
      setShowDeathCustomizer(false);
    }
  };
  const exitPausedMatch = () => {
    worldRef.current?.setPaused(false);
    setShowPauseMenu(false);
    setShowExitConfirm(false);
    leaveMatch();
  };
  const shellClassName = [
    'game-3d-shell',
    isScoped ? 'scoped' : '',
    sniperScoped ? 'sniper-scoped' : '',
  ].filter(Boolean).join(' ');
  const updateMobileControl = (id, patch) => {
    setMobileControls((current) => {
      const next = {
        ...current,
        [id]: { ...current[id], ...patch },
      };
      localStorage.setItem('deadzone-mobile-controls', JSON.stringify(next));
      return next;
    });
  };
  const resetMobileControls = () => {
    setMobileControls(MOBILE_CONTROL_DEFAULTS);
    setSelectedMobileControl('shoot');
    localStorage.setItem('deadzone-mobile-controls', JSON.stringify(MOBILE_CONTROL_DEFAULTS));
  };

  useEffect(() => {
    if (deathInfo.isDead || showPauseMenu || matchResult) {
      onMobileReset?.();
    }
  }, [deathInfo.isDead, matchResult, onMobileReset, showPauseMenu]);

  return (
    <main className={shellClassName} dir="ltr">
      <canvas className="world-canvas" ref={canvasRef} />
      <div className="scope-vignette" />
      <div className="sniper-scope-overlay">
        <i />
        <b />
        <span />
      </div>
      <div className="crosshair" />
      <MobileTouchControls
        controlConfig={mobileControls}
        disabled={deathInfo.isDead || showPauseMenu || Boolean(matchResult)}
        editMode={showMobileSettings && mobileEditMode}
        grenadeCharge={grenadeCharge}
        grenadeCount={grenadeCount}
        onControlChange={updateMobileControl}
        onGrenadeEnd={onMobileGrenadeEnd}
        onGrenadeStart={onMobileGrenadeStart}
        onJump={onMobileJump}
        onLook={onMobileLook}
        onMove={onMobileMove}
        onReload={onMobileReload}
        onScopeToggle={onMobileScopeToggle}
        onSelectControl={setSelectedMobileControl}
        onShootEnd={onMobileShootEnd}
        onShootStart={onMobileShootStart}
        selectedControl={selectedMobileControl}
        scoped={isScoped}
      />
      <div className={grenadeCharge > 0 && grenadeCount > 0 ? 'grenade-charge-reticle active' : 'grenade-charge-reticle'}>
        <span>{grenadeCharge > 0.82 ? 'Perfect throw' : 'Grenade power'}</span>
        <i><b style={{ width: `${Math.round(grenadeCharge * 100)}%` }} /></i>
      </div>

      {deathInfo.isDead && deathInfo.focusSeconds > 0 && !showDeathCustomizer && (
        <div className="kill-cam-overlay">
          <div className="kill-cam-banner">
            <span>KILL CAM</span>
            <strong>{deathInfo.killerName ? `${deathInfo.killerName} eliminated you` : 'You were eliminated'}</strong>
            <div className="kill-cam-countdown" aria-label={`${deathInfo.seconds} seconds until respawn`}>
              <b>{deathInfo.seconds}</b>
              <small>SECONDS TO RESPAWN</small>
            </div>
          </div>
        </div>
      )}

      {deathInfo.isDead && (deathInfo.focusSeconds <= 0 || showDeathCustomizer) && (
        <div className="death-screen">
          {!showDeathCustomizer ? (
            <>
              <strong>You were eliminated</strong>
              {deathInfo.killerName && (
                <em className="killer-focus-label">
                  Killed by {deathInfo.killerName}
                  {deathInfo.focusSeconds > 0 ? ` ֲ· focus ${deathInfo.focusSeconds}s` : ''}
                </em>
              )}
              <span>{deathInfo.ready ? 'Ready to return' : `Respawn available in ${deathInfo.seconds}`}</span>
              <div className="death-player-stats">
                <div>
                  <span>Cash</span>
                  <strong>נ×™ {wallet}</strong>
                </div>
                <div>
                  <span>Level {level}</span>
                  <strong>{xp} XP</strong>
                  <i><b style={{ width: `${levelProgress}%` }} /></i>
                </div>
              </div>
              <button disabled={!deathInfo.ready} onMouseDown={(event) => event.stopPropagation()} onClick={returnToMatch}>Return to Match</button>
              <button className="ghost-button" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowDeathCustomizer(true)}>Customize Character</button>
              <button className="ghost-button mobile-only-command" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowMobileSettings(true)}>Mobile Controls</button>
              <button className="ghost-button" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowExitConfirm(true)}>Exit to Lobby</button>
            </>
          ) : (
            <div className="death-customizer">
              <header>
                <strong>Customize Character</strong>
                <button className="ghost-button" onClick={() => setShowDeathCustomizer(false)}>Back</button>
              </header>
              <div className="death-customizer-layout">
                <aside className="death-customizer-preview">
                  <CharacterPreview
                    accessories={previewAccessories}
                    grenadeColor={previewGrenadeSkin.color}
                    outfit={previewOutfit}
                    variant="side"
                    weaponColor={previewWeaponSkin.color}
                    weaponId={weaponId}
                  />
                  <strong>{previewOutfit.name}</strong>
                  <span>{weapon.name}</span>
                </aside>
                <div className="death-customizer-options">
                  <div className="customizer-tabs" role="tablist" aria-label="Respawn customizer sections">
                    <button className={deathCustomizerTab === 'outfits' ? 'active' : ''} onClick={() => setDeathCustomizerTab('outfits')}>Outfits</button>
                    <button className={deathCustomizerTab === 'weapons' ? 'active' : ''} onClick={() => setDeathCustomizerTab('weapons')}>Weapons</button>
                  </div>
                  <div className="death-customizer-scroll">
                    {deathCustomizerTab === 'outfits' ? (
                      <>
                        <section>
                          <span>Outfits</span>
                          <div className="death-customizer-grid">
                            {OUTFITS.filter((item) => ownedOutfits.includes(item.id)).map((item) => (
                              <button
                                className={outfitId === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
                                key={item.id}
                                onClick={() => equipOwnedOutfitDuringMatch(item.id)}
                              >
                                <StoreVisual color={item.displayColor || item.shell} kind="outfit" />
                                <b>{item.name}</b>
                              </button>
                            ))}
                          </div>
                        </section>
                        <section>
                          <span>Hats, Hair & Face</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).length && <em>No accessories owned yet</em>}
                          </div>
                        </section>
                        <section>
                          <span>Middle Wear</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail']).length && <em>No accessories owned yet</em>}
                          </div>
                        </section>
                        <section>
                          <span>Shoes & Rides</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['shoes']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['shoes']).length && <em>No accessories owned yet</em>}
                          </div>
                        </section>
                      </>
                    ) : (
                      <section>
                        <span>Weapons for next spawn</span>
                        <div className="death-customizer-grid">
                          {Object.entries(WEAPONS).map(([id, item]) => (
                            <button
                              className={weaponId === id ? 'death-customizer-item active' : 'death-customizer-item'}
                              disabled={!weaponUnlocked(item)}
                              key={id}
                              onClick={() => equipWeaponDuringMatch(id)}
                            >
                              <StoreVisual color={item.color} kind="weapon" weaponId={id} />
                              <b>{item.name}</b>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                  <div className="customizer-footer death-customizer-footer">
                    <button
                      className="primary-command"
                      disabled={!deathInfo.ready}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={returnToMatch}
                    >
                      {deathInfo.ready ? 'Continue' : `Ready in ${deathInfo.seconds}s`}
                    </button>
                    <button className="secondary-command" onClick={() => setShowDeathCustomizer(false)}>Back</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {matchResult && (
        <section className="match-result-overlay">
          <span>{matchResult.localWon ? 'Victory' : matchResult.winner ? 'Match Complete' : 'Draw'}</span>
          <strong>{matchResult.winnerName}</strong>
          <small>{matchResult.reason}</small>
          {matchResult.localWon && <em>Victory bonus: נ×™ 20 +100 XP</em>}
          <button className="primary-command" onClick={leaveMatch}>Return to Lobby</button>
        </section>
      )}

      {showPauseMenu && !deathInfo.isDead && !matchResult && (
        <div className="pause-screen">
          <MatchPauseMenu
            activeTab={pauseCustomizerTab}
            accessoryIds={equippedAccessoryIds}
            equipOutfit={equipOwnedOutfitDuringMatch}
            equipWeapon={equipWeaponDuringMatch}
            grenadeSkinId={grenadeSkinId}
            onContinue={() => setPaused(false)}
            onExit={() => setShowExitConfirm(true)}
            onMobileControls={() => setShowMobileSettings(true)}
            onSetTab={setPauseCustomizerTab}
            onToggleAccessory={onToggleAccessoryDuringMatch}
            outfitId={outfitId}
            ownedAccessories={ownedAccessories}
            ownedOutfits={ownedOutfits}
            weaponId={weaponId}
            weaponSkinId={weaponSkinId}
            weaponUnlocked={weaponUnlocked}
          />
        </div>
      )}

      {showExitConfirm && (
        <section className="exit-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div>
            <strong id="exit-confirm-title">Exit match?</strong>
            <span>Are you sure you want to leave the current game?</span>
            <div>
              <button className="secondary-command" onClick={() => setShowExitConfirm(false)}>Stay</button>
              <button className="danger-command" onClick={exitPausedMatch}>Exit</button>
            </div>
          </div>
        </section>
      )}

      <header className="hud overlay">
        <div className="hud-brand-block">
          <img className="hud-game-logo" src="/Shadow_Logo.png" alt="DeadZone" />
          <div>
            <span className="eyebrow">Room / Map</span>
            <strong>{selectedRoomId} / {mapName}</strong>
            <small>{mode.name}</small>
          </div>
        </div>
        <div className="scoreboard">
          {freeForAll ? (
            <>
              <span className="blue-score">Leader</span>
              <b>{leader ? leader.kills : 0}</b>
              <span className="red-score">{leader?.name || 'None'}</span>
            </>
          ) : (
            <>
              <span className="blue-score">Blue {score.blue}</span>
              <b>:</b>
              <span className="red-score">{score.red} Red</span>
            </>
          )}
        </div>
        <div className="match-rules-status">
          <strong>{remainingMinutes}:{remainingClockSeconds}</strong>
          <span>Target {score.target || currentMatch.scoreLimit}</span>
        </div>
      </header>

      <button
        aria-label="Pause"
        className="pause-match"
        disabled={deathInfo.isDead || Boolean(matchResult)}
        onClick={() => setPaused(true)}
        title="Pause"
      >
        <span />
        <span />
      </button>

      <button
        aria-label="Mobile control settings"
        className="mobile-settings-match"
        onClick={() => setShowMobileSettings(true)}
        type="button"
      >
        {'\u2699'}
      </button>

      {showMobileSettings && (
        <section className="mobile-controls-dialog" role="dialog" aria-modal="true" aria-labelledby="mobile-controls-title">
          <div>
            <header>
              <strong id="mobile-controls-title">Mobile Controls</strong>
              <button type="button" onClick={() => setShowMobileSettings(false)}>Close</button>
            </header>
            <label>
              Control
              <select value={selectedMobileControl} onChange={(event) => setSelectedMobileControl(event.target.value)}>
                {Object.entries(MOBILE_CONTROL_NAMES).map(([id, label]) => (
                  <option value={id} key={id}>{label}</option>
                ))}
              </select>
            </label>
            <button
              className={mobileEditMode ? 'primary-command active' : 'secondary-command'}
              type="button"
              onClick={() => setMobileEditMode((value) => !value)}
            >
              {mobileEditMode ? 'Dragging enabled' : 'Drag buttons'}
            </button>
            <label>
              {MOBILE_CONTROL_NAMES[selectedMobileControl]} size
              <input
                max="1.45"
                min="0.72"
                onChange={(event) => updateMobileControl(selectedMobileControl, { size: Math.max(0.72, Math.min(1.45, Number(event.target.value) || 1)) })}
                step="0.01"
                type="range"
                value={mobileControls[selectedMobileControl]?.size || 1}
              />
              <span>{Math.round((mobileControls[selectedMobileControl]?.size || 1) * 100)}%</span>
            </label>
            <small className="mobile-controls-hint">Open this panel, press "Drag buttons", then drag each control to your favorite spot.</small>
            <button className="secondary-command" type="button" onClick={resetMobileControls}>
              Reset Layout
            </button>
          </div>
        </section>
      )}

      {compactHud && (
        <aside className="health-widget compact-health-bar" aria-label="Health">
          <i><b style={{ width: `${Math.max(0, Math.min(100, Math.round(health ?? 100)))}%` }} /></i>
        </aside>
      )}

      {score.objective && <div className="objective-status">{score.objective}</div>}

      {showScoreboard && (
        <section className="scoreboard-overlay">
          <header>
            <strong>Scoreboard</strong>
            <span>K / A / D / Score</span>
          </header>
          {freeForAll ? (
            <ScoreboardTeam localId={localId} players={score.players} title="All Players" variant="neutral" />
          ) : (
            <div className="scoreboard-teams">
              <ScoreboardTeam localId={localId} players={bluePlayers} title="Blue Team" />
              <ScoreboardTeam localId={localId} players={redPlayers} title="Red Team" />
            </div>
          )}
        </section>
      )}

      <aside className={compactHud ? 'compact-combat-widget minimized' : 'compact-combat-widget'}>
          <strong>{ammo.reloading ? `${reloadPercent}%` : `${ammo.ammo}/${ammo.magazineSize}`}</strong>
          <small><span aria-hidden="true">{'\u{1F4A3}'}</span>{grenadeCount}</small>
      </aside>

      <footer className={compactHud ? 'match-panel overlay compact' : 'match-panel overlay'}>
        <button
          className="hud-collapse-toggle"
          title={compactHud ? 'Open combat HUD' : 'Minimize combat HUD'}
          onClick={() => setCompactHud((value) => !value)}
        >
          {compactHud ? 'גƒ' : 'ג„'}
        </button>
        <div className="combat-readout">
          <div className="readout-card weapon-card">
            <span>Weapon</span>
            <strong>{weapon.name}</strong>
            <small>{activeBuffs}</small>
          </div>
          <div className={ammo.reloading ? 'readout-card ammo-card reloading' : 'readout-card ammo-card'}>
            <span>{ammo.reloading ? 'Reload' : 'Ammo'}</span>
            <strong>{ammo.reloading ? `${reloadPercent}%` : ammo.ammo}</strong>
            <small>{ammo.reloading ? 'R in progress' : `/ ${ammo.magazineSize}`}</small>
            <i style={{ '--reload': `${reloadPercent}%` }} />
          </div>
          <div className="readout-card grenade-card">
            <span>Grenades</span>
            <strong>{grenadeCount}<small>/3</small></strong>
            <div className="grenade-pips">
              {[0, 1, 2].map((slot) => <b className={slot < grenadeCount ? 'filled' : ''} key={slot} />)}
            </div>
          </div>
          <div className="readout-card health-card">
            <span>Health</span>
            <strong>{Math.max(0, Math.min(100, Math.round(health ?? 100)))}</strong>
            <small>HP</small>
            <i style={{ '--health': `${Math.max(0, Math.min(100, Math.round(health ?? 100)))}%` }} />
          </div>
          <div className="readout-card wallet-card">
            <span>Cash</span>
            <strong>נ×™ {wallet}</strong>
            <small>kills pay</small>
          </div>
        </div>

        <div className="feed">
          {events.slice(0, 3).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      </footer>
    </main>
  );
}

function ScoreboardTeam({ localId, players, title, variant }) {
  return (
    <section className={variant === 'neutral' ? 'scoreboard-team neutral' : title.startsWith('Red') ? 'scoreboard-team red' : 'scoreboard-team blue'}>
      <header>
        <strong>{title}</strong>
        <span>K</span>
        <span>A</span>
        <span>D</span>
        <span>Score</span>
      </header>
      <div>
        {players.map((player) => (
          <article className={player.id === localId ? 'me' : ''} key={player.id}>
            <b>{player.name}</b>
            <strong>{player.kills}</strong>
            <strong>{player.assists}</strong>
            <strong>{player.deaths}</strong>
            <em>{player.score}</em>
          </article>
        ))}
        {!players.length && <small>No players yet</small>}
      </div>
    </section>
  );
}
