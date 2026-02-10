import * as THREE from 'three';
import { MenuIcon3D, type IconType } from './MenuIcon3D';
import { drawWeatherIcon } from './WeatherIcons2D';
import {
  LOCAL_WEATHER_UPDATE_EVENT,
  type LocalWeatherSnapshot,
} from '../utils/LocalWeather';

const ICON_RENDER_SIZE = 216;
const WEATHER_ICON_SIZE = 34;
const MENU_ACTION_EVENT = 'tbo:menu-action';
const ICON_UPDATE_FPS = 30;
const ICON_MAX_FRAME_DELTA_SECONDS = 0.1;

type HeaderAction = 'early-access';

export interface HeaderActionDetail {
  action: HeaderAction;
  label: string;
}

interface HeaderButtonDefinition {
  label: string;
  iconType: IconType;
  action: HeaderAction;
}

export class HeaderOverlay {
  private container: HTMLElement;
  private clockInterval: number | null = null;
  private icons: MenuIcon3D[] = [];
  private iconRenderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private dateTimeTextEl: HTMLSpanElement | null = null;
  private weatherIconEl: HTMLSpanElement | null = null;
  private weatherTextEl: HTMLSpanElement | null = null;
  private weatherCanvas: HTMLCanvasElement | null = null;
  private weatherTempF: number | null = null;
  private weatherCode: number | null = null;
  private weatherIsDay: boolean | null = null;
  private headerEl: HTMLElement | null = null;
  private headerExtensionButtonEl: HTMLButtonElement | null = null;
  private activeButton: HTMLButtonElement | null = null;
  private buttonCleanup: Array<() => void> = [];
  private destroyed = false;
  private onAction?: (detail: HeaderActionDetail) => void;
  private iconLastFrameAt = 0;
  private iconAccumulatedDelta = 0;
  private lastRenderedDateText = '';
  private lastRenderedWeatherText = '';
  private lastRenderedWeatherKey = '';

  private readonly onResizeHandler = (): void => {
    this.updateDateTime();
  };

  private readonly onWeatherUpdateHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<LocalWeatherSnapshot>;
    if (!customEvent.detail) {
      return;
    }
    this.weatherTempF = customEvent.detail.temperatureF;
    this.weatherCode = customEvent.detail.weatherCode;
    this.weatherIsDay = customEvent.detail.isDay;
    this.updateDateTime();
  };

  private readonly onVisibilityChangeHandler = (): void => {
    if (document.hidden) {
      this.stopIconLoop();
      return;
    }
    this.startIconLoop();
  };

  private readonly animateIconFrame = (now: number): void => {
    if (this.destroyed || document.hidden) {
      this.animationFrameId = null;
      return;
    }

    if (this.iconLastFrameAt <= 0) {
      this.iconLastFrameAt = now;
    }

    const rawDelta = (now - this.iconLastFrameAt) / 1000;
    this.iconLastFrameAt = now;
    const delta = THREE.MathUtils.clamp(rawDelta, 0, ICON_MAX_FRAME_DELTA_SECONDS);
    this.iconAccumulatedDelta += delta;

    const step = 1 / ICON_UPDATE_FPS;
    if (this.iconAccumulatedDelta >= step) {
      const updateDelta = this.iconAccumulatedDelta;
      this.iconAccumulatedDelta = 0;

      for (const icon of this.icons) {
        icon.update(updateDelta, this.iconRenderer);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animateIconFrame);
  };

  constructor(container: HTMLElement, onAction?: (detail: HeaderActionDetail) => void) {
    this.container = container;
    this.onAction = onAction;

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
    this.iconRenderer.setClearColor(0x000000, 0);

    this.render();
    this.startIconLoop();
    document.addEventListener('visibilitychange', this.onVisibilityChangeHandler);
    window.addEventListener('resize', this.onResizeHandler);
    window.addEventListener(
      LOCAL_WEATHER_UPDATE_EVENT,
      this.onWeatherUpdateHandler as EventListener
    );
  }

  private render(): void {
    this.headerEl = this.createHeader();
    this.container.appendChild(this.headerEl);

    const earlyAccessButton: HeaderButtonDefinition = {
      label: 'Claim Early Access',
      iconType: 'key',
      action: 'early-access',
    };
    this.headerExtensionButtonEl = this.createHeaderExtensionButton(earlyAccessButton);
    this.headerEl.appendChild(this.headerExtensionButtonEl);
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

    this.clockInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);

    header.appendChild(title);
    header.appendChild(datetime);
    return header;
  }

  private createHeaderExtensionButton(buttonDef: HeaderButtonDefinition): HTMLButtonElement {
    const extensionButton = document.createElement('button');
    extensionButton.type = 'button';
    extensionButton.className = 'dc-header-extension-btn';
    extensionButton.dataset.action = buttonDef.action;
    extensionButton.setAttribute('aria-label', buttonDef.label);

    const iconEl = document.createElement('span');
    iconEl.className = 'dc-header-extension-icon';
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = ICON_RENDER_SIZE;
    iconCanvas.height = ICON_RENDER_SIZE;
    iconEl.appendChild(iconCanvas);
    const keyIcon = new MenuIcon3D(iconCanvas, buttonDef.iconType);
    this.icons.push(keyIcon);

    const quantityLabel = document.createElement('span');
    quantityLabel.className = 'stack-label text-normal dc-key-stack-label';
    quantityLabel.textContent = 'x100';
    iconEl.appendChild(quantityLabel);

    const actionLabel = document.createElement('span');
    actionLabel.className = 'dc-header-extension-label';
    actionLabel.textContent = buttonDef.label;

    const content = document.createElement('span');
    content.className = 'dc-header-extension-content';
    content.appendChild(iconEl);
    content.appendChild(actionLabel);

    const actionClickHandler = () => {
      this.handleHeaderAction(buttonDef, extensionButton);
    };
    extensionButton.addEventListener('click', actionClickHandler);
    this.buttonCleanup.push(() => {
      extensionButton.removeEventListener('click', actionClickHandler);
    });

    extensionButton.appendChild(content);
    return extensionButton;
  }

  private setActiveButton(button: HTMLButtonElement): void {
    if (this.activeButton === button) {
      return;
    }
    this.activeButton?.classList.remove('is-active');
    button.classList.add('is-active');
    this.activeButton = button;
  }

  private handleHeaderAction(
    buttonDef: HeaderButtonDefinition,
    button: HTMLButtonElement
  ): void {
    this.setActiveButton(button);

    const detail: HeaderActionDetail = {
      action: buttonDef.action,
      label: buttonDef.label,
    };

    if (this.onAction) {
      this.onAction(detail);
      return;
    }

    window.dispatchEvent(new CustomEvent<HeaderActionDetail>(MENU_ACTION_EVENT, { detail }));
  }

  private createStatusIconCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = WEATHER_ICON_SIZE;
    canvas.height = WEATHER_ICON_SIZE;
    return canvas;
  }

  private startIconLoop(): void {
    if (this.animationFrameId !== null || document.hidden || this.destroyed) {
      return;
    }
    this.iconLastFrameAt = performance.now();
    this.iconAccumulatedDelta = 0;
    this.animationFrameId = requestAnimationFrame(this.animateIconFrame);
  }

  private stopIconLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.iconLastFrameAt = 0;
    this.iconAccumulatedDelta = 0;
  }

  private updateDateTime(): void {
    if (!this.dateTimeTextEl || !this.weatherTextEl || !this.weatherCanvas) {
      return;
    }

    const now = new Date();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const formatCandidates = this.getDateTimeFormatCandidates(viewportWidth);

    const isDay = this.weatherIsDay ?? this.isLocalDay(now);
    const activeWeatherCode = this.weatherCode;
    const weatherSize = this.weatherCanvas.clientWidth || WEATHER_ICON_SIZE;

    let selectedText = now.toLocaleDateString(
      'en-US',
      formatCandidates[formatCandidates.length - 1]
    );
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

    if (this.dateTimeTextEl.textContent !== selectedText || this.lastRenderedDateText !== selectedText) {
      this.dateTimeTextEl.textContent = selectedText;
      this.lastRenderedDateText = selectedText;
    }

    const weatherKey = `${activeWeatherCode ?? 'na'}|${isDay ? 1 : 0}|${weatherSize}`;
    if (this.lastRenderedWeatherKey !== weatherKey) {
      drawWeatherIcon(this.weatherCanvas, activeWeatherCode, isDay, weatherSize);
      this.lastRenderedWeatherKey = weatherKey;
    }

    const weatherText = this.weatherTempF !== null ? `${Math.round(this.weatherTempF)}F` : '--F';
    if (this.weatherTextEl.textContent !== weatherText || this.lastRenderedWeatherText !== weatherText) {
      this.weatherTextEl.textContent = weatherText;
      this.lastRenderedWeatherText = weatherText;
    }
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
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      },
      { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true },
      { hour: 'numeric', minute: '2-digit', hour12: true },
    ];
  }

  private isLocalDay(now: Date): boolean {
    const hour = now.getHours();
    return hour >= 6 && hour < 18;
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.clockInterval !== null) {
      window.clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    this.stopIconLoop();

    document.removeEventListener('visibilitychange', this.onVisibilityChangeHandler);
    window.removeEventListener('resize', this.onResizeHandler);
    window.removeEventListener(
      LOCAL_WEATHER_UPDATE_EVENT,
      this.onWeatherUpdateHandler as EventListener
    );

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
    this.headerExtensionButtonEl?.remove();
    this.headerEl = null;
    this.headerExtensionButtonEl = null;
    this.dateTimeTextEl = null;
    this.weatherIconEl = null;
    this.weatherTextEl = null;
    this.weatherCanvas = null;
    this.weatherTempF = null;
    this.weatherCode = null;
    this.weatherIsDay = null;
    this.lastRenderedDateText = '';
    this.lastRenderedWeatherText = '';
    this.lastRenderedWeatherKey = '';
  }
}
