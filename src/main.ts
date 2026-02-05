import './style.css';
import { FallingScene } from './scene/FallingScene';
import { DreamcastMenu } from './ui/DreamcastMenu';

// Initialize Three.js falling scene
const canvas = document.getElementById('scene') as HTMLCanvasElement;
new FallingScene(canvas);

// Initialize Dreamcast BIOS-style menu (HTML overlay)
const uiRoot = document.getElementById('ui-root') as HTMLElement;
new DreamcastMenu(uiRoot);
