import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { ACCESSORIES, GRENADE_SKINS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';
import { createTranslator, displayAccessory, displayGrenadeSkin, displayOutfit, displayWeapon, displayWeaponSkin } from '../i18n';

export function MatchPauseMenu({
                                   activeTab,
                                   accessoryIds,
                                   equipOutfit,
                                   equipWeapon,
                                   grenadeSkinId,
                                   language = 'en',
                                   onContinue,
                                   onExit,
                                   onMobileControls,
                                   onSetTab,
                                   onToggleAccessory,
                                   outfitId,
                                   ownedAccessories,
                                   ownedOutfits,
                                   t = createTranslator(language),
                                   weaponId,
                                   weaponSkinId,
                                   weaponUnlocked,
                               }) {
    const outfit = displayOutfit(OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0], language);
    const accessories = accessoryIds.map((id) => displayAccessory(ACCESSORIES.find((item) => item.id === id), language)).filter(Boolean);
    const weapon = displayWeapon(weaponId, WEAPONS[weaponId] || WEAPONS.rifle, language);
    const weaponSkin = displayWeaponSkin(WEAPON_SKINS.find((item) => item.id === weaponSkinId) || WEAPON_SKINS[0], language);
    const grenadeSkin = displayGrenadeSkin(GRENADE_SKINS.find((item) => item.id === grenadeSkinId) || GRENADE_SKINS[0], language);
    const accessoryForSlot = (slot) => accessoryIds.find((id) => ACCESSORIES.find((item) => item.id === id)?.slot === slot);
    const accessoriesBySlot = (slots) => ACCESSORIES.filter((item) => ownedAccessories.includes(item.id) && slots.includes(item.slot));
    const renderAccessory = (item) => (
        <button
            className={accessoryForSlot(item.slot) === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
            key={item.id}
            onClick={() => onToggleAccessory(item)}
        >
            <StoreVisual color={item.color} kind={item.slot} />
            <b>{displayAccessory(item, language).name}</b>
            <small>{displayAccessory(item, language).slotLabel}</small>
        </button>
    );

    return (
        <div className="death-customizer pause-customizer">
            <header>
                <strong>{t('pause.title')}</strong>
                <span>{t('pause.hint')}</span>
            </header>
            <div className="death-customizer-layout">
                <aside className="death-customizer-preview">
                    <CharacterPreview
                        accessories={accessories}
                        grenadeColor={grenadeSkin.color}
                        outfit={outfit}
                        variant="side"
                        weaponColor={weaponSkin.color}
                        weaponId={weaponId}
                    />
                    <strong>{outfit.name}</strong>
                    <span>{weapon.name}</span>
                </aside>
                <div className="death-customizer-options">
                    <div className="customizer-tabs" role="tablist" aria-label="Pause menu customization">
                        <button className={activeTab === 'outfits' ? 'active' : ''} onClick={() => onSetTab('outfits')}>{t('store.clothes')}</button>
                        <button className={activeTab === 'weapons' ? 'active' : ''} onClick={() => onSetTab('weapons')}>{t('store.weapons')}</button>
                    </div>
                    <div className="death-customizer-scroll">
                        {activeTab === 'outfits' ? (
                            <>
                                <section>
                                    <span>{t('store.eggColors')}</span>
                                    <div className="death-customizer-grid">
                                        {OUTFITS.filter((item) => ownedOutfits.includes(item.id)).map((item) => (
                                            <button
                                                className={outfitId === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
                                                key={item.id}
                                                onClick={() => equipOutfit(item.id)}
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
                                        {accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessory)}
                                        {!accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).length && <em>{t('common.noAccessories')}</em>}
                                    </div>
                                </section>
                                <section>
                                    <span>{t('store.gear')}</span>
                                    <div className="death-customizer-grid">
                                        {accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail', 'shoes']).map(renderAccessory)}
                                        {!accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail', 'shoes']).length && <em>{t('common.noAccessories')}</em>}
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
                                            onClick={() => equipWeapon(id)}
                                        >
                                            <StoreVisual color={item.color} kind="weapon" weaponId={id} />
                                            <b>{displayWeapon(id, item, language).name}</b>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                    <div className="customizer-footer death-customizer-footer pause-menu-actions">
                        <button className="primary-command" onClick={onContinue}>{t('store.continue')}</button>
                        <button className="secondary-command mobile-only-command" onClick={onMobileControls}>{t('death.mobileControls')}</button>
                        <button className="danger-command" onClick={onExit}>{t('pause.exit')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
