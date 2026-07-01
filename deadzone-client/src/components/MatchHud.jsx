import { useEffect, useState } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { MatchPauseMenu } from './MatchPauseMenu';
import { MobileTouchControls } from './MobileTouchControls';
import { ACCESSORIES, GAME_MODES, GRENADE_SKINS, MAPS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';
import {
  createTranslator,
  displayAccessory,
  displayGameMode,
  displayGrenadeSkin,
  displayMap,
  displayOutfit,
  displayWeapon,
  displayWeaponSkin,
  LANGUAGES,
} from '../i18n';

const MOBILE_CONTROL_DEFAULTS = {
  aim: { x: 76, y: 25, size: 1, opacity: 0.82 },
  grenade: { x: 76, y: 72, size: 1, opacity: 0.82 },
  joystick: { x: 14, y: 72, size: 1, opacity: 0.76 },
  jump: { x: 76, y: 41, size: 1, opacity: 0.82 },
  reload: { x: 76, y: 56, size: 1, opacity: 0.82 },
  shoot: { x: 89, y: 49, size: 1, opacity: 0.82 },
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
    const savedControls = JSON.parse(localStorage.getItem('deadzone-mobile-controls')) || {};
    return {
      ...MOBILE_CONTROL_DEFAULTS,
      ...Object.fromEntries(Object.entries(MOBILE_CONTROL_DEFAULTS).map(([id, defaults]) => [
        id,
        { ...defaults, ...(savedControls[id] || {}) },
      ])),
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
  language = 'en',
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
  t = createTranslator(language),
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
  const [mobileAdjustMode, setMobileAdjustMode] = useState('size');
  const [selectedMobileControl, setSelectedMobileControl] = useState('shoot');
  const [mobileControls, setMobileControls] = useState(loadMobileControls);
  const [mobileResetSignal, setMobileResetSignal] = useState(0);
  const dir = LANGUAGES[language]?.dir || 'ltr';
  const weapon = displayWeapon(weaponId, WEAPONS[weaponId] || WEAPONS[currentMatch.weaponId] || WEAPONS.rifle, language);
  const previewOutfit = displayOutfit(OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0], language);
  const previewAccessories = equippedAccessoryIds.map((id) => displayAccessory(ACCESSORIES.find((item) => item.id === id), language)).filter(Boolean);
  const previewWeaponSkin = displayWeaponSkin(WEAPON_SKINS.find((item) => item.id === weaponSkinId) || WEAPON_SKINS[0], language);
  const previewGrenadeSkin = displayGrenadeSkin(GRENADE_SKINS.find((item) => item.id === grenadeSkinId) || GRENADE_SKINS[0], language);
  const mapName = displayMap(MAPS.find((map) => map.id === currentMatch.mapId), language)?.name || 'Arena';
  const mode = displayGameMode(GAME_MODES.find((item) => item.id === (score.mode || currentMatch.gameMode)) || GAME_MODES[0], language);
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
  const resetMobileInput = () => {
    onMobileReset?.();
    setMobileResetSignal((value) => value + 1);
  };
  const setPaused = (value) => {
    if (!value) {
      resetMobileInput();
      window.setTimeout(resetMobileInput, 0);
      window.setTimeout(resetMobileInput, 120);
    }
    setShowPauseMenu(value);
    worldRef.current?.setPaused(value);
  };
  const returnToMatch = () => {
    resetMobileInput();
    setShowPauseMenu(false);
    setShowMobileSettings(false);
    setMobileEditMode(false);
    setShowExitConfirm(false);
    setShowDeathCustomizer(false);
    worldRef.current?.resetRuntimeInput?.();
    worldRef.current?.setPaused(false);
    const returned = worldRef.current?.respawnLocal(true);
    if (returned) {
      document.activeElement?.blur?.();
      resetMobileInput();
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
  const opacityToPercent = (opacity) => Math.round(((Math.max(0.04, Math.min(1, opacity ?? 0.82)) - 0.04) / 0.96) * 200);
  const percentToOpacity = (percent) => Number((0.04 + (Math.max(0, Math.min(200, Number(percent) || 0)) / 200) * 0.96).toFixed(2));
  const sizeToPercent = (size) => Math.round((Math.max(0.5, Math.min(2, size || 1))) * 100);
  const percentToSize = (percent) => Number((Math.max(50, Math.min(200, Number(percent) || 100)) / 100).toFixed(2));
  const resetMobileControls = () => {
    setMobileControls(MOBILE_CONTROL_DEFAULTS);
    setSelectedMobileControl('shoot');
    localStorage.setItem('deadzone-mobile-controls', JSON.stringify(MOBILE_CONTROL_DEFAULTS));
  };

  useEffect(() => {
    if (deathInfo.isDead || showPauseMenu || matchResult) {
      resetMobileInput();
    }
  }, [deathInfo.isDead, matchResult, showPauseMenu]);

  return (
    <main className={shellClassName} dir={dir}>
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
        key={mobileResetSignal}
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
        resetSignal={mobileResetSignal}
        selectedControl={selectedMobileControl}
        scoped={isScoped}
        labels={{
          aim: t('mobile.aim'),
          grenade: t('mobile.grenade'),
          joystick: t('mobile.move'),
          jump: t('mobile.jump'),
          reload: t('mobile.reload'),
          shoot: t('mobile.shoot'),
          throw: t('mobile.throw'),
        }}
      />
      <div className={grenadeCharge > 0 && grenadeCount > 0 ? 'grenade-charge-reticle active' : 'grenade-charge-reticle'}>
        <span>{grenadeCharge > 0.82 ? t('grenade.perfect') : t('grenade.power')}</span>
        <i><b style={{ width: `${Math.round(grenadeCharge * 100)}%` }} /></i>
      </div>

      {deathInfo.isDead && deathInfo.focusSeconds > 0 && !showDeathCustomizer && (
        <div className="kill-cam-overlay">
          <div className="kill-cam-banner">
            <span>{t('death.killCam')}</span>
            <strong>{deathInfo.killerName ? t('death.eliminatedBy', { name: deathInfo.killerName }) : t('death.eliminated')}</strong>
            <div className="kill-cam-countdown" aria-label={`${deathInfo.seconds} seconds until respawn`}>
              <b>{deathInfo.seconds}</b>
              <small>{t('death.seconds')}</small>
            </div>
          </div>
        </div>
      )}

      {deathInfo.isDead && (deathInfo.focusSeconds <= 0 || showDeathCustomizer) && (
        <div className="death-screen">
          {!showDeathCustomizer ? (
            <>
              <strong>{t('death.eliminated')}</strong>
              {deathInfo.killerName && (
                <em className="killer-focus-label">
                  {t('death.killedBy', { name: deathInfo.killerName })}
                  {deathInfo.focusSeconds > 0 ? ` ֲ· focus ${deathInfo.focusSeconds}s` : ''}
                </em>
              )}
              <span>{deathInfo.ready ? t('death.ready') : t('death.respawnIn', { seconds: deathInfo.seconds })}</span>
              <div className="death-player-stats">
                <div>
                  <span>{t('hud.cash')}</span>
                  <strong>🪙 {wallet}</strong>
                </div>
                <div>
                  <span>{t('progress.level', { level })}</span>
                  <strong>{t('progress.xp', { xp })}</strong>
                  <i><b style={{ width: `${levelProgress}%` }} /></i>
                </div>
              </div>
              <div className="death-actions">
                <button className="death-action-return" disabled={!deathInfo.ready} onMouseDown={(event) => event.stopPropagation()} onClick={returnToMatch}>{t('death.return')}</button>
                <button className="ghost-button death-action-customize" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowDeathCustomizer(true)}>{t('death.customize')}</button>
                <button className="ghost-button mobile-only-command death-action-controls" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowMobileSettings(true)}>{t('death.mobileControls')}</button>
                <button className="ghost-button death-action-exit" onMouseDown={(event) => event.stopPropagation()} onClick={() => setShowExitConfirm(true)}>{t('death.exitLobby')}</button>
              </div>
            </>
          ) : (
            <div className="death-customizer">
              <header>
                <strong>{t('death.customize')}</strong>
                <button className="ghost-button" onClick={() => setShowDeathCustomizer(false)}>{t('menu.back')}</button>
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
                    <button className={deathCustomizerTab === 'outfits' ? 'active' : ''} onClick={() => setDeathCustomizerTab('outfits')}>{t('store.clothes')}</button>
                    <button className={deathCustomizerTab === 'weapons' ? 'active' : ''} onClick={() => setDeathCustomizerTab('weapons')}>{t('store.weapons')}</button>
                  </div>
                  <div className="death-customizer-scroll">
                    {deathCustomizerTab === 'outfits' ? (
                      <>
                        <section>
                          <span>{t('store.eggColors')}</span>
                          <div className="death-customizer-grid">
                            {OUTFITS.filter((item) => ownedOutfits.includes(item.id)).map((item) => (
                              <button
                                className={outfitId === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
                                key={item.id}
                                onClick={() => equipOwnedOutfitDuringMatch(item.id)}
                              >
                                <StoreVisual color={item.displayColor || item.shell} kind="outfit" />
                                <b>{displayOutfit(item, language).name}</b>
                              </button>
                            ))}
                          </div>
                        </section>
                        <section>
                          <span>{t('store.headGear')}</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).length && <em>{t('common.noAccessories')}</em>}
                          </div>
                        </section>
                        <section>
                          <span>{t('store.bodyGear')}</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail']).length && <em>{t('common.noAccessories')}</em>}
                          </div>
                        </section>
                        <section>
                          <span>{t('store.legGear')}</span>
                          <div className="death-customizer-grid">
                            {accessoriesBySlot(['shoes']).map(renderAccessoryOption)}
                            {!accessoriesBySlot(['shoes']).length && <em>{t('common.noAccessories')}</em>}
                          </div>
                        </section>
                      </>
                    ) : (
                      <section>
                        <span>{t('common.chooseWeapon')}</span>
                        <div className="death-customizer-grid">
                          {Object.entries(WEAPONS).map(([id, item]) => (
                            <button
                              className={weaponId === id ? 'death-customizer-item active' : 'death-customizer-item'}
                              disabled={!weaponUnlocked(item)}
                              key={id}
                              onClick={() => equipWeaponDuringMatch(id)}
                            >
                              <StoreVisual color={item.color} kind="weapon" weaponId={id} />
                              <b>{displayWeapon(id, item, language).name}</b>
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
                      {deathInfo.ready ? t('store.continue') : t('death.respawnIn', { seconds: deathInfo.seconds })}
                    </button>
                    <button className="secondary-command" onClick={() => setShowDeathCustomizer(false)}>{t('menu.back')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {matchResult && (
        <section className="match-result-overlay">
          <span>{matchResult.localWon ? t('match.victory') : matchResult.winner ? t('match.complete') : t('match.draw')}</span>
          <strong>{matchResult.winnerName}</strong>
          <small>{matchResult.reason}</small>
          {matchResult.localWon && <em>{t('match.bonus')}: 🪙 20 +100 XP</em>}
          <button className="primary-command" onClick={leaveMatch}>{t('match.returnLobby')}</button>
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
            language={language}
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
            t={t}
          />
        </div>
      )}

      {showExitConfirm && (
        <section className="exit-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div>
            <strong id="exit-confirm-title">{t('confirm.exitTitle')}</strong>
            <span>{t('confirm.exitText')}</span>
            <div>
              <button className="secondary-command" onClick={() => setShowExitConfirm(false)}>{t('confirm.stay')}</button>
              <button className="danger-command" onClick={exitPausedMatch}>{t('pause.exit')}</button>
            </div>
          </div>
        </section>
      )}

      <header className="hud overlay">
        <div className="hud-brand-block">
          <img className="hud-game-logo" src="/Shadow_Logo.png" alt="DeadZone" />
          <div>
            <span className="eyebrow">{t('hud.roomMap')}</span>
            <strong>{selectedRoomId} / {mapName}</strong>
            <small>{mode.name}</small>
          </div>
        </div>
        <div className="scoreboard">
          {freeForAll ? (
            <>
              <span className="blue-score">{t('hud.leader')}</span>
              <b>{leader ? leader.kills : 0}</b>
              <span className="red-score">{leader?.name || 'None'}</span>
            </>
          ) : (
            <>
              <span className="blue-score">{t('hud.blue')} {score.blue}</span>
              <b>:</b>
              <span className="red-score">{score.red} {t('hud.red')}</span>
            </>
          )}
        </div>
        <div className="match-rules-status">
          <strong>{remainingMinutes}:{remainingClockSeconds}</strong>
          <span>{t('hud.target')} {score.target || currentMatch.scoreLimit}</span>
        </div>
      </header>

      <button
        aria-label={t('hud.pause')}
        className="pause-match"
        disabled={deathInfo.isDead || Boolean(matchResult)}
        onClick={() => setPaused(true)}
        title={t('hud.pause')}
      >
        <span />
        <span />
      </button>

      <button
        aria-label={t('death.mobileControls')}
        className="mobile-settings-match"
        onClick={() => setShowMobileSettings(true)}
        type="button"
      >
        {'\u2699'}
      </button>

      {showMobileSettings && (
        <section className={mobileEditMode ? 'mobile-controls-dialog editing' : 'mobile-controls-dialog'} role="dialog" aria-modal="true" aria-labelledby="mobile-controls-title">
          {mobileEditMode ? (
            <>
            <button className="mobile-layout-save" type="button" onClick={() => setMobileEditMode(false)}>
              {t('mobile.saveLayout')}
            </button>
            <div className="mobile-opacity-strip">
              <input
                aria-label={mobileAdjustMode === 'size' ? t('mobile.adjustSize') : t('mobile.adjustOpacity')}
                max="200"
                min={mobileAdjustMode === 'size' ? '50' : '0'}
                onChange={(event) => updateMobileControl(
                  selectedMobileControl,
                  mobileAdjustMode === 'size'
                    ? { size: percentToSize(event.target.value) }
                    : { opacity: percentToOpacity(event.target.value) },
                )}
                step="1"
                type="range"
                value={mobileAdjustMode === 'size'
                  ? sizeToPercent(mobileControls[selectedMobileControl]?.size)
                  : opacityToPercent(mobileControls[selectedMobileControl]?.opacity)}
              />
              <span>
                {mobileAdjustMode === 'size'
                  ? sizeToPercent(mobileControls[selectedMobileControl]?.size)
                  : opacityToPercent(mobileControls[selectedMobileControl]?.opacity)}
              </span>
              <button type="button" onClick={() => setMobileAdjustMode((mode) => (mode === 'size' ? 'opacity' : 'size'))}>
                {mobileAdjustMode === 'size' ? t('mobile.switchToOpacity') : t('mobile.switchToSize')}
              </button>
            </div>
            </>
          ) : (
          <div>
            <header>
              <strong id="mobile-controls-title">{t('mobile.controls')}</strong>
              <button type="button" onClick={() => setShowMobileSettings(false)}>{t('mobile.close')}</button>
            </header>
            <label>
              {t('mobile.control')}
              <select value={selectedMobileControl} onChange={(event) => setSelectedMobileControl(event.target.value)}>
                {Object.entries(MOBILE_CONTROL_NAMES).map(([id, label]) => (
                  <option value={id} key={id}>{t(`mobile.${id === 'joystick' ? 'movement' : id}`)}</option>
                ))}
              </select>
            </label>
            <button
              className={mobileEditMode ? 'primary-command active' : 'secondary-command'}
              type="button"
              onClick={() => setMobileEditMode((value) => !value)}
            >
              {mobileEditMode ? t('mobile.dragging') : t('mobile.dragButtons')}
            </button>
            <label>
              {t(`mobile.${selectedMobileControl === 'joystick' ? 'movement' : selectedMobileControl}`)} {t('mobile.opacity')}
              <input
                max="200"
                min="0"
                onChange={(event) => updateMobileControl(selectedMobileControl, { opacity: percentToOpacity(event.target.value) })}
                step="1"
                type="range"
                value={opacityToPercent(mobileControls[selectedMobileControl]?.opacity)}
              />
              <span>{opacityToPercent(mobileControls[selectedMobileControl]?.opacity)}%</span>
            </label>
            <small className="mobile-controls-hint">{t('mobile.dragButtons')}</small>
            <button className="secondary-command" type="button" onClick={resetMobileControls}>
              {t('mobile.resetLayout')}
            </button>
          </div>
          )}
        </section>
      )}

      {!deathInfo.isDead && !matchResult && (
        <aside className="health-widget mobile-health-bar" aria-label={t('hud.health')}>
          <i><b style={{ width: `${Math.max(0, Math.min(100, Math.round(health ?? 100)))}%` }} /></i>
        </aside>
      )}

      {score.objective && <div className="objective-status">{score.objective}</div>}

      {showScoreboard && (
        <section className="scoreboard-overlay">
          <header>
            <strong>{t('hud.scoreboard')}</strong>
            <span>{t('hud.k')} / {t('hud.a')} / {t('hud.d')} / {t('hud.score')}</span>
          </header>
          {freeForAll ? (
            <ScoreboardTeam localId={localId} players={score.players} title={t('hud.allPlayers')} variant="neutral" t={t} />
          ) : (
            <div className="scoreboard-teams">
              <ScoreboardTeam localId={localId} players={bluePlayers} title={t('hud.blueTeam')} team="blue" t={t} />
              <ScoreboardTeam localId={localId} players={redPlayers} title={t('hud.redTeam')} team="red" t={t} />
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
          <span>{t('hud.weapon')}</span>
            <strong>{weapon.name}</strong>
            <small>{activeBuffs}</small>
          </div>
          <div className={ammo.reloading ? 'readout-card ammo-card reloading' : 'readout-card ammo-card'}>
            <span>{ammo.reloading ? t('hud.reload') : t('hud.ammo')}</span>
            <strong>{ammo.reloading ? `${reloadPercent}%` : ammo.ammo}</strong>
            <small>{ammo.reloading ? t('hud.reload') : `/ ${ammo.magazineSize}`}</small>
            <i style={{ '--reload': `${reloadPercent}%` }} />
          </div>
          <div className="readout-card grenade-card">
            <span>{t('hud.grenades')}</span>
            <strong>{grenadeCount}<small>/3</small></strong>
            <div className="grenade-pips">
              {[0, 1, 2].map((slot) => <b className={slot < grenadeCount ? 'filled' : ''} key={slot} />)}
            </div>
          </div>
          <div className="readout-card health-card">
            <span>{t('hud.health')}</span>
            <strong>{Math.max(0, Math.min(100, Math.round(health ?? 100)))}</strong>
            <small>HP</small>
            <i style={{ '--health': `${Math.max(0, Math.min(100, Math.round(health ?? 100)))}%` }} />
          </div>
          <div className="readout-card wallet-card">
            <span>{t('hud.cash')}</span>
            <strong>🪙 {wallet}</strong>
            <small>{t('hud.killsPay')}</small>
          </div>
        </div>

        <div className="feed">
          {events.slice(0, 3).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      </footer>
    </main>
  );
}

function ScoreboardTeam({ localId, players, team, title, t, variant }) {
  return (
    <section className={variant === 'neutral' ? 'scoreboard-team neutral' : team === 'red' ? 'scoreboard-team red' : 'scoreboard-team blue'}>
      <header>
        <strong>{title}</strong>
        <span>{t('hud.k')}</span>
        <span>{t('hud.a')}</span>
        <span>{t('hud.d')}</span>
        <span>{t('hud.score')}</span>
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
