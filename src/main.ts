import './style.css';
import { SceneManager } from './scene/SceneManager';
import { Terminal } from './ui/Terminal';

// Initialize 3D scene
const canvas = document.getElementById('scene') as HTMLCanvasElement;
new SceneManager(canvas);

// Initialize terminal UI
const uiRoot = document.getElementById('ui-root') as HTMLElement;
new Terminal(uiRoot);
