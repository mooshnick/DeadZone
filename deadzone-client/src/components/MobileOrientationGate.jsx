import { useEffect, useState } from 'react';

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function isPortrait() {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

async function enterMobileFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement) {
    try {
      await root.requestFullscreen?.();
    } catch {
      // Mobile browsers may require a direct user gesture or may not support fullscreen.
    }
  }
  try {
    await window.screen?.orientation?.lock?.('landscape');
  } catch {
    // iOS Safari does not allow programmatic orientation lock; the overlay still guides the player.
  }
}

export function MobileOrientationGate({ paused = false }) {
  const [touchDevice, setTouchDevice] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const update = () => {
      setTouchDevice(isTouchDevice());
      setPortrait(isPortrait());
      setFullscreen(Boolean(document.fullscreenElement));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
    };
  }, []);

  useEffect(() => {
    if (touchDevice && !portrait && !paused) {
      enterMobileFullscreen();
    }
  }, [paused, portrait, touchDevice]);

  if (!touchDevice || (!portrait && fullscreen)) {
    return null;
  }

  return (
    <section className={portrait ? 'mobile-orientation-gate portrait' : 'mobile-orientation-gate'} role="dialog" aria-modal="true">
      <div>
        <img src="/Shadow_Logo.png" alt="DeadZone" />
        <strong>{portrait ? 'Rotate your phone' : 'Enter full screen'}</strong>
        <span>{portrait ? 'Dead Zone is built for landscape play.' : 'Full screen gives you more room for controls.'}</span>
        <button type="button" onClick={enterMobileFullscreen}>
          {portrait ? 'I rotated' : 'Full Screen'}
        </button>
      </div>
    </section>
  );
}
