import './style.css';
import { FallingScene } from './scene/FallingScene';
import { HeaderOverlay } from './ui/HeaderOverlay';
import { EarlyAccessOverlay } from './ui/EarlyAccessOverlay';
import { LocalWeatherService } from './utils/LocalWeatherService';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #scene canvas element.');
}
if (!(uiRoot instanceof HTMLElement)) {
  throw new Error('Missing #ui-root container element.');
}

const clearEarlyAccessCacheOnRefresh = (): void => {
  const keys = [
    'tbo:early-access-overlay:state:v2',
    'tbo:early-access-api:mock-state:v1',
    'tbo:early-access-api:client-id:v1',
    'tbo:early-access:dev-wallet',
  ];
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }
};

if (import.meta.env.DEV) {
  clearEarlyAccessCacheOnRefresh();
}

const fallingScene = new FallingScene(canvas);
const headerOverlay = new HeaderOverlay(uiRoot);
const earlyAccessOverlay = new EarlyAccessOverlay(uiRoot);
const localWeatherService = new LocalWeatherService();
localWeatherService.start();

const parseDeepLinkGuildCode = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const guild = params.get('guild');
  if (!guild) {
    return undefined;
  }
  const normalized = guild.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(normalized)) {
    return undefined;
  }
  return normalized;
};

const deepLinkGuildCode = parseDeepLinkGuildCode();
const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
const isClaimPath = path === '/claim';
if (isClaimPath || deepLinkGuildCode) {
  earlyAccessOverlay.open({ deepLinkGuildCode });
}

const handleMenuAction = (event: Event): void => {
  const customEvent = event as CustomEvent<{ action?: unknown }>;
  if (customEvent.detail?.action === 'early-access') {
    earlyAccessOverlay.open();
  }
};

window.addEventListener('tbo:menu-action', handleMenuAction as EventListener);

let disposed = false;
const cleanup = (): void => {
  if (disposed) return;
  disposed = true;
  window.removeEventListener('tbo:menu-action', handleMenuAction as EventListener);
  localWeatherService.stop();
  earlyAccessOverlay.destroy();
  headerOverlay.destroy();
  fallingScene.dispose();
};

const handleBeforeUnload = (): void => {
  cleanup();
};

window.addEventListener('beforeunload', handleBeforeUnload);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    cleanup();
  });
}
