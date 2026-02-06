import * as THREE from 'three';
import { MenuIcon3D, type IconType } from './MenuIcon3D';
import { drawWeatherIcon } from './WeatherIcons2D';

const ICON_RENDER_SIZE = 216;
const WEATHER_ICON_SIZE = 34;
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const MENU_ACTION_EVENT = 'tbo:menu-action';

export type MenuAction = 'early-access' | 'play' | 'about-us';

export interface MenuActionDetail {
  action: MenuAction;
  label: string;
}

interface MenuButtonDefinition {
  label: string;
  iconType: IconType;
  action: MenuAction;
}

interface WeatherApiResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
}

interface IpGeoResponse {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  loc?: string;
  success?: boolean;
}

export class MainMenu {
  private container: HTMLElement;
  private clockInterval: number | null = null;
  private weatherInterval: number | null = null;
  private icons: MenuIcon3D[] = [];
  private iconRenderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private dateTimeTextEl: HTMLSpanElement | null = null;
  private weatherIconEl: HTMLSpanElement | null = null;
  private weatherTextEl: HTMLSpanElement | null = null;
  private weatherCanvas: HTMLCanvasElement | null = null;

  private weatherCoords: { latitude: number; longitude: number } | null = null;
  private weatherInFlight = false;
  private weatherTempF: number | null = null;
  private weatherCode: number | null = null;
  private weatherIsDay: boolean | null = null;
  private headerEl: HTMLElement | null = null;
  private menuEl: HTMLElement | null = null;
  private activeButton: HTMLButtonElement | null = null;
  private buttonCleanup: Array<() => void> = [];
  private destroyed = false;
  private onAction?: (detail: MenuActionDetail) => void;
  private readonly onResizeHandler = (): void => {
    this.updateDateTime();
  };

  constructor(container: HTMLElement, onAction?: (detail: MenuActionDetail) => void) {
    this.container = container;
    this.onAction = onAction;

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
    window.addEventListener('resize', this.onResizeHandler);
  }

  private render(): void {
    this.headerEl = this.createHeader();
    this.container.appendChild(this.headerEl);

    this.menuEl = this.createMenu();
    this.container.appendChild(this.menuEl);
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
    this.dateTimeTextEl = document.createElement('span');
    this.dateTimeTextEl.className = 'dc-datetime-text';

    this.weatherIconEl = document.createElement('span');
    this.weatherIconEl.className = 'dc-weather-icon';
    this.weatherCanvas = this.createStatusIconCanvas();
    this.weatherIconEl.appendChild(this.weatherCanvas);

    this.weatherTextEl = document.createElement('span');
    this.weatherTextEl.className = 'dc-weather-text';

    datetime.appendChild(this.dateTimeTextEl);
    datetime.appendChild(this.weatherTextEl);
    datetime.appendChild(this.weatherIconEl);
    this.updateDateTime();

    // Update clock every second
    this.clockInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);

    this.weatherInterval = window.setInterval(() => {
      void this.refreshWeather();
    }, WEATHER_REFRESH_MS);
    void this.refreshWeather();

    header.appendChild(title);
    header.appendChild(datetime);

    return header;
  }

  private createMenu(): HTMLElement {
    const menu = document.createElement('nav');
    menu.className = 'dc-menu';

    const buttons: MenuButtonDefinition[] = [
      { label: 'Early Access', iconType: 'rocket', action: 'early-access' },
      { label: 'Play', iconType: 'globe', action: 'play' },
      { label: 'About Us', iconType: 'info', action: 'about-us' },
    ];

    buttons.forEach((btn, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dc-menu-btn';
      button.style.animationDelay = `${0.2 + i * 0.15}s`;
      button.dataset.action = btn.action;

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

      const clickHandler = () => {
        this.handleMenuAction(btn, button);
      };
      button.addEventListener('click', clickHandler);
      this.buttonCleanup.push(() => {
        button.removeEventListener('click', clickHandler);
      });

      button.appendChild(iconEl);
      button.appendChild(labelEl);
      menu.appendChild(button);

      if (i === 0) {
        this.setActiveButton(button);
      }
    });

    return menu;
  }

  private setActiveButton(button: HTMLButtonElement): void {
    if (this.activeButton === button) return;
    this.activeButton?.classList.remove('is-active');
    button.classList.add('is-active');
    this.activeButton = button;
  }

  private handleMenuAction(buttonDef: MenuButtonDefinition, button: HTMLButtonElement): void {
    this.setActiveButton(button);

    const detail: MenuActionDetail = {
      action: buttonDef.action,
      label: buttonDef.label,
    };

    if (this.onAction) {
      this.onAction(detail);
      return;
    }

    window.dispatchEvent(new CustomEvent<MenuActionDetail>(MENU_ACTION_EVENT, { detail }));
  }

  private createStatusIconCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = WEATHER_ICON_SIZE;
    canvas.height = WEATHER_ICON_SIZE;
    return canvas;
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

  private updateDateTime(): void {
    if (!this.dateTimeTextEl || !this.weatherTextEl || !this.weatherCanvas) {
      return;
    }

    const now = new Date();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const formatCandidates = this.getDateTimeFormatCandidates(viewportWidth);

    const isDay = this.weatherIsDay ?? this.isLocalDay(now);
    const weatherSize = this.weatherCanvas.clientWidth || WEATHER_ICON_SIZE;
    let selectedText = now.toLocaleDateString('en-US', formatCandidates[formatCandidates.length - 1]);
    if (this.dateTimeTextEl.clientWidth > 0) {
      for (const format of formatCandidates) {
        const candidate = now.toLocaleDateString('en-US', format);
        this.dateTimeTextEl.textContent = candidate;
        selectedText = candidate;
        if (this.dateTimeTextEl.scrollWidth <= this.dateTimeTextEl.clientWidth + 1) {
          break;
        }
      }
    } else {
      selectedText = now.toLocaleDateString('en-US', formatCandidates[0]);
    }
    this.dateTimeTextEl.textContent = selectedText;
    drawWeatherIcon(this.weatherCanvas, this.weatherCode, isDay, weatherSize);
    this.weatherTextEl.textContent = this.weatherTempF !== null ? `${Math.round(this.weatherTempF)}F` : '--F';
  }

  private getDateTimeFormatCandidates(viewportWidth: number): Intl.DateTimeFormatOptions[] {
    if (viewportWidth <= 320) {
      return [
        { hour: '2-digit', minute: '2-digit', hour12: false },
        { hour: 'numeric', minute: '2-digit', hour12: true },
      ];
    }

    if (viewportWidth <= 390) {
      return [
        { hour: 'numeric', minute: '2-digit', hour12: true },
        { hour: '2-digit', minute: '2-digit', hour12: false },
      ];
    }

    if (viewportWidth <= 640) {
      return [
        { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
        { hour: 'numeric', minute: '2-digit', hour12: true },
        { hour: '2-digit', minute: '2-digit', hour12: false },
      ];
    }

    return [
      { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true },
      { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
      { hour: 'numeric', minute: '2-digit', hour12: true },
    ];
  }

  private isLocalDay(now: Date): boolean {
    const hour = now.getHours();
    return hour >= 6 && hour < 18;
  }

  private async refreshWeather(): Promise<void> {
    if (this.weatherInFlight) {
      return;
    }

    this.weatherInFlight = true;

    try {
      if (!this.weatherCoords) {
        this.weatherCoords = await this.resolveWeatherCoordinates();
      }
      if (!this.weatherCoords) {
        throw new Error('Coordinates unavailable');
      }

      const { latitude, longitude } = this.weatherCoords;
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        '&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto';

      const response = await fetch(weatherUrl);
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const payload = (await response.json()) as WeatherApiResponse;
      const current = payload.current;
      if (
        !current ||
        typeof current.temperature_2m !== 'number' ||
        typeof current.weather_code !== 'number' ||
        typeof current.is_day !== 'number'
      ) {
        throw new Error('Weather payload missing current data');
      }

      this.weatherTempF = current.temperature_2m;
      this.weatherCode = current.weather_code;
      this.weatherIsDay = current.is_day === 1;
    } catch (error) {
      console.warn('Failed to refresh local weather.', error);
    } finally {
      this.weatherInFlight = false;
      this.updateDateTime();
    }
  }

  private async resolveWeatherCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
    return this.getCoordinatesFromIp();
  }

  private async getCoordinatesFromIp(): Promise<{ latitude: number; longitude: number } | null> {
    const endpoints = [
      'https://ipwho.is/',
      'https://ipapi.co/json/',
      'https://ipinfo.io/json',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as IpGeoResponse;
        if (payload.success === false) {
          continue;
        }

        const directLat = this.parseCoordinate(payload.latitude ?? payload.lat);
        const directLon = this.parseCoordinate(payload.longitude ?? payload.lon);
        if (directLat !== null && directLon !== null) {
          return { latitude: directLat, longitude: directLon };
        }

        if (typeof payload.loc === 'string') {
          const [latText, lonText] = payload.loc.split(',');
          const locLat = this.parseCoordinate(latText);
          const locLon = this.parseCoordinate(lonText);
          if (locLat !== null && locLon !== null) {
            return { latitude: locLat, longitude: locLon };
          }
        }
      } catch {
        // Try the next endpoint.
      }
    }

    return null;
  }

  private parseCoordinate(value: number | string | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.clockInterval !== null) {
      window.clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    if (this.weatherInterval !== null) {
      window.clearInterval(this.weatherInterval);
      this.weatherInterval = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.onResizeHandler);
    for (const cleanup of this.buttonCleanup) {
      cleanup();
    }
    this.buttonCleanup = [];
    for (const icon of this.icons) {
      icon.dispose();
    }
    this.icons = [];
    this.activeButton = null;
    this.iconRenderer.dispose();
    this.headerEl?.remove();
    this.menuEl?.remove();
    this.headerEl = null;
    this.menuEl = null;
    this.dateTimeTextEl = null;
    this.weatherIconEl = null;
    this.weatherTextEl = null;
    this.weatherCanvas = null;
    this.weatherCoords = null;
    this.weatherTempF = null;
    this.weatherCode = null;
    this.weatherIsDay = null;
  }
}
