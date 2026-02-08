import './style.css';
import { FallingScene } from './scene/FallingScene';
import { HeaderOverlay } from './ui/HeaderOverlay';
import { LocalWeatherService } from './utils/LocalWeatherService';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #scene canvas element.');
}
if (!(uiRoot instanceof HTMLElement)) {
  throw new Error('Missing #ui-root container element.');
}

const fallingScene = new FallingScene(canvas);
const headerOverlay = new HeaderOverlay(uiRoot);
const localWeatherService = new LocalWeatherService();
localWeatherService.start();

let disposed = false;
const cleanup = (): void => {
  if (disposed) return;
  disposed = true;
  localWeatherService.stop();
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
