import { useCallback, useEffect, useRef, useState } from 'react';

const JOYSTICK_RADIUS = 56;
const DEAD_ZONE = 0.18;

function requestMobileFullscreen() {
  if (document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().catch?.(() => {});
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export function MobileTouchControls({
  disabled = false,
  grenadeCharge = 0,
  grenadeCount = 0,
  onInteract,
  onLook,
  onMove,
  onScopeEnd,
  onScopeStart,
  onShootEnd,
  onShootStart,
  onSwitchWeapon,
}) {
  const [enabled, setEnabled] = useState(false);
  const [stick, setStick] = useState({ active: false, x: 0, y: 0 });
  const callbacks = useRef({});
  const joystickOrigin = useRef(null);
  const activeStickPointer = useRef(null);
  const activeLookPointer = useRef(null);
  const lastLookPoint = useRef(null);

  useEffect(() => {
    callbacks.current = {
      onInteract,
      onLook,
      onMove,
      onScopeEnd,
      onScopeStart,
      onShootEnd,
      onShootStart,
      onSwitchWeapon,
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
    lastLookPoint.current = null;
    callbacks.current.onShootEnd?.();
    callbacks.current.onScopeEnd?.();
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
    }
  }, [disabled, resetAllTouches]);

  if (!enabled || disabled) return null;

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
    if (disabled || activeStickPointer.current != null) return;
    event.preventDefault();
    requestMobileFullscreen();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeStickPointer.current = event.pointerId;
    joystickOrigin.current = { x: event.clientX, y: event.clientY };
    updateJoystick(event);
  };

  const handleJoystickMove = (event) => {
    if (event.pointerId !== activeStickPointer.current) return;
    event.preventDefault();
    updateJoystick(event);
  };

  const handleJoystickEnd = (event) => {
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

  return (
    <div className="mobile-touch-layer" aria-hidden={disabled ? 'true' : 'false'}>
      <div
        className="mobile-look-pad"
        onPointerCancel={handleLookEnd}
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookEnd}
      />

      <section
        className={disabled ? 'mobile-joystick disabled' : 'mobile-joystick'}
        onPointerCancel={handleJoystickEnd}
        onPointerDown={handleJoystickDown}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickEnd}
      >
        <span className="mobile-joystick-ring" />
        <span
          className={stick.active ? 'mobile-joystick-thumb active' : 'mobile-joystick-thumb'}
          style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
        />
      </section>

      <section className="mobile-action-pad">
        <button
          className="mobile-action mobile-action--aim"
          disabled={disabled}
          onPointerCancel={() => callbacks.current.onScopeEnd?.()}
          onPointerDown={(event) => {
            event.preventDefault();
            requestMobileFullscreen();
            callbacks.current.onScopeStart?.();
          }}
          onPointerLeave={() => callbacks.current.onScopeEnd?.()}
          onPointerUp={() => callbacks.current.onScopeEnd?.()}
          type="button"
        >
          Aim
        </button>
        <button
          className="mobile-action mobile-action--shoot"
          disabled={disabled}
          onPointerCancel={() => callbacks.current.onShootEnd?.()}
          onPointerDown={(event) => {
            event.preventDefault();
            requestMobileFullscreen();
            callbacks.current.onShootStart?.();
          }}
          onPointerLeave={() => callbacks.current.onShootEnd?.()}
          onPointerUp={() => callbacks.current.onShootEnd?.()}
          type="button"
        >
          Shoot
        </button>
        <button className="mobile-action" disabled={disabled} onClick={() => callbacks.current.onInteract?.()} type="button">Interact</button>
        <button className="mobile-action" disabled={disabled} onClick={() => callbacks.current.onSwitchWeapon?.()} type="button">Switch</button>
      </section>

      {grenadeCount > 0 && grenadeCharge > 0 && (
        <div className="mobile-grenade-power">
          <span>Throw</span>
          <i><b style={{ width: `${Math.round(grenadeCharge * 100)}%` }} /></i>
        </div>
      )}
    </div>
  );
}
