import * as THREE from 'three';
import { CharacterPool } from './CharacterPool';
import { MenuIcon3D, type IconType } from '../ui/MenuIcon3D';

type OrbitMenuAction = 'play' | 'inbox' | 'friends';

interface OrbitItemConfig {
  action: OrbitMenuAction;
  label: string;
  iconType: IconType;
  iconTargetSizeWorld: number;
  buttonGapOffsetPx?: number;
}

interface OrbitItem {
  config: OrbitItemConfig;
  icon: MenuIcon3D;
  iconHost: THREE.Group;
  iconRoot: THREE.Group;
  iconBounds: THREE.Box3;
  iconSize: THREE.Vector3;
  buttonCanvas: HTMLCanvasElement;
  buttonContext: CanvasRenderingContext2D;
  buttonTexture: THREE.CanvasTexture;
  buttonMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  hitMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  group: THREE.Group;
  phase: number;
  focusStrength: number;
  hoverScaleStrength: number;
  iconAnimationAccumulator: number;
  lastHovered: boolean;
  lastRenderOrder: number;
  lastScale: number;
}

export const ORBIT_LAYER = 2;
const ORBIT_UI_SCALE = 1.4;
const ICON_DISPLAY_SIZE_PX = 216 * ORBIT_UI_SCALE;
const BUTTON_WIDTH_PX = 136 * ORBIT_UI_SCALE;
const BUTTON_HEIGHT_PX = 48 * ORBIT_UI_SCALE;
const BUTTON_GAP_BELOW_ICON_PX = 14 * ORBIT_UI_SCALE;
const BUTTON_RADIUS_PX = 16 * ORBIT_UI_SCALE;
const BUTTON_FONT_PX = 16 * ORBIT_UI_SCALE;
const BUTTON_BORDER_PX = 1 * ORBIT_UI_SCALE;
const TEXT_SHADOW_X_PX = 1 * ORBIT_UI_SCALE;
const TEXT_SHADOW_Y_PX = 1 * ORBIT_UI_SCALE;
const TEXT_SHADOW_BLUR_PX = 0;

const CANVAS_SCALE = 4;
const PX_TO_WORLD = 1 / 120;

const BUTTON_WORLD_WIDTH = BUTTON_WIDTH_PX * PX_TO_WORLD;
const BUTTON_WORLD_HEIGHT = BUTTON_HEIGHT_PX * PX_TO_WORLD;
const ICON_WORLD_SIZE = ICON_DISPLAY_SIZE_PX * PX_TO_WORLD;
const INBOX_ICON_SCALE = 0.85;
const SOCIAL_ICON_SCALE = 0.8;
const SOCIAL_BUTTON_GAP_OFFSET_PX = 30 * ORBIT_UI_SCALE;
const BUTTON_GAP_BELOW_ICON_WORLD = BUTTON_GAP_BELOW_ICON_PX * PX_TO_WORLD;

const ORBIT_RADIUS_X = 5.0;
const ORBIT_RADIUS_Z = 2.8;
const ORBIT_SPEED = 0.1;
const HOVER_SCALE_MAX_BOOST = 0.06;
const HOVER_SCALE_IN_LAMBDA = 24;
const HOVER_SCALE_OUT_LAMBDA = 16;
const HOVER_SCALE_SNAP_DELTA = 0.25;
const HOVER_SCALE_SNAP_EPSILON = 0.001;
const HOVER_FOCUS_DEPTH_BOOST = 0.09;
const HOVER_FOCUS_DISTANCE = ORBIT_RADIUS_Z * HOVER_FOCUS_DEPTH_BOOST;
const HOVER_FOCUS_IN_LAMBDA = 20;
const HOVER_FOCUS_OUT_LAMBDA = 12;
const HOVER_FOCUS_SNAP_DELTA = 0.25;
const HOVER_FOCUS_SNAP_EPSILON = 0.001;
const ICON_UPDATE_FPS = 30;
const ICON_UPDATE_STEP_SECONDS = 1 / ICON_UPDATE_FPS;
const ICON_MAX_FRAME_DELTA_SECONDS = 0.1;

export class CharacterOrbitCarousel {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly characterPool: CharacterPool;

  private readonly root = new THREE.Group();
  private readonly orbitGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly anchor = new THREE.Vector3();
  private readonly anchorOffset = new THREE.Vector3(0, 0.25, 0);
  private readonly hitMeshes: THREE.Object3D[] = [];
  private readonly orbitWorldQuaternion = new THREE.Quaternion();
  private readonly orbitWorldQuaternionInverse = new THREE.Quaternion();
  private readonly itemWorldPosition = new THREE.Vector3();
  private readonly itemWorldTarget = new THREE.Vector3();
  private readonly itemWorldQuaternion = new THREE.Quaternion();
  private readonly itemLookAtMatrix = new THREE.Matrix4();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly itemFocusDirection = new THREE.Vector3();
  private readonly itemFocusLocalPosition = new THREE.Vector3();

  private readonly items: OrbitItem[] = [];
  private readonly tempObjectBounds = new THREE.Box3();

  private rotation = 0;
  private hoveredIndex: number | null = null;
  private disposed = false;

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.hoveredIndex = this.pickItemIndex(event.clientX, event.clientY);
  };

  private readonly onPointerLeave = (): void => {
    this.hoveredIndex = null;
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    characterPool: CharacterPool
  ) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.characterPool = characterPool;

    this.camera.layers.enable(ORBIT_LAYER);

    this.root.name = 'CharacterOrbitCarousel';
    this.orbitGroup.rotation.x = THREE.MathUtils.degToRad(16);
    this.root.add(this.orbitGroup);
    this.root.visible = false;
    this.scene.add(this.root);

    this.createItems();

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  update(delta: number, renderer?: THREE.WebGLRenderer): void {
    if (this.disposed) {
      return;
    }

    const anchor = this.characterPool.getActiveCharacterOrbitAnchor(this.anchor);
    if (!anchor) {
      this.root.visible = false;
      this.hoveredIndex = null;
      return;
    }

    this.root.visible = true;
    this.root.position.copy(anchor).add(this.anchorOffset);
    const orbitPaused = this.hoveredIndex !== null;
    if (!orbitPaused) {
      this.rotation += delta * ORBIT_SPEED;
    }
    this.orbitGroup.getWorldQuaternion(this.orbitWorldQuaternion);
    this.orbitWorldQuaternionInverse.copy(this.orbitWorldQuaternion).invert();

    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const theta = this.rotation + item.phase;
      const x = Math.cos(theta) * ORBIT_RADIUS_X;
      const z = Math.sin(theta) * ORBIT_RADIUS_Z;
      const y = 0;
      const depth = (z / ORBIT_RADIUS_Z + 1) * 0.5;
      const hovered = this.hoveredIndex === i;
      const hoverScaleTarget = hovered ? 1 : 0;
      const focusTarget = hovered ? 1 : 0;
      if (delta >= HOVER_SCALE_SNAP_DELTA) {
        item.hoverScaleStrength = hoverScaleTarget;
      } else {
        const hoverScaleLambda =
          hoverScaleTarget > item.hoverScaleStrength
            ? HOVER_SCALE_IN_LAMBDA
            : HOVER_SCALE_OUT_LAMBDA;
        item.hoverScaleStrength = THREE.MathUtils.damp(
          item.hoverScaleStrength,
          hoverScaleTarget,
          hoverScaleLambda,
          delta
        );
        if (Math.abs(item.hoverScaleStrength - hoverScaleTarget) <= HOVER_SCALE_SNAP_EPSILON) {
          item.hoverScaleStrength = hoverScaleTarget;
        }
      }
      if (delta >= HOVER_FOCUS_SNAP_DELTA) {
        item.focusStrength = focusTarget;
      } else {
        const focusLambda =
          focusTarget > item.focusStrength ? HOVER_FOCUS_IN_LAMBDA : HOVER_FOCUS_OUT_LAMBDA;
        item.focusStrength = THREE.MathUtils.damp(
          item.focusStrength,
          focusTarget,
          focusLambda,
          delta
        );
        if (Math.abs(item.focusStrength - focusTarget) <= HOVER_FOCUS_SNAP_EPSILON) {
          item.focusStrength = focusTarget;
        }
      }

      item.iconAnimationAccumulator += THREE.MathUtils.clamp(
        delta,
        0,
        ICON_MAX_FRAME_DELTA_SECONDS
      );
      if (item.iconAnimationAccumulator >= ICON_UPDATE_STEP_SECONDS) {
        const iconDelta = item.iconAnimationAccumulator;
        item.iconAnimationAccumulator = 0;
        item.icon.update(iconDelta, renderer);
      }

      item.group.position.set(x, y, z);
      const focusOffset = item.focusStrength * HOVER_FOCUS_DISTANCE;
      if (focusOffset > 0.0001) {
        item.group.getWorldPosition(this.itemWorldPosition);
        this.itemFocusDirection.copy(this.camera.position).sub(this.itemWorldPosition);
        const focusDirectionLength = this.itemFocusDirection.length();
        if (focusDirectionLength > 1e-6) {
          this.itemWorldPosition.addScaledVector(
            this.itemFocusDirection,
            focusOffset / focusDirectionLength
          );
          this.itemFocusLocalPosition.copy(this.itemWorldPosition);
          this.orbitGroup.worldToLocal(this.itemFocusLocalPosition);
          item.group.position.copy(this.itemFocusLocalPosition);
        }
      }

      const focusedDepth = THREE.MathUtils.clamp(
        depth + item.focusStrength * HOVER_FOCUS_DEPTH_BOOST,
        0,
        1
      );
      // Keep items in world space while forcing an upright (no pitch/roll) facing.
      item.group.getWorldPosition(this.itemWorldPosition);
      this.itemWorldTarget.copy(this.camera.position);
      this.itemWorldTarget.y = this.itemWorldPosition.y;
      if (this.itemWorldTarget.distanceToSquared(this.itemWorldPosition) > 1e-8) {
        // Match Object3D.lookAt() object semantics so front faces point toward camera.
        this.itemLookAtMatrix.lookAt(this.itemWorldTarget, this.itemWorldPosition, this.worldUp);
        this.itemWorldQuaternion.setFromRotationMatrix(this.itemLookAtMatrix);
        item.group.quaternion.copy(this.orbitWorldQuaternionInverse).multiply(this.itemWorldQuaternion);
      }

      const hoverScale = item.hoverScaleStrength * HOVER_SCALE_MAX_BOOST;
      const scale = THREE.MathUtils.lerp(0.9, 1.0, focusedDepth) + hoverScale;
      if (!Number.isFinite(item.lastScale) || Math.abs(item.lastScale - scale) > 1e-4) {
        item.group.scale.setScalar(scale);
        item.lastScale = scale;
      }

      const renderOrder = 20 + Math.round(focusedDepth * 40);
      if (item.lastRenderOrder !== renderOrder) {
        item.buttonMesh.renderOrder = renderOrder;
        item.hitMesh.renderOrder = renderOrder + 3;
        item.lastRenderOrder = renderOrder;
      }

      if (hovered !== item.lastHovered) {
        this.drawButtonTexture(item, hovered);
        item.lastHovered = hovered;
      }
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);

    this.scene.remove(this.root);

    for (const item of this.items) {
      item.icon.dispose();
      item.buttonTexture.dispose();
      item.buttonMesh.geometry.dispose();
      item.buttonMesh.material.dispose();
      item.hitMesh.geometry.dispose();
      item.hitMesh.material.dispose();
    }

    this.items.length = 0;
    this.hitMeshes.length = 0;
  }

  private createItems(): void {
    const configs: OrbitItemConfig[] = [
      {
        action: 'play',
        label: 'GlobaNet',
        iconType: 'globe',
        iconTargetSizeWorld: ICON_WORLD_SIZE,
      },
      {
        action: 'inbox',
        label: 'B-mail',
        iconType: 'inbox',
        iconTargetSizeWorld: ICON_WORLD_SIZE * INBOX_ICON_SCALE,
      },
      {
        action: 'friends',
        label: 'B-social',
        iconType: 'friends',
        iconTargetSizeWorld: ICON_WORLD_SIZE * SOCIAL_ICON_SCALE,
        buttonGapOffsetPx: SOCIAL_BUTTON_GAP_OFFSET_PX,
      },
    ];

    for (let i = 0; i < configs.length; i += 1) {
      const config = configs[i];
      const phase = (i / configs.length) * Math.PI * 2;

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 4;
      iconCanvas.height = 4;
      const icon = new MenuIcon3D(iconCanvas, config.iconType);
      const iconHost = new THREE.Group();
      const iconRoot = icon.mountToObject(iconHost, ORBIT_LAYER);
      iconHost.position.set(0, 0, 0.02);

      const buttonCanvas = document.createElement('canvas');
      buttonCanvas.width = Math.round(BUTTON_WIDTH_PX * CANVAS_SCALE);
      buttonCanvas.height = Math.round(BUTTON_HEIGHT_PX * CANVAS_SCALE);
      const buttonContext = buttonCanvas.getContext('2d');
      if (!buttonContext) {
        throw new Error('Failed to create button canvas context.');
      }

      const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
      buttonTexture.colorSpace = THREE.SRGBColorSpace;
      buttonTexture.minFilter = THREE.LinearFilter;
      buttonTexture.magFilter = THREE.LinearFilter;
      buttonTexture.generateMipmaps = false;
      buttonTexture.anisotropy = 4;

      const buttonMaterial = new THREE.MeshBasicMaterial({
        map: buttonTexture,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.02,
        opacity: 1,
        depthWrite: false,
        depthTest: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });

      const buttonMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(BUTTON_WORLD_WIDTH, BUTTON_WORLD_HEIGHT),
        buttonMaterial
      );
      buttonMesh.position.set(0, 0, 0);
      buttonMesh.layers.set(ORBIT_LAYER);

      const hitMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      hitMesh.position.set(0, 0, 0.03);
      hitMesh.userData.orbitItemIndex = i;
      hitMesh.layers.set(ORBIT_LAYER);

      const group = new THREE.Group();
      group.add(iconHost);
      group.add(buttonMesh);
      group.add(hitMesh);
      this.orbitGroup.add(group);
      this.hitMeshes.push(hitMesh);

      const item: OrbitItem = {
        config,
        icon,
        iconHost,
        iconRoot,
        iconBounds: new THREE.Box3(),
        iconSize: new THREE.Vector3(),
        buttonCanvas,
        buttonContext,
        buttonTexture,
        buttonMesh,
        hitMesh,
        group,
        phase,
        focusStrength: 0,
        hoverScaleStrength: 0,
        iconAnimationAccumulator: ICON_UPDATE_STEP_SECONDS,
        lastHovered: false,
        lastRenderOrder: Number.NaN,
        lastScale: Number.NaN,
      };

      this.items.push(item);
      this.fitIconToTargetSize(item);
      this.drawButtonTexture(item, false);
    }
  }

  private fitIconToTargetSize(item: OrbitItem): void {
    if (!this.measureIconBounds(item.iconRoot, item.iconBounds)) {
      return;
    }
    item.iconBounds.getSize(item.iconSize);
    const maxDimension = Math.max(item.iconSize.x, item.iconSize.y, item.iconSize.z);
    if (maxDimension <= 0) {
      return;
    }
    const scale = item.config.iconTargetSizeWorld / maxDimension;
    item.iconHost.scale.setScalar(scale);
    const iconCenterX = (item.iconBounds.min.x + item.iconBounds.max.x) * 0.5;
    const iconCenterY = (item.iconBounds.min.y + item.iconBounds.max.y) * 0.5;
    item.iconHost.position.set(-iconCenterX * scale, -iconCenterY * scale, 0.02);
    this.layoutItemForIconBounds(item);
  }

  private layoutItemForIconBounds(item: OrbitItem): void {
    const iconHalfSize = item.config.iconTargetSizeWorld * 0.5;
    const iconMinX = -iconHalfSize;
    const iconMaxX = iconHalfSize;
    const iconMinY = -iconHalfSize;
    const iconMaxY = iconHalfSize;

    const buttonCenterX = 0;
    const buttonGapWorld =
      BUTTON_GAP_BELOW_ICON_WORLD + (item.config.buttonGapOffsetPx ?? 0) * PX_TO_WORLD;
    const buttonCenterY =
      iconMinY - BUTTON_WORLD_HEIGHT * 0.5 - buttonGapWorld;
    item.buttonMesh.position.set(buttonCenterX, buttonCenterY, 0);

    const hitMinX = Math.min(iconMinX, buttonCenterX - BUTTON_WORLD_WIDTH * 0.5);
    const hitMaxX = Math.max(iconMaxX, buttonCenterX + BUTTON_WORLD_WIDTH * 0.5);
    const hitMinY = Math.min(iconMinY, buttonCenterY - BUTTON_WORLD_HEIGHT * 0.5);
    const hitMaxY = Math.max(iconMaxY, buttonCenterY + BUTTON_WORLD_HEIGHT * 0.5);
    const hitWidth = Math.max(0.0001, hitMaxX - hitMinX);
    const hitHeight = Math.max(0.0001, hitMaxY - hitMinY);
    item.hitMesh.position.set((hitMinX + hitMaxX) * 0.5, (hitMinY + hitMaxY) * 0.5, 0.03);
    item.hitMesh.scale.set(hitWidth, hitHeight, 1);
  }

  private measureIconBounds(root: THREE.Object3D, target: THREE.Box3): boolean {
    root.updateWorldMatrix(true, true);
    target.makeEmpty();

    const visit = (obj: THREE.Object3D, ignoreBranch: boolean): void => {
      const shouldIgnore =
        ignoreBranch || ((obj.userData as Record<string, unknown>).carouselBoundsIgnore === true);
      if (shouldIgnore) {
        return;
      }

      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
        const geometry = obj.geometry;
        if (!geometry.boundingBox) {
          geometry.computeBoundingBox();
        }
        if (geometry.boundingBox) {
          this.tempObjectBounds.copy(geometry.boundingBox).applyMatrix4(obj.matrixWorld);
          target.union(this.tempObjectBounds);
        }
      } else if (obj instanceof THREE.Sprite) {
        this.tempObjectBounds.setFromObject(obj);
        if (!this.tempObjectBounds.isEmpty()) {
          target.union(this.tempObjectBounds);
        }
      }

      for (const child of obj.children) {
        visit(child, false);
      }
    };

    visit(root, false);
    return !target.isEmpty();
  }

  private drawButtonTexture(item: OrbitItem, hovered: boolean): void {
    const { buttonContext: ctx, buttonCanvas } = item;
    const width = buttonCanvas.width;
    const height = buttonCanvas.height;

    ctx.clearRect(0, 0, width, height);
    const isActive = hovered;
    const x = 0.5 * CANVAS_SCALE;
    const y = 0.5 * CANVAS_SCALE;
    const w = width - CANVAS_SCALE;
    const h = height - CANVAS_SCALE;
    const borderWidth = BUTTON_BORDER_PX * CANVAS_SCALE;
    const radius = BUTTON_RADIUS_PX * CANVAS_SCALE;

    this.roundedRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)';
    ctx.fill();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    ctx.font = `${400} ${BUTTON_FONT_PX * CANVAS_SCALE}px "Jost", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.shadowColor = 'rgb(0, 0, 0)';
    ctx.shadowBlur = TEXT_SHADOW_BLUR_PX * CANVAS_SCALE;
    ctx.shadowOffsetX = TEXT_SHADOW_X_PX * CANVAS_SCALE;
    ctx.shadowOffsetY = TEXT_SHADOW_Y_PX * CANVAS_SCALE;
    ctx.fillText(item.config.label, width * 0.5, height * 0.52);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    item.buttonTexture.needsUpdate = true;
  }

  private roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private pickItemIndex(clientX: number, clientY: number): number | null {
    if (!this.root.visible) {
      return null;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.layers.set(ORBIT_LAYER);
    const intersections = this.raycaster.intersectObjects(this.hitMeshes, false);
    for (const hit of intersections) {
      const index = hit.object.userData.orbitItemIndex;
      if (typeof index === 'number') {
        return index;
      }
    }

    return null;
  }
}
