const DEFAULT_SERVER_PORT = '8080';
const DEFAULT_PRODUCTION_API_ORIGIN = 'https://deadzone-fvcb.onrender.com';

function localNetworkOrigin(configured) {
  try {
    const configuredUrl = new URL(configured);
    const appHostname = window.location.hostname;
    const appIsLocal = appHostname === 'localhost' || appHostname === '127.0.0.1' || appHostname === '';
    const configuredIsLoopback = configuredUrl.hostname === 'localhost' || configuredUrl.hostname === '127.0.0.1';

    if (configuredIsLoopback && !appIsLocal) {
      configuredUrl.hostname = appHostname;
      return configuredUrl.toString().replace(/\/$/, '');
    }
  } catch {
    return configured.replace(/\/$/, '');
  }

  return configured.replace(/\/$/, '');
}

function serverOrigin() {
  const configured = import.meta.env.VITE_API_ORIGIN;
  const { hostname, protocol } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  if (isLocal) {
    return `${protocol}//127.0.0.1:${DEFAULT_SERVER_PORT}`;
  }

  if (configured) {
    return localNetworkOrigin(configured);
  }

  if (!isLocal) {
    return DEFAULT_PRODUCTION_API_ORIGIN;
  }
  return `${protocol}//127.0.0.1:${DEFAULT_SERVER_PORT}`;
}

export function apiBase(path) {
  return `${serverOrigin()}${path}`;
}

export function sameOriginApiBase(path) {
  return apiBase(path);
}

export function gameSocketUrl() {
  const origin = serverOrigin();
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/game';
  url.search = '';
  url.hash = '';
  return url.toString();
}
