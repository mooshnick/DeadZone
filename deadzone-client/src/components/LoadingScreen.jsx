import { useEffect, useMemo, useRef, useState } from 'react';

const IMAGE_PATTERN = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ ok: true, url });
    image.onerror = () => resolve({ ok: false, url });
    image.src = url;
  });
}

function loadAsset(url) {
  if (IMAGE_PATTERN.test(url)) {
    return loadImage(url);
  }

  return fetch(url)
    .then((response) => ({ ok: response.ok, url }))
    .catch(() => ({ ok: false, url }));
}

export function LoadingScreen({
  assetUrls = [],
  backendUrl = 'http://127.0.0.1:8080/api/rooms',
  timedProgressMs = 4200,
  onComplete,
}) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const loadedCountRef = useRef(0);
  const assetsReadyRef = useRef(false);
  const completedRef = useRef(false);

  const loadingSteps = useMemo(() => (
    [...assetUrls, { type: 'backend', url: backendUrl }].filter((item) => (
      typeof item === 'string' ? item : item.url
    ))
  ), [assetUrls, backendUrl]);

  useEffect(() => {
    let cancelled = false;
    let progressTimer = null;
    let finishTimer = null;
    const startedAt = performance.now();
    const totalCount = loadingSteps.length || 1;

    const finishLoading = () => {
      if (cancelled || completedRef.current) return;
      completedRef.current = true;
      setProgress(100);
      window.setTimeout(() => {
        if (!cancelled) onComplete?.();
      }, 220);
    };

    const updateTimedProgress = () => {
      if (cancelled || completedRef.current) return;
      const elapsed = performance.now() - startedAt;
      const timedProgress = Math.min(99, Math.round((elapsed / timedProgressMs) * 100));
      setProgress(timedProgress);

      if (elapsed >= timedProgressMs && assetsReadyRef.current) {
        finishLoading();
      }
    };

    const completeStep = () => {
      if (cancelled) return;
      loadedCountRef.current = Math.min(totalCount, loadedCountRef.current + 1);
      setLoadedCount(loadedCountRef.current);
      if (loadedCountRef.current >= totalCount) {
        assetsReadyRef.current = true;
        if (performance.now() - startedAt >= timedProgressMs) {
          finishLoading();
        }
      }
    };

    updateTimedProgress();
    progressTimer = window.setInterval(updateTimedProgress, 80);
    finishTimer = window.setTimeout(() => {
      if (assetsReadyRef.current) {
        finishLoading();
      }
    }, timedProgressMs);

    if (!loadingSteps.length) {
      Promise.resolve().then(completeStep);
    } else {
      loadingSteps.forEach((step) => {
        const url = typeof step === 'string' ? step : step.url;
        const task = typeof step === 'string'
          ? loadAsset(url)
          : fetch(url, {
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => null);

        Promise.resolve(task).finally(completeStep);
      });
    }

    return () => {
      cancelled = true;
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
      if (finishTimer) {
        window.clearTimeout(finishTimer);
      }
    };
  }, [loadingSteps, onComplete, timedProgressMs]);

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-panel">
        <img className="loading-logo" src="/deadZone_Logo.png" alt="DeadZone" />
        <div className="loading-track" aria-label={`Loading ${progress}%`}>
          <div className="loading-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="loading-text">
          LOADING ASSETS ({loadedCount}/{loadingSteps.length})... {progress}%
        </span>
      </div>
    </div>
  );
}
