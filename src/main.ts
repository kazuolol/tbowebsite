import './style.css';
import { FallingScene } from './scene/FallingScene';
import { MainMenu } from './ui/MainMenu';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #scene canvas element.');
}
if (!(uiRoot instanceof HTMLElement)) {
  throw new Error('Missing #ui-root container element.');
}

const fallingScene = new FallingScene(canvas);
const mainMenu = new MainMenu(uiRoot);

let disposed = false;
const cleanup = (): void => {
  if (disposed) return;
  disposed = true;
  mainMenu.destroy();
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
