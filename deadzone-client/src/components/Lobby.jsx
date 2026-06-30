import { useEffect, useRef, useState } from 'react';
import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { googleClientId } from '../api/users';
import { ACCESSORIES, GAME_MODES, GAME_MODE_RULES, GRENADE_SKINS, MAPS, MATCH_TIME_OPTIONS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';
import { KEYBIND_LABELS } from '../app/appConstants';
import {
  createTranslator,
  displayAccessory,
  displayGameMode,
  displayGrenadeSkin,
  displayKeybindLabel,
  displayMap,
  displayMission,
  displayOutfit,
  displayWeapon,
  displayWeaponSkin,
  LANGUAGES,
} from '../i18n';

export function Lobby(props) {
  const t = props.t || createTranslator(props.language);
  const dir = LANGUAGES[props.language || 'en']?.dir || 'ltr';
  if (props.screen === 'loading') {
    return (
      <main className="menu-shell" dir={dir}>
        <div className="session-loader">{t('loading.session')}</div>
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

function AuthenticationScreen({ accountStatus, authMode, credentials, handleAccountAction, handleGoogleLogin, language = 'en', setAuthMode, setCredentials, t }) {
  const mode = authMode || null;
  const outfit = OUTFITS[0];
  const dir = LANGUAGES[language]?.dir || 'ltr';

  return (
    <main className="menu-shell auth-screen" dir={dir}>
      <section className={mode ? 'auth-stage form-mode' : 'auth-stage'}>
        <div className="auth-landing-art">
          <h1 className="auth-title">DEAD ZONE</h1>
          <span className="auth-subtitle">{t('auth.subtitle')}</span>
        </div>
        <CharacterPreview outfit={outfit} variant="hero" />

        {!mode && (
          <div className="auth-choice">
            <button className="primary-command" onClick={() => setAuthMode('login')}>{t('auth.login')}</button>
            <button className="secondary-command" onClick={() => setAuthMode('register')}>{t('auth.register')}</button>
            <GoogleSignInButton onLogin={handleGoogleLogin} t={t} />
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
              <strong>{mode === 'login' ? t('auth.welcomeBack') : mode === 'verify' ? t('auth.verifyEmail') : t('auth.createAccount')}</strong>
              <button type="button" className="icon-command" title="Close" onClick={() => setAuthMode(null)}>×</button>
            </header>
            {mode !== 'verify' && (
              <label>
                {t('auth.username')}
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
                {t('auth.email')}
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
                {t('auth.password')}
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
                {t('auth.confirmPassword')}
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
                {t('auth.code')}
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
              {mode === 'login' ? t('auth.login') : mode === 'verify' ? t('auth.verifyCode') : t('auth.createAccount')}
            </button>
            {mode !== 'verify' && <GoogleSignInButton onLogin={handleGoogleLogin} compact t={t} />}
          </form>
        )}
      </section>
    </main>
  );
}

function GoogleSignInButton({ compact = false, onLogin, t = createTranslator('en') }) {
  const buttonRef = useRef(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!googleClientId || renderedRef.current) return undefined;

    let cancelled = false;
    const renderButton = () => {
      if (cancelled || renderedRef.current || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => onLogin?.(response?.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_black',
        size: compact ? 'medium' : 'large',
        shape: 'pill',
        text: 'continue_with',
        width: Math.min(compact ? 260 : 320, Math.max(220, window.innerWidth - 48)),
      });
      renderedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderButton, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', renderButton);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', renderButton, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', renderButton);
    };
  }, [compact, onLogin]);

  if (!googleClientId) {
    return (
      <small className="google-login-hint">
        {t('auth.googleHint')}
      </small>
    );
  }

  return (
    <div className={compact ? 'google-login compact' : 'google-login'}>
      <div ref={buttonRef} />
    </div>
  );
}

function MainMenu({
  accessoryIds,
  account,
  claimMissionReward,
  grenadeSkinId,
  language = 'en',
  level,
  levelProgress,
  missionCards,
  outfitId,
  selectedGrenadeSkin,
  selectedWeaponSkin,
  rerollMission,
  setPanel,
  signOut,
  t,
  wallet,
  weaponSkinId,
  xp,
}) {
  const dir = LANGUAGES[language]?.dir || 'ltr';
  const outfit = displayOutfit(OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0], language);
  const accessories = (accessoryIds || []).map((id) => displayAccessory(ACCESSORIES.find((item) => item.id === id), language)).filter(Boolean);

  return (
    <main className="menu-shell" dir={dir}>
      <header className="menu-topbar">
        <div className="menu-brand compact">
          <span>DEADZONE</span>
          <small>{account?.username} / 🪙 {wallet}</small>
        </div>
        <ProgressBadge level={level} levelProgress={levelProgress} t={t} xp={xp} />
        <div className="topbar-actions">
          <button className="settings-command" title={t('menu.settings')} aria-label={t('menu.settings')} onClick={() => setPanel('settings')}>⚙</button>
          <button className="logout-command" onClick={signOut}>{t('menu.logout')}</button>
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
          <button className="secondary-command" onClick={() => setPanel('player')}>{t('menu.myPlayer')}</button>
          <button className="primary-command" onClick={() => setPanel('play')}>{t('menu.startPlaying')}</button>
        </div>
        <MissionBoard language={language} missions={missionCards} onClaim={claimMissionReward} onReroll={rerollMission} t={t} />
      </section>
    </main>
  );
}

function MissionBoard({ language = 'en', missions = [], onClaim, onReroll, t }) {
  return (
    <aside className="mission-board">
      <header>
        <span>{t('missions.daily')}</span>
        <strong>{t('missions.earn')}</strong>
      </header>
      <div className="mission-list">
        {missions.map((mission) => {
          const translatedMission = displayMission(mission, language);
          return (
            <article className={mission.claimed ? 'mission-card claimed' : mission.ready ? 'mission-card ready' : 'mission-card'} key={mission.id}>
              <div>
                <strong>{translatedMission.title}</strong>
                <small>{translatedMission.description}</small>
              </div>
              <span>{Math.min(mission.progress, mission.target)}/{mission.target}</span>
              <i><b style={{ width: `${mission.percent}%` }} /></i>
              <em>
                {mission.claimed
                  ? t('missions.newIn', { time: mission.resetCountdown })
                  : `🪙 ${mission.rewardMoney} / ${mission.rewardXp} XP`}
              </em>
              {mission.ready && !mission.claimed && (
                <button className="mission-action claim" onClick={() => onClaim?.(mission.id)}>{t('missions.claim')}</button>
              )}
              {!mission.ready && !mission.claimed && (
                <button className="mission-action" onClick={() => onReroll?.(mission.id)}>
                  {mission.rerollCost === 0 ? t('missions.changeFree') : t('missions.changeCost', { cost: mission.rerollCost })}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
function ProgressBadge({ level, levelProgress, t = createTranslator('en'), xp }) {
  return (
    <div className="menu-progress-badge">
      <span>{t('progress.level', { level })}</span>
      <strong>{t('progress.xp', { xp })}</strong>
      <i><b style={{ width: `${levelProgress}%` }} /></i>
    </div>
  );
}

function SettingsScreen({
  editingKeybind,
  keybinds,
  language = 'en',
  level,
  levelProgress,
  resetKeybinds,
  setEditingKeybind,
  setPanel,
  t,
  toggleLanguage,
  xp,
}) {
  const dir = LANGUAGES[language]?.dir || 'ltr';

  return (
    <main className="menu-shell" dir={dir}>
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>{t('menu.back')}</button>
        <ProgressBadge level={level} levelProgress={levelProgress} t={t} xp={xp} />
        <strong>{t('menu.settings')}</strong>
      </header>
      <section className="settings-screen">
        <div className="settings-card">
          <header>
            <span>{t('settings.language')}</span>
            <strong>{t('settings.gameLanguage')}</strong>
          </header>
          <button className="language-toggle" onClick={toggleLanguage} type="button">
            <span>{language === 'he' ? '🇮🇱' : '🇺🇸'}</span>
            <strong>{LANGUAGES[language]?.label || LANGUAGES.en.label}</strong>
          </button>
        </div>
        <div className="settings-card">
          <header>
            <span>{t('settings.controls')}</span>
            <strong>{t('settings.keyboard')}</strong>
          </header>
          <div className="keybind-list">
            {Object.entries(KEYBIND_LABELS).map(([action, label]) => (
              <button
                className={editingKeybind === action ? 'keybind-row listening' : 'keybind-row'}
                key={action}
                onClick={() => setEditingKeybind(action)}
              >
                <span>{displayKeybindLabel(action, label, language)}</span>
                <strong>{editingKeybind === action ? t('settings.pressKey') : keybinds[action]}</strong>
              </button>
            ))}
          </div>
          <div className="settings-actions">
            <button className="secondary-command" onClick={resetKeybinds}>{t('settings.reset')}</button>
            <button className="primary-command" onClick={() => setPanel('main')}>{t('settings.done')}</button>
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
  language = 'en',
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
  t,
  upgradeWeapon,
  wallet,
  weaponId,
  weaponSkinId,
  weaponUnlocked,
  weaponUpgrades,
  xp,
}) {
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [storeCategory, setStoreCategory] = useState('clothes');
  const [weaponStoreTab, setWeaponStoreTab] = useState('type');
  const [clothesStoreTab, setClothesStoreTab] = useState('egg');
  const [selectedStoreItem, setSelectedStoreItem] = useState(null);
  const dir = LANGUAGES[language]?.dir || 'ltr';
  const outfit = displayOutfit(previewOutfit || previewedOutfit || OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0], language);
  const weaponSkin = displayWeaponSkin(previewWeaponSkin || previewedWeaponSkin || selectedWeaponSkin, language);
  const grenadeSkin = displayGrenadeSkin(previewGrenadeSkin || previewedGrenadeSkin || selectedGrenadeSkin, language);
  const accessories = (previewedAccessories || []).map((item) => displayAccessory(item, language));

  const requestPurchase = (item, owned, action) => {
    if (owned || item.price === 0) {
      action();
      return;
    }
    setPendingPurchase({ item, action });
  };
  const selectStoreItem = (item, details) => setSelectedStoreItem({ item, ...details });
  const accessoriesBySlot = (slots) => ACCESSORIES.filter((item) => slots.includes(item.slot));
  const activeAccessoryIdForSlot = (slot) => previewAccessory?.slot === slot
    ? previewAccessory.id
    : accessoryIds.find((id) => ACCESSORIES.find((accessory) => accessory.id === id)?.slot === slot);
  const renderAccessoryStoreItem = (item) => {
    const displayItem = displayAccessory(item, language);
    return (
      <StoreItem
        key={item.id}
        active={activeAccessoryIdForSlot(item.slot) === item.id}
        color={item.color}
        equipped={accessoryIds.includes(item.id)}
        kind={item.slot}
        name={displayItem.name}
        owned={ownedAccessories.includes(item.id)}
        price={item.price}
        subtitle={displayItem.slotLabel}
        t={t}
        onPreview={() => {
          setPreviewAccessory(item);
          selectStoreItem({ ...item, name: displayItem.name }, {
            action: () => requestPurchase(item, ownedAccessories.includes(item.id), () => buyOrEquipAccessory(item)),
            color: item.color,
            equipped: accessoryIds.includes(item.id),
            kind: item.slot,
            owned: ownedAccessories.includes(item.id),
            subtitle: displayItem.slotLabel,
          });
        }}
        onAction={() => requestPurchase(item, ownedAccessories.includes(item.id), () => buyOrEquipAccessory(item))}
      />
    );
  };

  return (
    <main className="menu-shell" dir={dir}>
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>{t('menu.back')}</button>
        <div className="topbar-actions">
          <ProgressBadge level={level} levelProgress={levelProgress} t={t} xp={xp} />
          <button className="settings-command" title={t('menu.settings')} aria-label={t('menu.settings')} onClick={() => setPanel('settings')}>⚙</button>
          <strong>🪙 {wallet}</strong>
        </div>
      </header>
      <section className="player-customizer">
        <aside className="customizer-preview">
          <CharacterPreview accessories={accessories} outfit={outfit} weaponColor={weaponSkin.color} grenadeColor={grenadeSkin.color} variant="side" weaponId={weaponId} />
          <strong>{outfit.name}</strong>
          <span>{displayWeapon(weaponId, WEAPONS[weaponId], language).name} / {weaponSkin.name} / {grenadeSkin.name}</span>
          {!!accessories.length && <small>{accessories.map((item) => item.name).join(' / ')}</small>}
        </aside>
        <div className="store-panel">
          <div className="customizer-tabs" role="tablist" aria-label="Customizer sections">
            <button className={storeCategory === 'clothes' ? 'active' : ''} onClick={() => setStoreCategory('clothes')}>{t('store.clothes')}</button>
            <button className={storeCategory === 'weapons' ? 'active' : ''} onClick={() => setStoreCategory('weapons')}>{t('store.weapons')}</button>
          </div>
          <div className="store-subtabs" role="tablist" aria-label="Store sub sections">
            {storeCategory === 'weapons' ? (
              <>
                <button className={weaponStoreTab === 'type' ? 'active' : ''} onClick={() => setWeaponStoreTab('type')}>{t('store.type')}</button>
                <button className={weaponStoreTab === 'skin' ? 'active' : ''} onClick={() => setWeaponStoreTab('skin')}>{t('store.weaponSkin')}</button>
                <button className={weaponStoreTab === 'grenade' ? 'active' : ''} onClick={() => setWeaponStoreTab('grenade')}>{t('store.grenade')}</button>
              </>
            ) : (
              <>
                <button className={clothesStoreTab === 'egg' ? 'active' : ''} onClick={() => setClothesStoreTab('egg')}>{t('store.egg')}</button>
                <button className={clothesStoreTab === 'head' ? 'active' : ''} onClick={() => setClothesStoreTab('head')}>{t('store.head')}</button>
                <button className={clothesStoreTab === 'shirt' ? 'active' : ''} onClick={() => setClothesStoreTab('shirt')}>{t('store.shirt')}</button>
                <button className={clothesStoreTab === 'gear' ? 'active' : ''} onClick={() => setClothesStoreTab('gear')}>{t('store.gear')}</button>
                <button className={clothesStoreTab === 'legs' ? 'active' : ''} onClick={() => setClothesStoreTab('legs')}>{t('store.legs')}</button>
              </>
            )}
          </div>
          <div className="store-scroll-area">
            {storeCategory === 'clothes' ? (
              <>
                {clothesStoreTab === 'egg' && (
                  <StoreSection title={t('store.eggColors')}>
                    {OUTFITS.map((item) => {
                      const displayItem = displayOutfit(item, language);
                      return (
                        <StoreItem
                          key={item.id}
                          active={(previewOutfit?.id || outfitId) === item.id}
                          color={item.displayColor || item.shell}
                          equipped={outfitId === item.id}
                          kind="outfit"
                          name={displayItem.name}
                          owned={ownedOutfits.includes(item.id)}
                          price={item.price}
                          t={t}
                          onPreview={() => {
                            setPreviewOutfit(item);
                            selectStoreItem({ ...item, name: displayItem.name }, {
                              action: () => requestPurchase(item, ownedOutfits.includes(item.id), () => buyOrEquipOutfit(item)),
                              color: item.displayColor || item.shell,
                              equipped: outfitId === item.id,
                              kind: 'outfit',
                              owned: ownedOutfits.includes(item.id),
                            });
                          }}
                          onAction={() => requestPurchase(item, ownedOutfits.includes(item.id), () => buyOrEquipOutfit(item))}
                        />
                      );
                    })}
                  </StoreSection>
                )}
                {clothesStoreTab === 'head' && <StoreSection title={t('store.headGear')}>{accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessoryStoreItem)}</StoreSection>}
                {clothesStoreTab === 'shirt' && <StoreSection title={t('store.shirts')}>{accessoriesBySlot(['shirt']).map(renderAccessoryStoreItem)}</StoreSection>}
                {clothesStoreTab === 'gear' && <StoreSection title={t('store.bodyGear')}>{accessoriesBySlot(['belt', 'backpack', 'watch', 'tail']).map(renderAccessoryStoreItem)}</StoreSection>}
                {clothesStoreTab === 'legs' && <StoreSection title={t('store.legGear')}>{accessoriesBySlot(['shoes']).map(renderAccessoryStoreItem)}</StoreSection>}
              </>
            ) : (
              <>
                {weaponStoreTab === 'type' && (
                  <StoreSection title={t('store.weaponType')}>
                    {Object.entries(WEAPONS).map(([id, item]) => {
                      const weapon = displayWeapon(id, item, language);
                      return (
                        <button className={weaponId === id ? 'loadout-row active' : 'loadout-row'} disabled={!weaponUnlocked(item)} key={id} onClick={() => weaponUnlocked(item) && selectWeapon(id)}>
                          <StoreVisual color={item.color} kind="weapon" weaponId={id} />
                          <span><strong>{weapon.name}</strong><small>{weapon.tag}</small></span>
                          <span>MK {weaponUpgrades[id] || 0}</span>
                          {weaponUnlocked(item) && <em onClick={(event) => { event.stopPropagation(); upgradeWeapon(id); }}>{t('store.upgrade')}</em>}
                        </button>
                      );
                    })}
                  </StoreSection>
                )}
                {weaponStoreTab === 'skin' && (
                  <StoreSection title={t('store.weaponSkins')}>
                    {WEAPON_SKINS.map((item) => {
                      const displayItem = displayWeaponSkin(item, language);
                      return (
                        <StoreItem key={item.id} active={(previewWeaponSkin?.id || weaponSkinId) === item.id} color={item.color} equipped={weaponSkinId === item.id} kind="weapon-skin" name={displayItem.name} owned={ownedWeaponSkins.includes(item.id)} price={item.price} t={t}
                          onPreview={() => {
                            setPreviewWeaponSkin(item);
                            selectStoreItem({ ...item, name: displayItem.name }, { action: () => requestPurchase(item, ownedWeaponSkins.includes(item.id), () => buyOrEquipWeaponSkin(item)), color: item.color, equipped: weaponSkinId === item.id, kind: 'weapon-skin', owned: ownedWeaponSkins.includes(item.id) });
                          }}
                          onAction={() => requestPurchase(item, ownedWeaponSkins.includes(item.id), () => buyOrEquipWeaponSkin(item))}
                        />
                      );
                    })}
                  </StoreSection>
                )}
                {weaponStoreTab === 'grenade' && (
                  <StoreSection title={t('store.grenadeSkins')}>
                    {GRENADE_SKINS.map((item) => {
                      const displayItem = displayGrenadeSkin(item, language);
                      return (
                        <StoreItem key={item.id} active={(previewGrenadeSkin?.id || grenadeSkinId) === item.id} color={item.color} equipped={grenadeSkinId === item.id} kind="grenade" name={displayItem.name} owned={ownedGrenadeSkins.includes(item.id)} price={item.price} t={t}
                          onPreview={() => {
                            setPreviewGrenadeSkin(item);
                            selectStoreItem({ ...item, name: displayItem.name }, { action: () => requestPurchase(item, ownedGrenadeSkins.includes(item.id), () => buyOrEquipGrenadeSkin(item)), color: item.color, equipped: grenadeSkinId === item.id, kind: 'grenade', owned: ownedGrenadeSkins.includes(item.id) });
                          }}
                          onAction={() => requestPurchase(item, ownedGrenadeSkins.includes(item.id), () => buyOrEquipGrenadeSkin(item))}
                        />
                      );
                    })}
                  </StoreSection>
                )}
              </>
            )}
          </div>
          <aside className="mobile-store-inspector" aria-live="polite">
            {selectedStoreItem ? (
              <>
                <StoreVisual color={selectedStoreItem.color} kind={selectedStoreItem.kind} />
                <span>{selectedStoreItem.subtitle || selectedStoreItem.kind}</span>
                <strong>{selectedStoreItem.item.name}</strong>
                <small>{selectedStoreItem.owned ? (selectedStoreItem.equipped ? t('store.equipped') : t('store.owned')) : t('store.available')}</small>
                <b>{selectedStoreItem.owned ? t('store.ready') : <>🪙 {selectedStoreItem.item.price}</>}</b>
                <button className="primary-command" onClick={selectedStoreItem.action}>
                  {selectedStoreItem.owned ? (selectedStoreItem.equipped ? t('store.equipped') : t('store.equip')) : t('store.buy')}
                </button>
              </>
            ) : (
              <>
                <span>{t('store.selection')}</span>
                <strong>{t('store.tapItem')}</strong>
                <small>{t('store.priceHint')}</small>
              </>
            )}
          </aside>
          <div className="customizer-footer">
            <button className="primary-command" onClick={() => setPanel('main')}>{t('store.continue')}</button>
          </div>
        </div>
      </section>
      {pendingPurchase && (
        <div className="purchase-modal" role="dialog" aria-modal="true">
          <div>
            <strong>{t('store.confirmPurchase')}</strong>
            <span>{t('store.costs', { name: pendingPurchase.item.name, price: pendingPurchase.item.price })}</span>
            <div className="purchase-actions">
              <button className="secondary-command" onClick={() => setPendingPurchase(null)}>{t('store.cancel')}</button>
              <button className="primary-command" onClick={() => { pendingPurchase.action(); setPendingPurchase(null); }}>{t('store.buy')}</button>
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

function StoreItem({ active, color, equipped, kind, name, onAction, onPreview, owned, price, subtitle, t = createTranslator('en') }) {
  return (
    <article className={active ? 'store-item active' : 'store-item'}>
      <button className="store-preview" onClick={onPreview || onAction}>
        <StoreVisual color={color} kind={kind} />
        <strong>{name}</strong>
        {subtitle && <small>{subtitle}</small>}
      </button>
      <button className="store-buy" onClick={onAction}>
        {owned ? (equipped ? t('store.equipped') : t('store.equip')) : `🪙 ${price}`}
      </button>
    </article>
  );
}

function PlayScreen({
  answerFriendRequest,
  answerRoomInvite,
  createRoom,
  findPlayers,
  inviteFriend,
  joinMatch,
  joinRoomByCode,
  language = 'en',
  level,
  levelProgress,
  lobbyStatus,
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
  t,
  xp,
}) {
  const [gameCode, setGameCode] = useState('');
  const dir = LANGUAGES[language]?.dir || 'ltr';

  return (
    <main className="menu-shell" dir={dir}>
      <header className="menu-topbar">
        <button className="back-command" onClick={() => setPanel('main')}>{t('menu.back')}</button>
        <div className="topbar-actions">
          <ProgressBadge level={level} levelProgress={levelProgress} t={t} xp={xp} />
          <button className="settings-command" title={t('menu.settings')} aria-label={t('menu.settings')} onClick={() => setPanel('settings')}>⚙</button>
          <strong>{t('lobby.title')}</strong>
        </div>
      </header>
      <section className="play-lobby">
        <div className="multiplayer-hub">
          <div className="room-browser">
            <header>
              <div>
                <span>{t('lobby.openRooms')}</span>
                <strong>{t('lobby.chooseBattle')}</strong>
              </div>
              <button className="add-room-command" title={t('lobby.createRoom')} onClick={() => setPanel('create')}>+</button>
            </header>

            {panel === 'create' ? (
              <CreateRoomForm createRoom={createRoom} language={language} mapUnlocked={mapUnlocked} roomDraft={roomDraft} setPanel={setPanel} setRoomDraft={setRoomDraft} t={t} />
            ) : (
              <>
                <div className="room-list-clean">
                  {rooms.map((room) => {
                    const map = displayMap(MAPS.find((item) => item.id === room.mapId) || MAPS[0], language);
                    const mode = displayGameMode(GAME_MODES.find((item) => item.id === room.gameMode) || GAME_MODES[0], language);
                    return (
                      <button className={room.id === selectedRoomId ? 'room-card active' : 'room-card'} key={room.id} onClick={() => setSelectedRoomId(room.id)}>
                        <span className="room-color" style={{ background: map.accent }} />
                        <span>
                          <strong>{room.name}</strong>
                          <small>{mode.short} / {map.name} / {t('lobby.firstTo', { score: room.scoreLimit })} / {t('lobby.minutesShort', { minutes: room.timeLimitMinutes })} / {t('lobby.code', { code: room.id })}</small>
                        </span>
                        <span>{room.players}/{room.maxPlayers}</span>
                      </button>
                    );
                  })}
                  {!rooms.length && <div className="empty-rooms">{t('lobby.empty')}</div>}
                </div>
                <button className="primary-command join-room-command" disabled={!selectedRoomId} onClick={joinMatch}>
                  {t('lobby.joinSelected')}
                </button>
                <form className="game-code-form" onSubmit={(event) => { event.preventDefault(); joinRoomByCode(gameCode); }}>
                  <label>
                    {t('lobby.gameCode')}
                    <input placeholder={t('lobby.invitePlaceholder')} value={gameCode} onChange={(event) => setGameCode(event.target.value.toUpperCase())} />
                  </label>
                  <button type="submit">{t('lobby.findRoom')}</button>
                </form>
              </>
            )}
            {panel !== 'create' && lobbyStatus && <div className="lobby-message">{lobbyStatus}</div>}
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
            t={t}
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
  t,
}) {
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const requestCount = (social.incomingRequests?.length || 0) + (social.roomInvites?.length || 0);

  return (
    <aside className="social-panel">
      <header>
        <div>
          <span>{t('social.squad')}</span>
          <strong>{t('social.friendsInvites')}</strong>
        </div>
        {!!requestCount && <b>{requestCount}</b>}
      </header>
      <div className="social-tabs">
        <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>{t('social.friends')}</button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>{t('social.requests')}</button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}>{t('social.invites')}</button>
      </div>
      <div className="social-scroll">
        {tab === 'friends' && (
          <>
            <form className="friend-search" onSubmit={(event) => { event.preventDefault(); findPlayers(query); }}>
              <input placeholder={t('social.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit" title={t('social.search')}>{t('social.search')}</button>
            </form>
            {!!playerSearchResults.length && (
              <div className="social-list search-results">
                {playerSearchResults.map((player) => (
                  <div className="social-row" key={player.id}>
                    <span><strong>{player.username}</strong><small>{t('progress.level', { level: player.level })}</small></span>
                    <button onClick={() => requestFriendship(player.username)}>{t('social.add')}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="social-section-title">
              <span>{t('social.yourFriends')}</span>
              <small>{selectedRoom ? t('social.inviteTo', { room: selectedRoom.id }) : t('social.selectRoom')}</small>
            </div>
            <div className="social-list">
              {(social.friends || []).map((friend) => (
                <div className="social-row" key={friend.id}>
                  <span><strong>{friend.username}</strong><small>{t('progress.level', { level: friend.level })}</small></span>
                  <button disabled={!selectedRoom} onClick={() => inviteFriend(friend.id)}>{t('social.invite')}</button>
                </div>
              ))}
              {!social.friends?.length && <p className="social-empty">{t('social.emptyFriends')}</p>}
            </div>
          </>
        )}
        {tab === 'requests' && (
          <div className="social-list">
            {(social.incomingRequests || []).map((request) => (
              <div className="social-row stacked" key={request.id}>
                <span><strong>{request.user.username}</strong><small>{t('social.wantsFriend')}</small></span>
                <div>
                  <button onClick={() => answerFriendRequest(request.id, true)}>{t('social.accept')}</button>
                  <button className="muted" onClick={() => answerFriendRequest(request.id, false)}>{t('social.decline')}</button>
                </div>
              </div>
            ))}
            {(social.outgoingRequests || []).map((request) => (
              <div className="social-row pending" key={request.id}>
                <span><strong>{request.user.username}</strong><small>{t('social.pending')}</small></span>
              </div>
            ))}
            {!social.incomingRequests?.length && !social.outgoingRequests?.length && <p className="social-empty">{t('social.noRequests')}</p>}
          </div>
        )}
        {tab === 'invites' && (
          <div className="social-list">
            {(social.roomInvites || []).map((invite) => (
              <div className="social-row stacked" key={invite.id}>
                <span>
                  <strong>{invite.sender.username}</strong>
                  <small>{t('social.roomInvite', { room: invite.room.name, code: invite.room.id })}</small>
                </span>
                <div>
                  <button onClick={() => answerRoomInvite(invite.id, true)}>{t('social.accept')}</button>
                  <button className="muted" onClick={() => answerRoomInvite(invite.id, false)}>{t('social.decline')}</button>
                </div>
              </div>
            ))}
            {!social.roomInvites?.length && <p className="social-empty">{t('social.noInvites')}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}

function CreateRoomForm({ createRoom, language = 'en', mapUnlocked, roomDraft, setPanel, setRoomDraft, t }) {
  const modeRules = GAME_MODE_RULES[roomDraft.gameMode] || GAME_MODE_RULES['team-deathmatch'];
  return (
    <div className="create-room-form">
      <label>
        {t('room.name')}
        <input value={roomDraft.name} onChange={(event) => setRoomDraft((draft) => ({ ...draft, name: event.target.value }))} />
      </label>
      <div className="map-choice-grid">
        {MAPS.map((map) => {
          const display = displayMap(map, language);
          return (
            <button className={roomDraft.mapId === map.id ? 'map-choice active' : 'map-choice'} disabled={!mapUnlocked(map)} key={map.id} onClick={() => setRoomDraft((draft) => ({ ...draft, mapId: map.id }))}>
              <i style={{ background: map.accent }} />
              <span>{display.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mode-choice-grid">
        {GAME_MODES.map((mode) => {
          const display = displayGameMode(mode, language);
          return (
            <button className={roomDraft.gameMode === mode.id ? 'mode-choice active' : 'mode-choice'} key={mode.id} onClick={() => setRoomDraft((draft) => ({ ...draft, gameMode: mode.id, scoreLimit: GAME_MODE_RULES[mode.id].defaultScore }))}>
              <strong>{display.short}</strong>
              <span>{display.name}</span>
              <small>{display.description}</small>
            </button>
          );
        })}
      </div>
      <div className="room-rule-grid">
        <label>
          {t('room.scoreTarget')}
          <input type="number" min={modeRules.minScore} max={modeRules.maxScore} step={modeRules.scoreStep} value={roomDraft.scoreLimit} onChange={(event) => setRoomDraft((draft) => ({ ...draft, scoreLimit: Math.max(modeRules.minScore, Math.min(modeRules.maxScore, Number(event.target.value) || modeRules.defaultScore)) }))} />
          <small>{t('room.allowed', { min: modeRules.minScore, max: modeRules.maxScore })}</small>
        </label>
        <label>
          {t('room.matchTime')}
          <select value={roomDraft.timeLimitMinutes} onChange={(event) => setRoomDraft((draft) => ({ ...draft, timeLimitMinutes: Number(event.target.value) }))}>
            {MATCH_TIME_OPTIONS.map((minutes) => <option value={minutes} key={minutes}>{t('room.minutes', { minutes })}</option>)}
          </select>
          <small>{t('room.maxTime')}</small>
        </label>
      </div>
      <label>
        {t('room.maxPlayers')}
        <input type="number" min="2" max="10" value={roomDraft.maxPlayers} onChange={(event) => setRoomDraft((draft) => ({ ...draft, maxPlayers: Math.max(2, Math.min(10, Number(event.target.value) || 2)) }))} />
      </label>
      <label className="simple-check">
        <input type="checkbox" checked={roomDraft.allowBots} onChange={(event) => setRoomDraft((draft) => ({ ...draft, allowBots: event.target.checked }))} />
        {t('room.bots')}
      </label>
      <div className="create-actions">
        <button className="secondary-command" onClick={() => setPanel('play')}>{t('room.cancel')}</button>
        <button className="primary-command" onClick={createRoom}>{t('room.create')}</button>
      </div>
    </div>
  );
}
