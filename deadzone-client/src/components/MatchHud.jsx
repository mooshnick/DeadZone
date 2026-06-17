import { MAPS, WEAPONS } from '../game/config';

export function MatchHud({
  activeBuffs,
  ammo,
  canvasRef,
  currentMatch,
  deathInfo,
  events,
  isScoped,
  leaveMatch,
  localId,
  score,
  selectedRoomId,
  wallet,
  worldRef,
}) {
  const weapon = WEAPONS[currentMatch.weaponId] || WEAPONS.rifle;
  const mapName = MAPS.find((map) => map.id === currentMatch.mapId)?.name || 'Arena';
  const reloadPercent = Math.round((ammo.reloadProgress || 0) * 100);
  const grenadeCount = Math.min(3, ammo.grenades ?? 0);

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
          <strong>{selectedRoomId} / {mapName}</strong>
        </div>
        <div className="scoreboard">
          <span className="blue-score">Blue {score.blue}</span>
          <b>:</b>
          <span className="red-score">{score.red} Red</span>
        </div>
        <button className="exit-match" onClick={leaveMatch}>Exit</button>
      </header>

      <footer className="match-panel overlay">
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
            <strong>NIS {wallet}</strong>
            <small>kills pay</small>
          </div>
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
