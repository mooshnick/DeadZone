import { CharacterPreview } from './CharacterPreview';
import { StoreVisual } from './StoreVisual';
import { ACCESSORIES, GRENADE_SKINS, OUTFITS, WEAPONS, WEAPON_SKINS } from '../game/config';

export function MatchPauseMenu({
                                   activeTab,
                                   accessoryIds,
                                   equipOutfit,
                                   equipWeapon,
                                   grenadeSkinId,
                                   onContinue,
                                   onExit,
                                   onMobileControls,
                                   onSetTab,
                                   onToggleAccessory,
                                   outfitId,
                                   ownedAccessories,
                                   ownedOutfits,
                                   weaponId,
                                   weaponSkinId,
                                   weaponUnlocked,
                               }) {
    const outfit = OUTFITS.find((item) => item.id === outfitId) || OUTFITS[0];
    const accessories = accessoryIds.map((id) => ACCESSORIES.find((item) => item.id === id)).filter(Boolean);
    const weapon = WEAPONS[weaponId] || WEAPONS.rifle;
    const weaponSkin = WEAPON_SKINS.find((item) => item.id === weaponSkinId) || WEAPON_SKINS[0];
    const grenadeSkin = GRENADE_SKINS.find((item) => item.id === grenadeSkinId) || GRENADE_SKINS[0];
    const accessoryForSlot = (slot) => accessoryIds.find((id) => ACCESSORIES.find((item) => item.id === id)?.slot === slot);
    const accessoriesBySlot = (slots) => ACCESSORIES.filter((item) => ownedAccessories.includes(item.id) && slots.includes(item.slot));
    const renderAccessory = (item) => (
        <button
            className={accessoryForSlot(item.slot) === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
            key={item.id}
            onClick={() => onToggleAccessory(item)}
        >
            <StoreVisual color={item.color} kind={item.slot} />
            <b>{item.name}</b>
            <small>{item.slot}</small>
        </button>
    );

    return (
        <div className="death-customizer pause-customizer">
            <header>
                <strong>Paused</strong>
                <span>Loadout changes apply immediately</span>
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
                        <button className={activeTab === 'outfits' ? 'active' : ''} onClick={() => onSetTab('outfits')}>Outfits</button>
                        <button className={activeTab === 'weapons' ? 'active' : ''} onClick={() => onSetTab('weapons')}>Weapons</button>
                    </div>
                    <div className="death-customizer-scroll">
                        {activeTab === 'outfits' ? (
                            <>
                                <section>
                                    <span>Outfits</span>
                                    <div className="death-customizer-grid">
                                        {OUTFITS.filter((item) => ownedOutfits.includes(item.id)).map((item) => (
                                            <button
                                                className={outfitId === item.id ? 'death-customizer-item active' : 'death-customizer-item'}
                                                key={item.id}
                                                onClick={() => equipOutfit(item.id)}
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
                                        {accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).map(renderAccessory)}
                                        {!accessoriesBySlot(['hat', 'hair', 'glasses', 'nose']).length && <em>No accessories owned yet</em>}
                                    </div>
                                </section>
                                <section>
                                    <span>Gear</span>
                                    <div className="death-customizer-grid">
                                        {accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail', 'shoes']).map(renderAccessory)}
                                        {!accessoriesBySlot(['shirt', 'belt', 'backpack', 'watch', 'tail', 'shoes']).length && <em>No accessories owned yet</em>}
                                    </div>
                                </section>
                            </>
                        ) : (
                            <section>
                                <span>Choose weapon</span>
                                <div className="death-customizer-grid">
                                    {Object.entries(WEAPONS).map(([id, item]) => (
                                        <button
                                            className={weaponId === id ? 'death-customizer-item active' : 'death-customizer-item'}
                                            disabled={!weaponUnlocked(item)}
                                            key={id}
                                            onClick={() => equipWeapon(id)}
                                        >
                                            <StoreVisual color={item.color} kind="weapon" weaponId={id} />
                                            <b>{item.name}</b>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                    <div className="customizer-footer death-customizer-footer pause-menu-actions">
                        <button className="primary-command" onClick={onContinue}>Continue</button>
                        <button className="secondary-command mobile-only-command" onClick={onMobileControls}>Mobile Controls</button>
                        <button className="danger-command" onClick={onExit}>Exit Match</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
