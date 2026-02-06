import * as THREE from 'three';
import { MenuIcon3D, type IconType } from './MenuIcon3D';

const ICON_RENDER_SIZE = 144;

export class MainMenu {
  private container: HTMLElement;
  private clockInterval: number | null = null;
  private icons: MenuIcon3D[] = [];
  private iconRenderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Single shared offscreen renderer for all 3D icons
    const offscreen = document.createElement('canvas');
    offscreen.width = ICON_RENDER_SIZE;
    offscreen.height = ICON_RENDER_SIZE;
    this.iconRenderer = new THREE.WebGLRenderer({
      canvas: offscreen,
      alpha: true,
      antialias: true,
    });
    this.iconRenderer.setSize(ICON_RENDER_SIZE, ICON_RENDER_SIZE, false);
    this.iconRenderer.setPixelRatio(1);

    this.render();
    this.startIconLoop();
  }

  private render(): void {
    const header = this.createHeader();
    this.container.appendChild(header);

    const menu = this.createMenu();
    this.container.appendChild(menu);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'dc-header';

    const title = document.createElement('img');
    title.className = 'dc-title';
    title.src = '/whiteText.png';
    title.alt = 'The Big One';

    const datetime = document.createElement('span');
    datetime.className = 'dc-datetime';
    this.updateDateTime(datetime);

    // Update clock every second
    this.clockInterval = window.setInterval(() => {
      this.updateDateTime(datetime);
    }, 1000);

    header.appendChild(title);
    header.appendChild(datetime);

    return header;
  }

  private createMenu(): HTMLElement {
    const menu = document.createElement('nav');
    menu.className = 'dc-menu';

    const buttons: { label: string; iconType: IconType }[] = [
      { label: 'Early Access', iconType: 'rocket' },
      { label: 'GlobaNet', iconType: 'globe' },
      { label: 'About Us', iconType: 'info' },
    ];

    buttons.forEach((btn, i) => {
      const button = document.createElement('button');
      button.className = 'dc-menu-btn';
      button.style.animationDelay = `${0.2 + i * 0.15}s`;

      const iconEl = document.createElement('span');
      iconEl.className = 'dc-menu-btn-icon';

      const canvas = document.createElement('canvas');
      canvas.width = ICON_RENDER_SIZE;
      canvas.height = ICON_RENDER_SIZE;
      iconEl.appendChild(canvas);

      const icon = new MenuIcon3D(canvas, btn.iconType);
      this.icons.push(icon);

      const labelEl = document.createElement('span');
      labelEl.className = 'dc-menu-btn-label';
      labelEl.textContent = btn.label;

      button.appendChild(iconEl);
      button.appendChild(labelEl);
      menu.appendChild(button);
    });

    return menu;
  }

  private startIconLoop(): void {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      for (const icon of this.icons) {
        icon.update(delta, this.iconRenderer);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updateDateTime(element: HTMLElement): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    element.textContent = now.toLocaleDateString('en-US', options);
  }

  public destroy(): void {
    if (this.clockInterval) {
      window.clearInterval(this.clockInterval);
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    for (const icon of this.icons) {
      icon.dispose();
    }
    this.icons = [];
    this.iconRenderer.dispose();
  }
}
