import { useState } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { MatchPauseMenu } from './MatchPauseMenu';
import { ACCESSORIES, GAME_MODES, GRENADE_SKINS, MAPS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';

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
    setShowPauseMenu(value);
    worldRef.current?.setPaused(value);
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
    compactHud ? 'hud-minimized' : '',
  ].filter(Boolean).join(' ');

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
      <div className={grenadeCharge > 0 && grenadeCount > 0 ? 'grenade-charge-reticle active' : 'grenade-charge-reticle'}>
        <span>{grenadeCharge > 0.82 ? 'Perfect throw' : 'Grenade power'}</span>
        <i><b style={{ width: `${Math.round(grenadeCharge * 100)}%` }} /></i>
      </div>

      {deathInfo.isDead && (
        <div className="death-screen">
          {!showDeathCustomizer ? (
            <>
              <strong>You were eliminated</strong>
              {deathInfo.killerName && (
                <em className="killer-focus-label">
                  Killed by {deathInfo.killerName}
                  {deathInfo.focusSeconds > 0 ? ` · focus ${deathInfo.focusSeconds}s` : ''}
                </em>
              )}
              <span>{deathInfo.ready ? 'Ready to return' : `Respawn available in ${deathInfo.seconds}`}</span>
              <button disabled={!deathInfo.ready} onMouseDown={(event) => event.stopPropagation()} onClick={() => worldRef.current?.respawnLocal()}>Return to Match</button>
              <button className="ghost-button" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowDeathCustomizer(true)}>Customize Character</button>
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
                      onClick={() => worldRef.current?.respawnLocal()}
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
          {matchResult.localWon && <em>Victory bonus: 🪙 20 +100 XP</em>}
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
        <div className="hud-progression">
          <span>Level {level}</span>
          <strong>{xp} XP</strong>
          <i><b style={{ width: `${levelProgress}%` }} /></i>
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

      {compactHud && (
        <aside className="health-widget" aria-label="Health">
          <span>Health</span>
          <strong>{Math.max(0, Math.min(100, Math.round(health ?? 100)))} HP</strong>
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
          <span>Ammo / Grenades</span>
          <strong>{ammo.reloading ? `${reloadPercent}%` : `${ammo.ammo}/${ammo.magazineSize}`}</strong>
          <small>Grenades {grenadeCount}/3</small>
      </aside>

      <footer className={compactHud ? 'match-panel overlay compact' : 'match-panel overlay'}>
        <button
          className="hud-collapse-toggle"
          title={compactHud ? 'Open combat HUD' : 'Minimize combat HUD'}
          onClick={() => setCompactHud((value) => !value)}
        >
          {compactHud ? '⌃' : '⌄'}
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
          <div className="readout-card wallet-card">
            <span>Cash</span>
            <strong>🪙 {wallet}</strong>
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
