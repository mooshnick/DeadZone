import { useCallback, useEffect, useRef, useState } from 'react';

const JOYSTICK_RADIUS = 56;
const DEAD_ZONE = 0.18;
const CONTROL_LABELS = {
  aim: 'Aim',
  grenade: 'Grenade',
  joystick: 'Move',
  jump: 'Jump',
  reload: 'Reload',
  shoot: 'Shoot',
};

function requestMobileFullscreen() {
  if (document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().catch?.(() => {});
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export function MobileTouchControls({
  controlConfig,
  disabled = false,
  editMode = false,
  grenadeCharge = 0,
  grenadeCount = 0,
  onControlChange,
  onSelectControl,
  selectedControl,
  scoped = false,
  onGrenadeEnd,
  onGrenadeStart,
  onJump,
  onLook,
  onMove,
  onReload,
  onScopeToggle,
  onShootEnd,
  onShootStart,
  resetSignal = 0,
}) {
  const [enabled, setEnabled] = useState(false);
  const [stick, setStick] = useState({ active: false, x: 0, y: 0 });
  const callbacks = useRef({});
  const joystickOrigin = useRef(null);
  const activeStickPointer = useRef(null);
  const activeLookPointer = useRef(null);
  const activeShootPointer = useRef(null);
  const lastLookPoint = useRef(null);
  const lastShootPoint = useRef(null);
  const editDrag = useRef(null);

  useEffect(() => {
    callbacks.current = {
      onGrenadeEnd,
      onGrenadeStart,
      onJump,
      onLook,
      onMove,
      onReload,
      onScopeToggle,
      onShootEnd,
      onShootStart,
    };
  });

  useEffect(() => {
    const update = () => setEnabled(isTouchDevice());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const resetJoystick = useCallback(() => {
    activeStickPointer.current = null;
    joystickOrigin.current = null;
    setStick({ active: false, x: 0, y: 0 });
    callbacks.current.onMove?.({ x: 0, y: 0 });
  }, []);

  const resetAllTouches = useCallback(() => {
    resetJoystick();
    activeLookPointer.current = null;
    activeShootPointer.current = null;
    lastLookPoint.current = null;
    lastShootPoint.current = null;
    callbacks.current.onShootEnd?.();
    callbacks.current.onGrenadeEnd?.();
  }, [resetJoystick]);

  useEffect(() => {
    const clear = () => resetAllTouches();
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('pointercancel', clear);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      window.removeEventListener('pagehide', clear);
      document.removeEventListener('visibilitychange', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, [resetAllTouches]);

  useEffect(() => {
    if (disabled) {
      window.setTimeout(resetAllTouches, 0);
    } else {
      window.setTimeout(resetAllTouches, 0);
    }
  }, [disabled, resetAllTouches]);

  useEffect(() => {
    window.setTimeout(resetAllTouches, 0);
  }, [resetAllTouches, resetSignal]);

  if (!enabled || (disabled && !editMode)) return null;

  const controlStyle = (id) => {
    const control = controlConfig?.[id];
    if (!control) return undefined;
    return {
      left: `${control.x}%`,
      top: `${control.y}%`,
      '--control-size': control.size || 1,
    };
  };

  const updateControlPosition = (id, event) => {
    const rect = event.currentTarget.closest('.mobile-touch-layer')?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100));
    onControlChange?.(id, { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
  };

  const beginEditDrag = (id, event) => {
    if (!editMode) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    editDrag.current = { id, pointerId: event.pointerId };
    onSelectControl?.(id);
    updateControlPosition(id, event);
    return true;
  };

  const moveEditDrag = (id, event) => {
    if (!editMode || editDrag.current?.id !== id || editDrag.current?.pointerId !== event.pointerId) return false;
    event.preventDefault();
    updateControlPosition(id, event);
    return true;
  };

  const endEditDrag = (id, event) => {
    if (!editMode || editDrag.current?.id !== id || editDrag.current?.pointerId !== event.pointerId) return false;
    event.preventDefault();
    editDrag.current = null;
    return true;
  };

  const updateJoystick = (event) => {
    if (!joystickOrigin.current) return;
    const dx = event.clientX - joystickOrigin.current.x;
    const dy = event.clientY - joystickOrigin.current.y;
    const distance = Math.min(JOYSTICK_RADIUS, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const visualX = Math.cos(angle) * distance;
    const visualY = Math.sin(angle) * distance;
    const normalizedX = visualX / JOYSTICK_RADIUS;
    const normalizedY = visualY / JOYSTICK_RADIUS;
    const magnitude = Math.hypot(normalizedX, normalizedY);
    const movement = magnitude < DEAD_ZONE
      ? { x: 0, y: 0 }
      : { x: normalizedX, y: normalizedY };
    setStick({ active: true, x: visualX, y: visualY });
    callbacks.current.onMove?.(movement);
  };

  const handleJoystickDown = (event) => {
    if (beginEditDrag('joystick', event)) return;
    if (disabled) return;
    event.preventDefault();
    requestMobileFullscreen();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeStickPointer.current = event.pointerId;
    joystickOrigin.current = { x: event.clientX, y: event.clientY };
    updateJoystick(event);
  };

  const handleJoystickMove = (event) => {
    if (moveEditDrag('joystick', event)) return;
    if (event.pointerId !== activeStickPointer.current) return;
    event.preventDefault();
    updateJoystick(event);
  };

  const handleJoystickEnd = (event) => {
    if (endEditDrag('joystick', event)) return;
    if (event.pointerId !== activeStickPointer.current) return;
    event.preventDefault();
    resetJoystick();
  };

  const handleLookDown = (event) => {
    if (disabled || activeLookPointer.current != null) return;
    event.preventDefault();
    requestMobileFullscreen();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeLookPointer.current = event.pointerId;
    lastLookPoint.current = { x: event.clientX, y: event.clientY };
  };

  const handleLookMove = (event) => {
    if (event.pointerId !== activeLookPointer.current || !lastLookPoint.current) return;
    event.preventDefault();
    const dx = event.clientX - lastLookPoint.current.x;
    const dy = event.clientY - lastLookPoint.current.y;
    lastLookPoint.current = { x: event.clientX, y: event.clientY };
    callbacks.current.onLook?.(dx, dy);
  };

  const handleLookEnd = (event) => {
    if (event.pointerId !== activeLookPointer.current) return;
    event.preventDefault();
    activeLookPointer.current = null;
    lastLookPoint.current = null;
  };

  const handleShootDown = (event) => {
    if (beginEditDrag('shoot', event)) return;
    if (disabled) return;
    event.preventDefault();
    requestMobileFullscreen();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeShootPointer.current = event.pointerId;
    lastShootPoint.current = { x: event.clientX, y: event.clientY };
    callbacks.current.onShootStart?.();
  };

  const handleShootMove = (event) => {
    if (moveEditDrag('shoot', event)) return;
    if (event.pointerId !== activeShootPointer.current || !lastShootPoint.current) return;
    event.preventDefault();
    const dx = event.clientX - lastShootPoint.current.x;
    const dy = event.clientY - lastShootPoint.current.y;
    lastShootPoint.current = { x: event.clientX, y: event.clientY };
    callbacks.current.onLook?.(dx, dy);
  };

  const handleShootEnd = (event) => {
    if (endEditDrag('shoot', event)) return;
    if (event.pointerId !== activeShootPointer.current) return;
    event.preventDefault();
    activeShootPointer.current = null;
    lastShootPoint.current = null;
    callbacks.current.onShootEnd?.();
  };

  return (
    <div
      className={editMode ? 'mobile-touch-layer mobile-touch-editing' : 'mobile-touch-layer'}
      aria-hidden={disabled ? 'true' : 'false'}
    >
      <div
        className="mobile-look-pad"
        onPointerCancel={handleLookEnd}
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookEnd}
      />

      <section
        className={[
          disabled ? 'mobile-joystick disabled' : 'mobile-joystick',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'joystick' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        onPointerCancel={handleJoystickEnd}
        onPointerDown={handleJoystickDown}
        onLostPointerCapture={handleJoystickEnd}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickEnd}
        style={controlStyle('joystick')}
      >
        {editMode && <em>{CONTROL_LABELS.joystick}</em>}
        <span className="mobile-joystick-ring" />
        <span
          className={stick.active ? 'mobile-joystick-thumb active' : 'mobile-joystick-thumb'}
          style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
        />
      </section>

      <button
        className={[
          scoped ? 'mobile-action mobile-action--aim active' : 'mobile-action mobile-action--aim',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'aim' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled && !editMode}
        onPointerDown={(event) => {
          if (beginEditDrag('aim', event)) return;
          event.preventDefault();
          requestMobileFullscreen();
          callbacks.current.onScopeToggle?.();
        }}
        onPointerMove={(event) => moveEditDrag('aim', event)}
        onPointerUp={(event) => endEditDrag('aim', event)}
        style={controlStyle('aim')}
        type="button"
      >
        Aim
      </button>
      <button
        className={[
          'mobile-action mobile-action--shoot',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'shoot' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled && !editMode}
        onPointerCancel={handleShootEnd}
        onPointerDown={handleShootDown}
        onLostPointerCapture={handleShootEnd}
        onPointerMove={handleShootMove}
        onPointerUp={handleShootEnd}
        style={controlStyle('shoot')}
        type="button"
      >
        Shoot
      </button>
      <button
        className={[
          'mobile-action',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'jump' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled && !editMode}
        onClick={() => !editMode && callbacks.current.onJump?.()}
        onPointerDown={(event) => beginEditDrag('jump', event)}
        onPointerMove={(event) => moveEditDrag('jump', event)}
        onPointerUp={(event) => endEditDrag('jump', event)}
        style={controlStyle('jump')}
        type="button"
      >
        Jump
      </button>
      <button
        className={[
          'mobile-action',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'reload' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled && !editMode}
        onClick={() => !editMode && callbacks.current.onReload?.()}
        onPointerDown={(event) => beginEditDrag('reload', event)}
        onPointerMove={(event) => moveEditDrag('reload', event)}
        onPointerUp={(event) => endEditDrag('reload', event)}
        style={controlStyle('reload')}
        type="button"
      >
        Reload
      </button>
      <button
        className={[
          'mobile-action mobile-action--grenade',
          controlConfig ? 'mobile-control-free' : '',
          editMode ? 'editable' : '',
          selectedControl === 'grenade' ? 'selected' : '',
        ].filter(Boolean).join(' ')}
        disabled={(disabled || grenadeCount <= 0) && !editMode}
        onPointerCancel={() => callbacks.current.onGrenadeEnd?.()}
        onPointerDown={(event) => {
          if (beginEditDrag('grenade', event)) return;
          event.preventDefault();
          requestMobileFullscreen();
          callbacks.current.onGrenadeStart?.();
        }}
        onPointerLeave={() => !editMode && callbacks.current.onGrenadeEnd?.()}
        onPointerMove={(event) => moveEditDrag('grenade', event)}
        onPointerUp={(event) => {
          if (endEditDrag('grenade', event)) return;
          callbacks.current.onGrenadeEnd?.();
        }}
        style={controlStyle('grenade')}
        type="button"
      >
        Grenade
      </button>

      {grenadeCount > 0 && grenadeCharge > 0 && (
        <div className="mobile-grenade-power">
          <span>Throw</span>
          <i><b style={{ width: `${Math.round(grenadeCharge * 100)}%` }} /></i>
        </div>
      )}
    </div>
  );
}
