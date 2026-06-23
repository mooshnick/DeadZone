export function StoreVisual({ color, kind = 'outfit', weaponId }) {
  return (
    <span className={`store-visual store-visual--${kind} ${weaponId ? `store-visual--${weaponId}` : ''}`} style={{ '--item-color': color }}>
      <i />
      <b />
      <em />
    </span>
  );
}
