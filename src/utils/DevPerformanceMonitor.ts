import * as THREE from 'three';

const PERF_QUERY_KEY = 'tboPerf';
const PERF_STORAGE_KEY = 'tbo:perf';
const FRAME_WINDOW_SIZE = 600;
const REPORT_INTERVAL_MS = 1000;
const STEADY_HEAP_CAPTURE_DELAY_MS = 15000;

interface HeapSample {
  label: string;
  atMs: number;
  usedMB: number;
  totalMB: number;
  limitMB: number;
}

export class DevPerformanceMonitor {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly frameTimesMs = new Float32Array(FRAME_WINDOW_SIZE);
  private readonly startedAtMs = performance.now();
  private readonly overlay: HTMLPreElement;
  private frameCount = 0;
  private frameCursor = 0;
  private lastReportAtMs = this.startedAtMs;
  private startupHeap: HeapSample | null = null;
  private steadyHeap: HeapSample | null = null;
  private disposed = false;

  static tryCreate(renderer: THREE.WebGLRenderer): DevPerformanceMonitor | null {
    if (!DevPerformanceMonitor.isEnabled()) {
      return null;
    }
    return new DevPerformanceMonitor(renderer);
  }

  private static isEnabled(): boolean {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(PERF_QUERY_KEY);
    if (queryValue !== null) {
      const normalized = queryValue.trim().toLowerCase();
      const enabled = normalized === '1' || normalized === 'true';
      try {
        if (enabled) {
          window.localStorage.setItem(PERF_STORAGE_KEY, '1');
        } else {
          window.localStorage.removeItem(PERF_STORAGE_KEY);
        }
      } catch {
        // Ignore storage failures in private browsing environments.
      }
      return enabled;
    }

    try {
      return window.localStorage.getItem(PERF_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.overlay = this.createOverlay();
    this.startupHeap = this.captureHeap('startup');
    this.renderOverlay('collecting frame samples...');
    console.info('[tbo:perf] Dev monitor enabled. Use ?tboPerf=0 to disable.');
  }

  recordFrame(deltaSeconds: number): void {
    if (this.disposed) {
      return;
    }

    const frameMs = Math.max(0, deltaSeconds * 1000);
    this.frameTimesMs[this.frameCursor] = frameMs;
    this.frameCursor = (this.frameCursor + 1) % this.frameTimesMs.length;
    this.frameCount = Math.min(this.frameCount + 1, this.frameTimesMs.length);

    const now = performance.now();
    if (!this.steadyHeap && now - this.startedAtMs >= STEADY_HEAP_CAPTURE_DELAY_MS) {
      this.steadyHeap = this.captureHeap('steady');
    }

    if (now - this.lastReportAtMs < REPORT_INTERVAL_MS) {
      return;
    }
    this.lastReportAtMs = now;
    this.renderOverlay(this.buildReportText());
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.overlay.remove();
  }

  private buildReportText(): string {
    const frameStats = this.computeFrameStats();
    const renderInfo = this.renderer.info.render;
    const memoryInfo = this.renderer.info.memory;
    const heap = this.getHeapUsageStrings();
    const lines: string[] = [
      'TBO Perf Monitor (dev)',
      `frame avg/p95/worst: ${frameStats.avg.toFixed(2)} / ${frameStats.p95.toFixed(2)} / ${frameStats.worst.toFixed(2)} ms`,
      `fps (estimated): ${frameStats.fps.toFixed(1)}  samples: ${frameStats.sampleCount}`,
      `render calls/triangles/lines/points: ${renderInfo.calls} / ${renderInfo.triangles} / ${renderInfo.lines} / ${renderInfo.points}`,
      `memory textures/geometries/programs: ${memoryInfo.textures} / ${memoryInfo.geometries} / ${this.getProgramCount()}`,
      `heap used/total/limit MB: ${heap.used} / ${heap.total} / ${heap.limit}`,
    ];

    if (this.startupHeap) {
      lines.push(
        `heap snapshot ${this.startupHeap.label} @${(this.startupHeap.atMs / 1000).toFixed(1)}s: ${this.startupHeap.usedMB.toFixed(1)} MB`
      );
    }

    if (this.steadyHeap) {
      lines.push(
        `heap snapshot ${this.steadyHeap.label} @${(this.steadyHeap.atMs / 1000).toFixed(1)}s: ${this.steadyHeap.usedMB.toFixed(1)} MB`
      );
      if (this.startupHeap) {
        const delta = this.steadyHeap.usedMB - this.startupHeap.usedMB;
        const sign = delta >= 0 ? '+' : '';
        lines.push(`heap delta steady-startup: ${sign}${delta.toFixed(1)} MB`);
      }
    } else {
      lines.push('heap snapshot steady: waiting (15s warmup)');
    }

    return lines.join('\n');
  }

  private computeFrameStats(): {
    avg: number;
    p95: number;
    worst: number;
    fps: number;
    sampleCount: number;
  } {
    if (this.frameCount === 0) {
      return {
        avg: 0,
        p95: 0,
        worst: 0,
        fps: 0,
        sampleCount: 0,
      };
    }

    const samples = new Array<number>(this.frameCount);
    let sum = 0;
    let worst = 0;
    for (let i = 0; i < this.frameCount; i += 1) {
      const sample = this.frameTimesMs[i];
      samples[i] = sample;
      sum += sample;
      if (sample > worst) {
        worst = sample;
      }
    }

    samples.sort((a, b) => a - b);
    const p95Index = Math.min(this.frameCount - 1, Math.floor((this.frameCount - 1) * 0.95));
    const avg = sum / this.frameCount;
    const p95 = samples[p95Index];
    return {
      avg,
      p95,
      worst,
      fps: avg > 0 ? 1000 / avg : 0,
      sampleCount: this.frameCount,
    };
  }

  private getProgramCount(): number {
    const info = this.renderer.info as unknown as { programs?: unknown[] };
    return Array.isArray(info.programs) ? info.programs.length : 0;
  }

  private getHeapUsageStrings(): {
    used: string;
    total: string;
    limit: string;
  } {
    const memory = this.getHeapMemory();
    if (!memory) {
      return { used: 'n/a', total: 'n/a', limit: 'n/a' };
    }
    return {
      used: this.bytesToMbString(memory.usedJSHeapSize),
      total: this.bytesToMbString(memory.totalJSHeapSize),
      limit: this.bytesToMbString(memory.jsHeapSizeLimit),
    };
  }

  private captureHeap(label: string): HeapSample | null {
    const memory = this.getHeapMemory();
    if (!memory) {
      return null;
    }
    return {
      label,
      atMs: performance.now() - this.startedAtMs,
      usedMB: memory.usedJSHeapSize / (1024 * 1024),
      totalMB: memory.totalJSHeapSize / (1024 * 1024),
      limitMB: memory.jsHeapSizeLimit / (1024 * 1024),
    };
  }

  private getHeapMemory():
    | {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      }
    | null {
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (!perf.memory) {
      return null;
    }
    return perf.memory;
  }

  private bytesToMbString(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  private createOverlay(): HTMLPreElement {
    const overlay = document.createElement('pre');
    overlay.id = 'tbo-perf-monitor';
    const style = overlay.style;
    style.position = 'fixed';
    style.left = '12px';
    style.bottom = '12px';
    style.margin = '0';
    style.padding = '10px 12px';
    style.maxWidth = 'min(560px, calc(100vw - 24px))';
    style.maxHeight = 'calc(100vh - 24px)';
    style.overflow = 'auto';
    style.zIndex = '9999';
    style.background = 'rgba(0, 0, 0, 0.76)';
    style.color = '#e4f2ff';
    style.fontFamily = '"Courier New", monospace';
    style.fontSize = '12px';
    style.lineHeight = '1.4';
    style.border = '1px solid rgba(122, 198, 255, 0.6)';
    style.borderRadius = '6px';
    style.pointerEvents = 'none';
    document.body.appendChild(overlay);
    return overlay;
  }

  private renderOverlay(content: string): void {
    this.overlay.textContent = content;
  }
}
