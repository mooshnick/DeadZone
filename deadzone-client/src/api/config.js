const DEFAULT_SERVER_PORT = '8080';

function serverOrigin() {
  const configured = import.meta.env.VITE_API_ORIGIN;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const { hostname, protocol } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  const host = isLocal ? '127.0.0.1' : hostname;
  return `${protocol}//${host}:${DEFAULT_SERVER_PORT}`;
}

export function apiBase(path) {
  return `${serverOrigin()}${path}`;
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
