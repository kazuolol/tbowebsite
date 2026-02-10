import * as THREE from 'three';

export type IconType = 'key' | 'globe' | 'info' | 'inbox' | 'friends';

export class MenuIcon3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private type: IconType;
  private ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly directionalLight: THREE.DirectionalLight;
  private externalRoot: THREE.Group | null = null;
  private mountedExternally = false;
  private globeCoreGroup: THREE.Group | null = null;
  private globeOrbitalGroup: THREE.Group | null = null;
  private globeAuxPanels: Array<{
    group: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    baseRotY: number;
    baseRotZ: number;
    phase: number;
  }> = [];
  private globePulseMaterials: Array<{
    material: THREE.Material;
    baseOpacity: number;
    amplitude: number;
    speed: number;
    phase: number;
  }> = [];
  private globePacketNodes: Array<{
    mesh: THREE.Mesh;
    radiusX: number;
    radiusY: number;
    speed: number;
    phase: number;
    zOffset: number;
  }> = [];
  private inboxOrbitCenter: THREE.Group | null = null;
  private inboxOrbitParticles: Array<{
    sprite: THREE.Sprite;
    orbitRadiusX: number;
    orbitRadiusZ: number;
    speed: number;
    phase: number;
    yBobAmplitude: number;
    yBobSpeed: number;
    baseScale: number;
    opacityPhase: number;
  }> = [];
  private friendsScreenTexture: THREE.CanvasTexture | null = null;
  private friendsScreenContext: CanvasRenderingContext2D | null = null;
  private friendsSocialPanelTexture: THREE.CanvasTexture | null = null;
  private friendsSocialPanelContext: CanvasRenderingContext2D | null = null;
  private friendsSocialPanelGroup: THREE.Group | null = null;
  private friendsFloatingChatTexture: THREE.CanvasTexture | null = null;
  private friendsFloatingChatContext: CanvasRenderingContext2D | null = null;
  private friendsFloatingChatGroup: THREE.Group | null = null;
  private friendsLeftFloatingChatTexture: THREE.CanvasTexture | null = null;
  private friendsLeftFloatingChatContext: CanvasRenderingContext2D | null = null;
  private friendsLeftFloatingChatGroup: THREE.Group | null = null;
  private friendsOverheadBubbles: Array<{ id: number; text: string; createdAt: number }> = [];
  private friendsNextBubbleId = 1;
  private friendsDemoMessageCursor = 0;
  private friendsTypingIndicatorActive = false;
  private friendsTypingIndicatorStartTime = 0;
  private friendsLastTimePlayerTyped = Number.NEGATIVE_INFINITY;
  private friendsLastTypingRegisterTime = Number.NEGATIVE_INFINITY;
  private friendsPendingMessageAt: number | null = null;
  private friendsMessageTranslateY = 0;
  private friendsMessageTranslateStartY = 0;
  private friendsMessageTranslateTargetY = 0;
  private friendsMessageTranslateStartTime = 0;
  private friendsMessageTranslateAnimating = false;
  private friendsLeftOverheadBubbles: Array<{ id: number; text: string; createdAt: number }> = [];
  private friendsLeftNextBubbleId = 1;
  private friendsLeftDemoMessageCursor = 0;
  private friendsLeftTypingIndicatorActive = false;
  private friendsLeftTypingIndicatorStartTime = 0;
  private friendsLeftLastTimePlayerTyped = Number.NEGATIVE_INFINITY;
  private friendsLeftLastTypingRegisterTime = Number.NEGATIVE_INFINITY;
  private friendsLeftPendingMessageAt: number | null = null;
  private friendsLeftMessageTranslateY = 0;
  private friendsLeftMessageTranslateStartY = 0;
  private friendsLeftMessageTranslateTargetY = 0;
  private friendsLeftMessageTranslateStartTime = 0;
  private friendsLeftMessageTranslateAnimating = false;
  private friendsConversationInitialized = false;
  private friendsConversationNextActionAt = 0;
  private friendsConversationStepIndex = 0;
  private friendsConversationActiveSide: 'left' | 'right' | null = null;
  private friendsConversationTypingUntil = 0;
  private friendsTextureSamplingConfigured = false;
  private readonly rendererSize = new THREE.Vector2();
  private static readonly FRIENDS_DOT_APPEAR_DURATION = 0.3;
  private static readonly FRIENDS_DOT_PAUSE_DURATION = 0.2;
  private static readonly FRIENDS_TYPING_SIGN_DURATION = 5.0;
  private static readonly FRIENDS_TYPING_INDICATOR_HEIGHT = 24;
  private static readonly FRIENDS_TYPING_INDICATOR_WIDTH = 40;
  private static readonly FRIENDS_TYPING_INDICATOR_BODY_HEIGHT = 20;
  private static readonly FRIENDS_MESSAGE_TRANSLATE_DURATION = 0.3;
  private static readonly FRIENDS_MESSAGE_DISPLAY_DURATION = 6.0;
  private static readonly FRIENDS_MESSAGE_FADE_DURATION = 0.5;
  private static readonly FRIENDS_MESSAGE_MAX_STACK = 3;
  private static readonly FRIENDS_MESSAGE_PARENT_WIDTH = 200;
  private static readonly FRIENDS_MESSAGE_PARENT_HEIGHT = 300;
  private static readonly FRIENDS_MESSAGE_PARENT_PADDING_X = 25;
  private static readonly FRIENDS_MESSAGE_STACK_GAP = 5;
  private static readonly FRIENDS_MESSAGE_LABEL_MIN_WIDTH = 50;
  private static readonly FRIENDS_MESSAGE_LABEL_PADDING_X = 6;
  private static readonly FRIENDS_MESSAGE_MIN_HEIGHT = 25;
  private static readonly FRIENDS_BUBBLE_TAIL_WIDTH = 10;
  private static readonly FRIENDS_BUBBLE_TAIL_HEIGHT = 6;
  private static readonly FRIENDS_SOCIAL_PANEL_BASE_WIDTH = 398;
  private static readonly FRIENDS_SOCIAL_PANEL_BASE_HEIGHT = 480;
  // Higher backing resolution improves panel legibility without increasing world-space size.
  private static readonly FRIENDS_SOCIAL_PANEL_RENDER_SCALE = 4;
  private static readonly FRIENDS_FLOATING_CHAT_BASE_WIDTH = 200;
  private static readonly FRIENDS_FLOATING_CHAT_BASE_HEIGHT = 300;
  private static readonly FRIENDS_FLOATING_CHAT_RENDER_SCALE = 4;
  private static readonly FRIENDS_FLOATING_CHAT_PLANE_HEIGHT = 0.91;
  private static readonly FRIENDS_FLOATING_CHAT_PLANE_WIDTH =
    (MenuIcon3D.FRIENDS_FLOATING_CHAT_PLANE_HEIGHT * MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_WIDTH) /
    MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_HEIGHT;
  private static readonly FRIENDS_FLOATING_CHAT_WORLD_SCALE = 5.7375;
  private static readonly FRIENDS_RIGHT_CHAT_OFFSET = new THREE.Vector3(1.967075, 2.772, 0.32);
  private static readonly FRIENDS_LEFT_CHAT_X_EXTRA_OFFSET = 0.3;
  // Visual compensation for icon yaw so left/right anchors read equally distant on screen.
  private static readonly FRIENDS_LEFT_CHAT_Z_VISUAL_OFFSET = 0.08;
  private static readonly FRIENDS_LEFT_CHAT_OFFSET = new THREE.Vector3(
    -MenuIcon3D.FRIENDS_RIGHT_CHAT_OFFSET.x - MenuIcon3D.FRIENDS_LEFT_CHAT_X_EXTRA_OFFSET,
    MenuIcon3D.FRIENDS_RIGHT_CHAT_OFFSET.y,
    MenuIcon3D.FRIENDS_RIGHT_CHAT_OFFSET.z + MenuIcon3D.FRIENDS_LEFT_CHAT_Z_VISUAL_OFFSET
  );
  private static readonly FRIENDS_RIGHT_CHAT_TILT_Z = -0.2178;
  private static readonly FRIENDS_LEFT_CHAT_TILT_Z = -MenuIcon3D.FRIENDS_RIGHT_CHAT_TILT_Z;
  private static readonly FRIENDS_CONVERSATION_INITIAL_DELAY = 0.6;
  private static readonly FRIENDS_CONVERSATION_TIME_SCALE = 2.34;
  private static readonly FRIENDS_CONVERSATION_SCRIPT: ReadonlyArray<{
    side: 'left' | 'right';
    message: string;
  }> = [
    { side: 'left', message: 'omw' },
    { side: 'right', message: 'wya?' },
    { side: 'left', message: 'still home' },
    { side: 'left', message: 'lol' },
    { side: 'right', message: 'same' },
    { side: 'right', message: '\u{1F62D}\u{1F62D}' },
    { side: 'left', message: 'logging soon' },
    { side: 'right', message: 'pc booting' },
    { side: 'left', message: 'wifi slow' },
    { side: 'right', message: 'of course' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'coffee first' },
    { side: 'right', message: 'priorities' },
    { side: 'left', message: 'u ate?' },
    { side: 'right', message: 'barely' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'dangerous' },
    { side: 'right', message: 'living wild' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'what time' },
    { side: 'right', message: '5 mins' },
    { side: 'left', message: 'u swear?' },
    { side: 'right', message: 'mostly' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: '\u{1F644}' },
    { side: 'right', message: 'dont judge' },
    { side: 'left', message: 'headphones?' },
    { side: 'right', message: 'charging' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'again??' },
    { side: 'right', message: 'listen' },
    { side: 'right', message: '\u{1F62D}\u{1F62D}' },
    { side: 'left', message: 'always u' },
    { side: 'right', message: 'I KNOW' },
    { side: 'left', message: 'im ready' },
    { side: 'right', message: 'not yet' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'shocker' },
    { side: 'right', message: 'one sec' },
    { side: 'left', message: 'u said that' },
    { side: 'right', message: 'different sec' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'lies' },
    { side: 'right', message: 'truth-ish' },
    { side: 'left', message: 'launching game' },
    { side: 'right', message: 'updating' },
    { side: 'right', message: '\u{1F480}\u{1F480}' },
    { side: 'left', message: 'NOOO' },
    { side: 'right', message: '\u{1F602}\u{1F602}' },
    { side: 'left', message: 'how long' },
    { side: 'right', message: 'estimating' },
    { side: 'left', message: 'dont say it' },
    { side: 'right', message: '12 mins' },
    { side: 'right', message: '\u{1F62D}\u{1F62D}\u{1F62D}' },
    { side: 'left', message: 'im screaming' },
    { side: 'right', message: 'im sorry' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'queue snacks' },
    { side: 'right', message: 'emotional support' },
    { side: 'left', message: 'valid' },
    { side: 'right', message: 'send memes' },
    { side: 'left', message: 'already did' },
    { side: 'right', message: 'im crying' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'update moved' },
    { side: 'right', message: 'to 15' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'i quit' },
    { side: 'right', message: 'pls dont' },
    { side: 'left', message: 'too late' },
    { side: 'right', message: 'lying' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'ok fine' },
    { side: 'right', message: 'thank god' },
    { side: 'left', message: 'u alive' },
    { side: 'right', message: 'barely' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'fan loud' },
    { side: 'right', message: 'jet engine' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'pc fighting' },
    { side: 'right', message: 'losing battle' },
    { side: 'left', message: 'any percent' },
    { side: 'right', message: '93%' },
    { side: 'left', message: 'DONT MOVE' },
    { side: 'right', message: 'IM NOT' },
    { side: 'right', message: '\u{1F62D}' },
    { side: 'left', message: 'last time' },
    { side: 'right', message: 'I KNOW' },
    { side: 'left', message: 'ok ready' },
    { side: 'right', message: 'WAIT' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'WHAT' },
    { side: 'right', message: 'restart' },
    { side: 'right', message: '\u{1F62D}\u{1F62D}' },
    { side: 'left', message: 'im done' },
    { side: 'right', message: 'PLEASE' },
    { side: 'left', message: 'deep breaths' },
    { side: 'right', message: 'hyperventilating' },
    { side: 'left', message: 'ok go' },
    { side: 'right', message: 'LAUNCHED' },
    { side: 'left', message: 'actually?' },
    { side: 'right', message: 'ACTUALLY' },
    { side: 'left', message: 'invite me' },
    { side: 'right', message: 'sent' },
    { side: 'left', message: 'loading' },
    { side: 'right', message: 'dont crash' },
    { side: 'left', message: 'promise?' },
    { side: 'right', message: 'no promises' },
    { side: 'right', message: '\u{1F480}' },
    { side: 'left', message: 'im in' },
    { side: 'right', message: 'ME TOO' },
    { side: 'left', message: 'finally' },
    { side: 'right', message: 'after years' },
    { side: 'right', message: '\u{1F62D}\u{1F62D}' },
    { side: 'left', message: 'worth it' },
    { side: 'right', message: 'barely' },
    { side: 'right', message: '\u{1F602}\u{1F480}' },
  ];
  constructor(canvas: HTMLCanvasElement, type: IconType) {
    this.type = type;
    this.ctx = canvas.getContext('2d')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(2, 3, 4);
    this.scene.add(this.directionalLight);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    switch (type) {
      case 'key':
        this.buildKey();
        this.camera.position.set(0, 0, 5.6);
        break;
      case 'globe':
        this.buildGlobe();
        this.camera.position.set(0, 0, 5.2);
        break;
      case 'info':
        this.buildInfo();
        this.camera.position.set(0, 0, 4.5);
        break;
      case 'inbox':
        this.buildInboxPlaceholder();
        this.camera.position.set(0, 0, 4.8);
        break;
      case 'friends':
        this.buildFriendsPlaceholder();
        this.camera.position.set(0, 0, 5.0);
        break;
    }

    this.camera.lookAt(0, 0, 0);
  }

  public mountToObject(parent: THREE.Object3D, layer?: number): THREE.Group {
    if (!this.externalRoot) {
      this.externalRoot = new THREE.Group();
      this.externalRoot.name = `MenuIcon3D-${this.type}`;

      const movableChildren = this.scene.children.slice();
      for (const child of movableChildren) {
        this.scene.remove(child);
        this.externalRoot.add(child);
      }
    }

    if (this.externalRoot.parent && this.externalRoot.parent !== parent) {
      this.externalRoot.parent.remove(this.externalRoot);
    }
    if (this.externalRoot.parent !== parent) {
      parent.add(this.externalRoot);
    }

    if (layer !== undefined) {
      this.applyLayer(this.externalRoot, layer);
    }
    this.mountedExternally = true;
    return this.externalRoot;
  }

  private applyLayer(root: THREE.Object3D, layer: number): void {
    root.traverse((obj) => {
      obj.layers.set(layer);
    });
  }

  private buildKey(): void {
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf7c53b,
      emissive: 0xc98b1f,
      emissiveIntensity: 0.44,
      metalness: 0.78,
      roughness: 0.22,
      clearcoat: 0.95,
      clearcoatRoughness: 0.18,
    });
    const deepGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfab24,
      emissive: 0x966115,
      emissiveIntensity: 0.31,
      metalness: 0.66,
      roughness: 0.28,
      clearcoat: 0.85,
      clearcoatRoughness: 0.24,
    });

    // Subtle key-only accents without pushing the icon into neon yellow.
    const keyFillLight = new THREE.PointLight(0xfff3d0, 1.05, 7.5, 2.0);
    keyFillLight.position.set(0.95, 1.1, 1.75);
    this.scene.add(keyFillLight);
    const keyRimLight = new THREE.PointLight(0xffd788, 0.58, 6.5, 2.0);
    keyRimLight.position.set(-1.1, -0.55, -1.15);
    this.scene.add(keyRimLight);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 1.75, 12),
      goldMaterial
    );
    shaft.position.set(0, -0.06, 0);
    this.group.add(shaft);

    const shaftTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.112, 0.24, 12),
      deepGoldMaterial
    );
    shaftTop.position.set(0, 0.88, 0);
    this.group.add(shaftTop);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.038, 8, 18),
      deepGoldMaterial
    );
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(0, 0.72, 0);
    this.group.add(collar);

    const bitStem = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.38, 0.18),
      goldMaterial
    );
    bitStem.position.set(0.02, 1.08, 0);
    this.group.add(bitStem);

    const toothTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.12, 0.18),
      goldMaterial
    );
    toothTop.position.set(0.24, 1.2, 0);
    this.group.add(toothTop);

    const toothMid = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.12, 0.18),
      deepGoldMaterial
    );
    toothMid.position.set(0.21, 1.04, 0);
    this.group.add(toothMid);

    const toothLow = new THREE.Mesh(
      new THREE.BoxGeometry(0.39, 0.12, 0.18),
      goldMaterial
    );
    toothLow.position.set(0.17, 0.88, 0);
    this.group.add(toothLow);

    const toothTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.24, 0.18),
      deepGoldMaterial
    );
    toothTip.position.set(0.43, 1.11, 0);
    this.group.add(toothTip);

    const neckLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.26, 0.18),
      deepGoldMaterial
    );
    neckLeft.position.set(-0.1, -0.94, 0);
    neckLeft.rotation.z = 0.4;
    this.group.add(neckLeft);

    const neckRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.26, 0.18),
      deepGoldMaterial
    );
    neckRight.position.set(0.1, -0.94, 0);
    neckRight.rotation.z = -0.4;
    this.group.add(neckRight);

    const bowOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.315, 0.11, 10, 24),
      goldMaterial
    );
    bowOuter.scale.y = 0.8;
    bowOuter.position.set(0, -1.18, 0);
    this.group.add(bowOuter);

    const bowInnerAccent = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.06, 8, 18),
      deepGoldMaterial
    );
    bowInnerAccent.scale.y = 0.8;
    bowInnerAccent.position.set(0, -1.18, 0.02);
    this.group.add(bowInnerAccent);

    // Mesh-attached halo: no billboards and no post-processing alpha artifacts.
    const keyHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff1cf,
      transparent: true,
      opacity: 0.018,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const baseKeyMeshes = this.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
    for (const baseMesh of baseKeyMeshes) {
      const haloMesh = new THREE.Mesh(baseMesh.geometry.clone(), keyHaloMaterial);
      haloMesh.position.copy(baseMesh.position);
      haloMesh.quaternion.copy(baseMesh.quaternion);
      haloMesh.scale.copy(baseMesh.scale).multiplyScalar(1.02);
      this.group.add(haloMesh);
    }

    // Billboarded golden aura behind the key.
    const keyGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(255, 242, 188, 0.96)',
          'rgba(255, 182, 62, 0.5)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0xffdd98,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    keyGlow.position.set(0.02, 0.02, -0.56);
    keyGlow.scale.set(3.45, 4.95, 1);
    this.scene.add(keyGlow);

    // Base orientation: key teeth point away from camera.
    this.group.rotation.set(0, Math.PI * 0.5, 0);
  }

  private buildGlobe(): void {
    const radius = 0.92;
    this.globeCoreGroup = null;
    this.globeOrbitalGroup = null;
    this.globeAuxPanels = [];
    this.globePulseMaterials = [];
    this.globePacketNodes = [];

    const PULSE_AMPLITUDE_SCALE = 0.2;
    const PULSE_SPEED_SCALE = 0.35;
    const addPulse = (
      material: THREE.Material,
      baseOpacity: number,
      amplitude: number,
      speed: number,
      phase: number
    ): void => {
      this.globePulseMaterials.push({
        material,
        baseOpacity,
        amplitude: amplitude * PULSE_AMPLITUDE_SCALE,
        speed: speed * PULSE_SPEED_SCALE,
        phase,
      });
    };

    const globeFillLight = new THREE.PointLight(0x6dff80, 0.38, 8.0, 2.0);
    globeFillLight.position.set(1.45, 1.18, 1.52);
    this.scene.add(globeFillLight);

    const globeRimLight = new THREE.PointLight(0xacff7a, 0.24, 7.5, 2.0);
    globeRimLight.position.set(-1.44, 0.14, -1.36);
    this.scene.add(globeRimLight);

    const globeBackLight = new THREE.PointLight(0x46f08a, 0.12, 7.0, 2.0);
    globeBackLight.position.set(0, -1.35, -1.45);
    this.scene.add(globeBackLight);

    const coreGroup = new THREE.Group();
    this.group.add(coreGroup);
    this.globeCoreGroup = coreGroup;

    const coreVolumeMaterial = new THREE.MeshBasicMaterial({
      color: 0x2adb56,
      transparent: true,
      opacity: 0.03,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const coreVolume = new THREE.Mesh(new THREE.SphereGeometry(radius, 34, 24), coreVolumeMaterial);
    coreVolume.scale.z = 0.96;
    coreGroup.add(coreVolume);
    addPulse(coreVolumeMaterial, 0.06, 0.015, 2.2, 0.3);

    const gridCoreTemplate = new THREE.LineBasicMaterial({
      color: 0x8fff7b,
      transparent: true,
      opacity: 0.2,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const gridGlowTemplate = new THREE.LineBasicMaterial({
      color: 0x27ff51,
      transparent: true,
      opacity: 0.04,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const latitudeBands = 8;
    for (let band = 1; band < latitudeBands; band++) {
      const t = band / latitudeBands;
      const lat = (t - 0.5) * Math.PI * 0.92;
      const y = Math.sin(lat) * radius;
      const ringRadius = Math.cos(lat) * radius;
      const points: THREE.Vector3[] = [];
      const segments = 120;
      for (let segment = 0; segment < segments; segment++) {
        const angle = (segment / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(angle) * ringRadius, y, Math.sin(angle) * ringRadius * 0.96)
        );
      }
      const glowMaterial = gridGlowTemplate.clone();
      const coreMaterial = gridCoreTemplate.clone();
      coreGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), glowMaterial));
      coreGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), coreMaterial));
      addPulse(glowMaterial, 0.08, 0.02, 2.3, band * 0.31);
      addPulse(coreMaterial, 0.34, 0.03, 2.9, band * 0.47);
    }

    const longitudeLines = 12;
    for (let line = 0; line < longitudeLines; line++) {
      const lon = (line / longitudeLines) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 72;
      const startLat = -Math.PI * 0.5;
      const latSpan = Math.PI;
      for (let segment = 0; segment <= segments; segment++) {
        const lat = startLat + (segment / segments) * latSpan;
        points.push(
          new THREE.Vector3(
            Math.cos(lat) * Math.cos(lon) * radius,
            Math.sin(lat) * radius,
            Math.cos(lat) * Math.sin(lon) * radius * 0.96
          )
        );
      }
      const glowMaterial = gridGlowTemplate.clone();
      const coreMaterial = gridCoreTemplate.clone();
      coreGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), glowMaterial));
      coreGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), coreMaterial));
      addPulse(glowMaterial, 0.08, 0.018, 2.1, line * 0.27);
      addPulse(coreMaterial, 0.34, 0.025, 2.8, line * 0.33);
    }

    const hubAt = (latDeg: number, lonDeg: number, scale = 1): THREE.Vector3 => {
      const lat = (latDeg * Math.PI) / 180;
      const lon = (lonDeg * Math.PI) / 180;
      return new THREE.Vector3(
        Math.cos(lat) * Math.cos(lon) * radius * scale,
        Math.sin(lat) * radius * scale,
        Math.cos(lat) * Math.sin(lon) * radius * 0.96 * scale
      );
    };

    const hubs = [
      hubAt(52, -12),
      hubAt(42, 10),
      hubAt(34, 28),
      hubAt(18, 36),
      hubAt(4, 22),
      hubAt(-8, 28),
      hubAt(-22, 18),
      hubAt(26, -18),
      hubAt(36, -34),
      hubAt(12, -4),
      hubAt(-2, -14),
    ];
    const links: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [1, 7],
      [7, 8],
      [7, 9],
      [9, 4],
      [10, 4],
      [10, 6],
      [2, 9],
      [0, 8],
    ];

    const hubNodeGeometry = new THREE.SphereGeometry(0.02, 10, 10);
    const hubNodeTemplate = new THREE.MeshBasicMaterial({
      color: 0xd7ffbb,
      transparent: true,
      opacity: 0.34,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    hubs.forEach((hub, index) => {
      const nodeMaterial = hubNodeTemplate.clone();
      const node = new THREE.Mesh(hubNodeGeometry, nodeMaterial);
      node.position.copy(hub);
      coreGroup.add(node);
      addPulse(nodeMaterial, 0.52, 0.04, 3.1, index * 0.36);
    });

    links.forEach(([aIndex, bIndex], index) => {
      const start = hubs[aIndex];
      const end = hubs[bIndex];
      const arcPoints: THREE.Vector3[] = [];
      const segments = 28;
      for (let segment = 0; segment <= segments; segment++) {
        const t = segment / segments;
        const raisedPoint = start.clone().lerp(end, t).normalize();
        const lift = 1 + Math.sin(t * Math.PI) * 0.12;
        arcPoints.push(raisedPoint.multiplyScalar(radius * lift));
      }

      const arcMaterial = new THREE.LineBasicMaterial({
        color: index % 3 === 0 ? 0xb8ff7d : 0x86ff85,
        transparent: true,
        opacity: 0.14,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), arcMaterial);
      coreGroup.add(arc);
      addPulse(arcMaterial, 0.22, 0.04, 2.4 + index * 0.1, index * 0.24);
    });

    const orbitGuidePoints: THREE.Vector3[] = [];
    const orbitSegments = 180;
    for (let i = 0; i < orbitSegments; i++) {
      const angle = (i / orbitSegments) * Math.PI * 2;
      orbitGuidePoints.push(new THREE.Vector3(Math.cos(angle) * radius * 1.22, Math.sin(angle) * radius * 0.76, 0));
    }
    const orbitGuideMaterial = new THREE.LineBasicMaterial({
      color: 0xb4ff79,
      transparent: true,
      opacity: 0.12,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const orbitGuide = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitGuidePoints), orbitGuideMaterial);
    orbitGuide.rotation.set(Math.PI * 0.43, 0.02, -0.08);
    coreGroup.add(orbitGuide);
    addPulse(orbitGuideMaterial, 0.2, 0.03, 2.6, 0.5);

    const orbitBandMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dff6d,
      transparent: true,
      opacity: 0.04,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const orbitBand = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.22, 0.014, 10, 120),
      orbitBandMaterial
    );
    orbitBand.rotation.copy(orbitGuide.rotation);
    coreGroup.add(orbitBand);
    addPulse(orbitBandMaterial, 0.08, 0.02, 2.2, 1.0);

    const orbitTickTemplate = new THREE.LineBasicMaterial({
      color: 0xccff8f,
      transparent: true,
      opacity: 0.18,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    for (let i = 0; i < 8; i++) {
      const angle = -0.96 + i * 0.31;
      const x = Math.cos(angle) * radius * 1.22;
      const y = Math.sin(angle) * radius * 0.76;
      const tickMaterial = orbitTickTemplate.clone();
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x * 0.97, y * 0.97, 0),
          new THREE.Vector3(x * 1.05, y * 1.05, 0),
        ]),
        tickMaterial
      );
      tick.rotation.copy(orbitGuide.rotation);
      coreGroup.add(tick);
      addPulse(tickMaterial, 0.28, 0.04, 2.9, i * 0.43);
    }

    const haloMaterial = new THREE.SpriteMaterial({
      map: this.createOffsetGlowTexture(),
      color: 0x57ff72,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(3.22, 2.9, 1);
    halo.position.set(-0.1, 0.03, -0.18);
    coreGroup.add(halo);
    addPulse(haloMaterial, 0.14, 0.02, 2.1, 0.7);

    const orbitalGroup = new THREE.Group();
    orbitalGroup.rotation.copy(orbitGuide.rotation);
    coreGroup.add(orbitalGroup);
    this.globeOrbitalGroup = orbitalGroup;

    const packetGeometry = new THREE.SphereGeometry(0.03, 10, 10);
    const packetCount = 10;
    for (let i = 0; i < packetCount; i++) {
      const packetMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xf4ffbc : 0xc1ff88,
        transparent: true,
        opacity: 0.28,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const packet = new THREE.Mesh(packetGeometry, packetMaterial);
      const phase = (i / packetCount) * Math.PI * 2;
      const radiusX = radius * 1.22;
      const radiusY = radius * 0.76;
      const speed = 0.28 + (i % 4) * 0.06;
      const zOffset = -0.05 + (i % 3) * 0.045;
      packet.position.set(
        Math.cos(phase) * radiusX,
        Math.sin(phase) * radiusY,
        zOffset + Math.sin(phase * 2.2) * 0.05
      );
      orbitalGroup.add(packet);
      this.globePacketNodes.push({
        mesh: packet,
        radiusX,
        radiusY,
        speed,
        phase,
        zOffset,
      });
      addPulse(packetMaterial, 0.45, 0.05, 4.2 + i * 0.2, i * 0.35);
    }

    const createAuxPanel = (
      width: number,
      height: number,
      title: string,
      subtitle: string,
      rows: readonly string[]
    ): THREE.Group => {
      const texture = this.createGlobeAuxTerminalTexture(title, subtitle, rows);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const panel = new THREE.Group();

      const mainMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xa8ff7a,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      panel.add(new THREE.Mesh(new THREE.PlaneGeometry(width, height), mainMaterial));

      const ghostMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x8bff66,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const ghost = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.03, height * 1.03), ghostMaterial);
      ghost.position.set(-0.01, 0.01, -0.01);
      panel.add(ghost);

      const frameMaterial = new THREE.LineBasicMaterial({
        color: 0xc4ff8f,
        transparent: true,
        opacity: 0.34,
        blending: THREE.NormalBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
      const frame = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-width * 0.54, height * 0.48, 0.02),
          new THREE.Vector3(width * 0.54, height * 0.48, 0.02),
          new THREE.Vector3(width * 0.54, -height * 0.48, 0.02),
          new THREE.Vector3(-width * 0.54, -height * 0.48, 0.02),
        ]),
        frameMaterial
      );
      panel.add(frame);

      addPulse(mainMaterial, 0.72, 0.07, 4.1, width * 2.1);
      addPulse(ghostMaterial, 0.24, 0.05, 3.5, height * 2.4);
      addPulse(frameMaterial, 0.8, 0.08, 3.2, width + height);

      return panel;
    };

    const rightPanel = createAuxPanel(
      0.58,
      0.74,
      'UPLINK // AFRICA',
      'SECTOR A-17',
      ['NODE CT ........ 219', 'LATENCY ........ 33ms', 'TRAFFIC ........ 81%', 'PACKETS ........ FLOW']
    );
    rightPanel.position.set(1.48, 0.3, 0.1);
    rightPanel.rotation.set(0.02, -0.56, -0.05);
    this.group.add(rightPanel);
    this.globeAuxPanels.push({
      group: rightPanel,
      baseX: 1.48,
      baseY: 0.3,
      baseZ: 0.1,
      baseRotY: -0.56,
      baseRotZ: -0.05,
      phase: 0.2,
    });

    const leftPanel = createAuxPanel(
      0.54,
      0.66,
      'ROUTE // ATLANTIC',
      'SECTOR B-04',
      ['AUTH ........... OK', 'RELAY .......... LIVE', 'THREAT LVL ...... LOW', 'SYNC ............ 99%']
    );
    leftPanel.position.set(-1.5, -0.28, 0.16);
    leftPanel.rotation.set(-0.01, 0.58, 0.07);
    this.group.add(leftPanel);
    this.globeAuxPanels.push({
      group: leftPanel,
      baseX: -1.5,
      baseY: -0.28,
      baseZ: 0.16,
      baseRotY: 0.58,
      baseRotZ: 0.07,
      phase: 1.2,
    });

    const topPanel = createAuxPanel(
      0.42,
      0.46,
      'PINGS // LIVE',
      'SECTOR C-12',
      ['P01 ............. 24ms', 'P02 ............. 28ms', 'P03 ............. 31ms']
    );
    topPanel.position.set(1.22, 0.95, -0.02);
    topPanel.rotation.set(0.03, -0.42, -0.04);
    this.group.add(topPanel);
    this.globeAuxPanels.push({
      group: topPanel,
      baseX: 1.22,
      baseY: 0.95,
      baseZ: -0.02,
      baseRotY: -0.42,
      baseRotZ: -0.04,
      phase: 2.1,
    });

    const connectorTemplate = new THREE.LineBasicMaterial({
      color: 0xb9ff7f,
      transparent: true,
      opacity: 0.16,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const addConnector = (start: THREE.Vector3, end: THREE.Vector3, offsetY: number, phase: number): void => {
      const mid = start.clone().lerp(end, 0.5);
      mid.y += offsetY;
      const connectorMaterial = connectorTemplate.clone();
      const connector = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([start, mid, end]),
        connectorMaterial
      );
      this.group.add(connector);
      addPulse(connectorMaterial, 0.28, 0.04, 3.1, phase);
    };

    addConnector(hubAt(22, 18, 1.03), new THREE.Vector3(1.18, 0.34, 0.12), 0.08, 0.4);
    addConnector(hubAt(-6, 22, 1.02), new THREE.Vector3(1.12, 0.18, 0.16), 0.04, 0.9);
    addConnector(hubAt(12, -8, 1.02), new THREE.Vector3(-1.16, -0.2, 0.18), -0.02, 1.5);
    addConnector(hubAt(42, 14, 1.01), new THREE.Vector3(1.0, 0.86, 0), 0.16, 2.0);

    const connectorNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xecffb8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const connectorNodeGeometry = new THREE.SphereGeometry(0.015, 10, 10);
    const connectorNodePoints = [
      new THREE.Vector3(1.18, 0.34, 0.12),
      new THREE.Vector3(1.12, 0.18, 0.16),
      new THREE.Vector3(-1.16, -0.2, 0.18),
      new THREE.Vector3(1.0, 0.86, 0),
    ];
    connectorNodePoints.forEach((point, index) => {
      const markerMaterial = connectorNodeMaterial.clone();
      const marker = new THREE.Mesh(connectorNodeGeometry, markerMaterial);
      marker.position.copy(point);
      this.group.add(marker);
      addPulse(markerMaterial, 0.56, 0.05, 3.4, index * 0.52);
    });

    this.group.rotation.set(-0.18, 0.46, 0.04);
  }

  private buildInboxPlaceholder(): void {
    const texture = this.createMailEnvelopeTexture();
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const r = Math.min(radius, halfW, halfH);
      const shape = new THREE.Shape();
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      return shape;
    };

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.045,
      metalness: 0.0,
      roughness: 0.15,
      transmission: 0.0,
      thickness: 0.22,
      ior: 1.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: false,
      opacity: 1.0,
    });
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.028,
      metalness: 0.0,
      roughness: 0.13,
      transmission: 0.0,
      thickness: 0.16,
      ior: 1.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    const flapTopMaterial = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.02,
      metalness: 0.0,
      roughness: 0.18,
      transmission: 0.0,
      thickness: 0.14,
      ior: 1.33,
      clearcoat: 0.95,
      clearcoatRoughness: 0.09,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    const flapEdgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.028,
      metalness: 0.0,
      roughness: 0.24,
      transmission: 0.0,
      thickness: 0.12,
      ior: 1.31,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transparent: false,
      opacity: 1.0,
    });
    const foldRidgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xb7c4d8,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });
    const foldShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0xe3e8f0,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const mailFillLight = new THREE.PointLight(0xfff8ec, 0.4, 6.5, 2.0);
    mailFillLight.position.set(1.05, 0.92, 1.55);
    this.scene.add(mailFillLight);
    const mailRimLight = new THREE.PointLight(0xfff0d8, 0.14, 5.6, 2.0);
    mailRimLight.position.set(-1.0, -0.42, -0.95);
    this.scene.add(mailRimLight);
    const mailEdgeLight = new THREE.PointLight(0x2e7dff, 0.34, 6.2, 2.0);
    mailEdgeLight.position.set(0.02, 0.2, 1.55);
    this.scene.add(mailEdgeLight);
    const mailBackGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialGlowTexture(
          'rgba(241, 249, 255, 0.94)',
          'rgba(84, 147, 255, 0.5)',
          'rgba(0, 0, 0, 0)'
        ),
        color: 0x72a8ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mailBackGlow.position.set(0.0, 0.0, -0.56);
    mailBackGlow.scale.set(3.24, 2.56, 1);
    this.scene.add(mailBackGlow);

    const orbitParticleMap = this.createRadialGlowTexture(
      'rgba(232, 248, 255, 1)',
      'rgba(92, 183, 255, 0.9)',
      'rgba(0, 0, 0, 0)'
    );
    const orbitCenter = new THREE.Group();
    // Center the orbit around the envelope body so particles pass in front and behind.
    orbitCenter.position.set(0, -0.03, 0.02);
    this.group.add(orbitCenter);
    this.inboxOrbitCenter = orbitCenter;
    this.inboxOrbitParticles = [];

    for (let i = 0; i < 3; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: orbitParticleMap,
          color: 0xb4e3ff,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          toneMapped: false,
        })
      );
      sprite.renderOrder = 24;
      orbitCenter.add(sprite);
      this.inboxOrbitParticles.push({
        sprite,
        orbitRadiusX: 1.28 + i * 0.06,
        orbitRadiusZ: 0.52 + i * 0.04,
        speed: 1.12 + i * 0.14,
        phase: (i / 3) * Math.PI * 2,
        yBobAmplitude: 0.075 + i * 0.01,
        yBobSpeed: 2.2 + i * 0.25,
        baseScale: 0.11 + i * 0.007,
        opacityPhase: i * 1.37,
      });
    }
    this.updateInboxOrbitParticles(this.elapsed);

    const bodyGeometry = new THREE.ExtrudeGeometry(createRoundedRectShape(2.06, 1.4, 0.22), {
      depth: 0.23,
      bevelEnabled: true,
      bevelSize: 0.055,
      bevelThickness: 0.05,
      bevelSegments: 4,
      curveSegments: 20,
    });
    bodyGeometry.translate(0, 0, -0.115);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, -0.045, 0);
    this.group.add(body);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x97bbff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });
    const glowOutlineMaterial = new THREE.LineBasicMaterial({
      color: 0xd9e8ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const bodyOutline = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry, 22), outlineMaterial);
    bodyOutline.position.copy(body.position);
    this.group.add(bodyOutline);

    const bodyOutlineGlow = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeometry, 22),
      glowOutlineMaterial
    );
    bodyOutlineGlow.position.copy(body.position);
    bodyOutlineGlow.scale.setScalar(1.014);
    this.group.add(bodyOutlineGlow);

    const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.34), faceMaterial);
    frontFace.position.set(0, -0.03, 0.138);
    this.group.add(frontFace);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.99, 0.56);
    flapShape.lineTo(0.99, 0.56);
    flapShape.lineTo(0, -0.16);
    flapShape.lineTo(-0.99, 0.56);
    flapShape.closePath();
    const flapGeometry = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.005,
      bevelSegments: 2,
      curveSegments: 24,
    });
    flapGeometry.translate(0, 0, -0.009);
    const flap = new THREE.Mesh(flapGeometry, [flapTopMaterial, flapEdgeMaterial]);
    flap.position.set(0, 0.09, 0.158);
    flap.rotation.x = -0.012;
    this.group.add(flap);

    const createFoldRidge = (
      parent: THREE.Object3D,
      start: THREE.Vector3,
      end: THREE.Vector3
    ): void => {
      const direction = end.clone().sub(start);
      const length = direction.length();
      const ridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0054, 0.0054, length, 12),
        foldRidgeMaterial
      );
      ridge.position.copy(start).add(end).multiplyScalar(0.5);
      ridge.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      );
      parent.add(ridge);
    };

    const flapApex = new THREE.Vector3(0, -0.16, 0.0125);

    createFoldRidge(
      flap,
      new THREE.Vector3(-0.97, 0.54, 0.0125),
      flapApex
    );
    createFoldRidge(
      flap,
      new THREE.Vector3(0.97, 0.54, 0.0125),
      flapApex
    );

    const foldShadowShape = new THREE.Shape();
    foldShadowShape.moveTo(-0.95, 0.52);
    foldShadowShape.lineTo(0.95, 0.52);
    foldShadowShape.lineTo(0.055, -0.1);
    foldShadowShape.lineTo(-0.055, -0.1);
    foldShadowShape.closePath();
    const foldShadow = new THREE.Mesh(new THREE.ShapeGeometry(foldShadowShape), foldShadowMaterial);
    foldShadow.position.set(0, 0, 0.0095);
    flap.add(foldShadow);

    this.group.rotation.set(-0.1, 0.04, -0.09);
    this.group.scale.setScalar(0.9);
  }

  private updateGlobeOrbitNodes(elapsedSeconds: number): void {
    if (this.globePacketNodes.length === 0) {
      return;
    }

    for (let i = 0; i < this.globePacketNodes.length; i++) {
      const packet = this.globePacketNodes[i];
      const angle = elapsedSeconds * (packet.speed * 0.85) + packet.phase;
      const radialJitter =
        1 + Math.sin(elapsedSeconds * 0.45 + packet.phase * 1.7) * 0.03;

      packet.mesh.position.set(
        Math.cos(angle) * packet.radiusX * radialJitter,
        Math.sin(angle) * packet.radiusY * radialJitter,
        packet.zOffset + Math.sin(angle * 2.2 + packet.phase * 0.85) * 0.05
      );

      const material = packet.mesh.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity =
          0.2 +
          0.18 *
            (0.5 +
              0.5 * Math.sin(elapsedSeconds * (2.1 + packet.speed * 0.4) + packet.phase));
      }
    }
  }

  private updateInboxOrbitParticles(elapsedSeconds: number): void {
    if (!this.inboxOrbitCenter || this.inboxOrbitParticles.length === 0) {
      return;
    }

    for (let i = 0; i < this.inboxOrbitParticles.length; i++) {
      const particle = this.inboxOrbitParticles[i];
      const angle = elapsedSeconds * particle.speed + particle.phase;
      const radialScale =
        1 + Math.sin(elapsedSeconds * (1.2 + i * 0.22) + particle.phase * 1.15) * 0.035;
      const x = Math.cos(angle) * particle.orbitRadiusX * radialScale;
      const z = Math.sin(angle) * particle.orbitRadiusZ * radialScale;
      const y =
        Math.sin(elapsedSeconds * particle.yBobSpeed + angle * 1.9 + particle.phase) *
        particle.yBobAmplitude;
      particle.sprite.position.set(x, y, z);

      const pulse =
        0.9 +
        0.1 * (0.5 + 0.5 * Math.sin(elapsedSeconds * particle.yBobSpeed + particle.opacityPhase));

      const frontFactor = THREE.MathUtils.clamp(
        (z / Math.max(0.0001, particle.orbitRadiusZ) + 1) * 0.5,
        0,
        1
      );
      const depthScale = 0.92 + frontFactor * 0.16;
      particle.sprite.scale.setScalar(particle.baseScale * pulse * depthScale);

      const material = particle.sprite.material as THREE.SpriteMaterial;
      material.opacity =
        0.14 +
        0.1 * frontFactor +
        0.12 *
          (0.5 +
            0.5 *
              Math.sin(
                elapsedSeconds * (particle.yBobSpeed + 0.56) + particle.opacityPhase
              ));
    }
  }

  private createMailEnvelopeTexture(): THREE.CanvasTexture {
    const width = 768;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const hash = (seed: number): number => {
      const value = Math.sin(seed * 93.37 + 17.43) * 43758.5453123;
      return value - Math.floor(value);
    };

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#ffffff');
    base.addColorStop(0.5, '#f8fbff');
    base.addColorStop(1, '#eef5ff');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const highlight = ctx.createRadialGradient(width * 0.4, height * 0.17, 20, width * 0.54, height * 0.3, 320);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
    highlight.addColorStop(0.6, 'rgba(241, 248, 255, 0.26)');
    highlight.addColorStop(1, 'rgba(241, 248, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, width, height);

    const lowerShade = ctx.createLinearGradient(0, height * 0.36, 0, height);
    lowerShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    lowerShade.addColorStop(1, 'rgba(88, 116, 150, 0.018)');
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 0, width, height);

    const sideShade = ctx.createLinearGradient(0, 0, width, 0);
    sideShade.addColorStop(0, 'rgba(104, 131, 161, 0.006)');
    sideShade.addColorStop(0.2, 'rgba(92, 118, 146, 0)');
    sideShade.addColorStop(0.78, 'rgba(92, 118, 146, 0)');
    sideShade.addColorStop(1, 'rgba(104, 131, 161, 0.007)');
    ctx.fillStyle = sideShade;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 60; i++) {
      const x = hash(i + 11) * width;
      const y = hash(i + 31) * height;
      const size = 0.5 + hash(i + 53) * 0.9;
      const alpha = 0.00012 + hash(i + 79) * 0.00035;
      ctx.fillStyle = `rgba(122, 146, 174, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private buildFriendsPlaceholder(): void {
    const createRoundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const r = Math.min(radius, halfW, halfH);
      const shape = new THREE.Shape();
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      return shape;
    };

    const createRoundedPanel = (
      width: number,
      height: number,
      depth: number,
      radius: number,
      material: THREE.Material
    ): THREE.Mesh => {
      const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(width, height, radius), {
        depth,
        bevelEnabled: true,
        bevelSize: Math.min(radius * 0.32, depth * 0.46),
        bevelThickness: Math.min(radius * 0.32, depth * 0.42),
        bevelSegments: 2,
        curveSegments: 10,
      });
      geometry.translate(0, 0, -depth * 0.5);
      return new THREE.Mesh(geometry, material);
    };

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf3e6cc,
      emissive: 0x17120d,
      emissiveIntensity: 0.03,
      metalness: 0.1,
      roughness: 0.44,
      clearcoat: 0.7,
      clearcoatRoughness: 0.28,
    });
    const shellInsetMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7dac2,
      metalness: 0.08,
      roughness: 0.52,
    });
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x182547,
      emissive: 0x0b1430,
      emissiveIntensity: 0.22,
      metalness: 0.18,
      roughness: 0.32,
    });
    const keyboardDeckMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e1a34,
      emissive: 0x050b1b,
      emissiveIntensity: 0.16,
      metalness: 0.18,
      roughness: 0.44,
    });
    const keycapMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4377,
      emissive: 0x122753,
      emissiveIntensity: 0.22,
      metalness: 0.12,
      roughness: 0.34,
    });
    const keyFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x8daee4,
      emissive: 0x2f548f,
      emissiveIntensity: 0.14,
      metalness: 0.06,
      roughness: 0.42,
    });
    const keyHighlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f74c3,
      emissive: 0x26478d,
      emissiveIntensity: 0.28,
      metalness: 0.16,
      roughness: 0.33,
    });
    const keyAccentFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6e4ff,
      emissive: 0x4f7dcc,
      emissiveIntensity: 0.2,
      metalness: 0.05,
      roughness: 0.45,
    });
    const trackpadMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f1a32,
      emissive: 0x090f1e,
      emissiveIntensity: 0.22,
      metalness: 0.12,
      roughness: 0.48,
    });
    const accentOrangeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e86ff,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      metalness: 0.12,
      roughness: 0.3,
    });
    const accentSteelMaterial = new THREE.MeshStandardMaterial({
      color: 0x8590a2,
      metalness: 0.3,
      roughness: 0.34,
    });
    const dpadCenterIndicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0xc3dcff,
      emissive: 0x6ba7ff,
      emissiveIntensity: 3.0,
      metalness: 0.04,
      roughness: 0.14,
    });
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1227,
      metalness: 0.18,
      roughness: 0.46,
    });
    const blueIndicatorGlowMap = this.createRadialGlowTexture(
      'rgba(214, 233, 255, 1)',
      'rgba(78, 146, 255, 0.7)',
      'rgba(0, 0, 0, 0)'
    );
    const blueIndicatorCoreGlowMap = this.createRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(176, 215, 255, 0.86)',
      'rgba(0, 0, 0, 0)'
    );

    const addIndicatorGlow = (
      map: THREE.Texture,
      color: THREE.ColorRepresentation,
      x: number,
      y: number,
      z: number,
      scaleX: number,
      scaleY: number,
      opacity: number
    ): void => {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        })
      );
      glow.position.set(x, y, z);
      glow.scale.set(scaleX, scaleY, 1);
      this.group.add(glow);
    };

    const shellFill = new THREE.PointLight(0xfff2d5, 0.55, 7.2, 2.0);
    shellFill.position.set(1.15, 1.24, 1.75);
    this.scene.add(shellFill);
    const shellRim = new THREE.PointLight(0xa8beff, 0.24, 6.1, 2.0);
    shellRim.position.set(-1.1, -0.45, -1.1);
    this.scene.add(shellRim);

    // Top display unit.
    const topShell = createRoundedPanel(2.06, 1.06, 0.15, 0.14, shellMaterial);
    topShell.position.set(0, 0.58, -0.01);
    this.group.add(topShell);

    const topInset = createRoundedPanel(1.9, 0.92, 0.028, 0.1, shellInsetMaterial);
    topInset.position.set(0, 0.59, 0.075);
    this.group.add(topInset);

    const screenBezel = createRoundedPanel(1.72, 0.76, 0.048, 0.1, bezelMaterial);
    screenBezel.position.set(0, 0.64, 0.102);
    this.group.add(screenBezel);

    const screenTexture = this.createPhoneScreenTexture();
    screenTexture.needsUpdate = true;
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;
    screenTexture.anisotropy = 2;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.58, 0.66),
      new THREE.MeshBasicMaterial({
        map: screenTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    screen.position.set(0, 0.64, 0.13);
    screen.renderOrder = 20;
    const screenMaterial = screen.material as THREE.MeshBasicMaterial;
    screenMaterial.depthTest = false;
    screenMaterial.depthWrite = false;
    this.group.add(screen);

    const screwGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14);
    const topLeftScrew = new THREE.Mesh(screwGeo, screwMaterial);
    topLeftScrew.rotation.x = Math.PI * 0.5;
    topLeftScrew.position.set(-0.98, 0.06, 0.108);
    this.group.add(topLeftScrew);
    const topRightScrew = new THREE.Mesh(screwGeo, screwMaterial);
    topRightScrew.rotation.x = Math.PI * 0.5;
    topRightScrew.position.set(0.98, 0.06, 0.108);
    this.group.add(topRightScrew);

    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.76, 24), shellInsetMaterial);
    hinge.rotation.z = Math.PI * 0.5;
    hinge.position.set(0, -0.03, 0.01);
    this.group.add(hinge);

    // Bottom keyboard/control deck.
    const bottomShell = createRoundedPanel(2.06, 1.12, 0.18, 0.14, shellMaterial);
    bottomShell.position.set(0, -0.58, -0.02);
    this.group.add(bottomShell);

    const bottomInset = createRoundedPanel(1.9, 0.96, 0.03, 0.1, shellInsetMaterial);
    bottomInset.position.set(0, -0.58, 0.084);
    this.group.add(bottomInset);

    // Shared input tray ties keyboard and right controls into one hardware layer.
    const inputTray = createRoundedPanel(1.9, 0.88, 0.022, 0.1, shellInsetMaterial);
    inputTray.position.set(0.07, -0.66, 0.106);
    this.group.add(inputTray);

    const keyboardWell = createRoundedPanel(1.36, 0.82, 0.03, 0.08, keyboardDeckMaterial);
    keyboardWell.position.set(-0.38, -0.58, 0.112);
    this.group.add(keyboardWell);

    const keyboardDeck = createRoundedPanel(1.24, 0.7, 0.016, 0.07, keyboardDeckMaterial);
    keyboardDeck.position.set(-0.38, -0.58, 0.132);
    this.group.add(keyboardDeck);

    // Bridge panel removes the hard bezel break between keyboard and right controls.
    const keyboardToControlBridge = createRoundedPanel(0.34, 0.88, 0.022, 0.09, keyboardDeckMaterial);
    keyboardToControlBridge.position.set(0.3, -0.6, 0.126);
    this.group.add(keyboardToControlBridge);

    const keyBodyGeometry = new THREE.BoxGeometry(0.084, 0.06, 0.024);
    const keyFaceGeometry = new THREE.BoxGeometry(0.056, 0.034, 0.01);
    const keyCols = 12;
    const keyRows = 5;
    const keyStartX = -0.96;
    const keyStepX = 0.11;
    const keyStartY = -0.36;
    const keyStepY = 0.1;
    for (let row = 0; row < keyRows; row++) {
      const rowShift = row % 2 === 0 ? 0 : 0.018;
      for (let col = 0; col < keyCols; col++) {
        const isAccent =
          (row === 0 && col < 3) ||
          (row === 0 && col > 8) ||
          (row === 4 && col > 8) ||
          (row === 3 && col >= 8 && col <= 9);
        const key = new THREE.Mesh(keyBodyGeometry, isAccent ? keyHighlightMaterial : keycapMaterial);
        key.position.set(keyStartX + col * keyStepX + rowShift, keyStartY - row * keyStepY, 0.145);
        key.rotation.z = ((row + col) % 2 === 0 ? 1 : -1) * 0.025;
        this.group.add(key);

        const keyFace = new THREE.Mesh(
          keyFaceGeometry,
          isAccent ? keyAccentFaceMaterial : keyFaceMaterial
        );
        keyFace.position.set(key.position.x, key.position.y + 0.0015, key.position.z + 0.012);
        keyFace.rotation.z = key.rotation.z * 0.7;
        this.group.add(keyFace);
      }
    }

    const spaceBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.026), keycapMaterial);
    spaceBar.position.set(-0.35, -0.86, 0.146);
    this.group.add(spaceBar);
    const spaceBarFace = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.028, 0.01), keyFaceMaterial);
    spaceBarFace.position.set(-0.35, -0.858, 0.159);
    this.group.add(spaceBarFace);

    const controlCluster = createRoundedPanel(0.72, 0.94, 0.028, 0.1, keyboardDeckMaterial);
    controlCluster.position.set(0.54, -0.66, 0.114);
    this.group.add(controlCluster);

    const trackpadFrame = createRoundedPanel(0.44, 0.56, 0.03, 0.09, keyboardDeckMaterial);
    trackpadFrame.position.set(0.55, -0.56, 0.132);
    this.group.add(trackpadFrame);

    const trackpad = createRoundedPanel(0.34, 0.46, 0.018, 0.07, trackpadMaterial);
    trackpad.position.set(0.55, -0.56, 0.149);
    this.group.add(trackpad);

    const trackpadSheen = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.38, 0.006), keyFaceMaterial);
    trackpadSheen.position.set(0.69, -0.56, 0.158);
    this.group.add(trackpadSheen);

    const dpadNest = createRoundedPanel(0.32, 0.24, 0.024, 0.07, keyboardDeckMaterial);
    dpadNest.position.set(0.55, -0.9, 0.128);
    this.group.add(dpadNest);

    const dpadBase = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.026, 16), keycapMaterial);
    dpadBase.rotation.x = Math.PI * 0.5;
    dpadBase.position.set(0.55, -0.9, 0.145);
    this.group.add(dpadBase);

    const dpadVertical = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.022), keyHighlightMaterial);
    dpadVertical.position.set(0.55, -0.9, 0.156);
    this.group.add(dpadVertical);
    const dpadHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.022), keyHighlightMaterial);
    dpadHorizontal.position.set(0.55, -0.9, 0.156);
    this.group.add(dpadHorizontal);
    const dpadCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.012, 12),
      dpadCenterIndicatorMaterial
    );
    dpadCenter.rotation.x = Math.PI * 0.5;
    dpadCenter.position.set(0.55, -0.9, 0.168);
    this.group.add(dpadCenter);
    addIndicatorGlow(blueIndicatorGlowMap, 0x9ec8ff, 0.55, -0.9, 0.189, 0.34, 0.34, 0.95);
    addIndicatorGlow(blueIndicatorCoreGlowMap, 0xe9f4ff, 0.55, -0.9, 0.194, 0.18, 0.18, 0.98);

    const leftAction = createRoundedPanel(0.07, 0.12, 0.016, 0.03, keycapMaterial);
    leftAction.position.set(0.37, -0.9, 0.141);
    this.group.add(leftAction);
    const rightAction = createRoundedPanel(0.07, 0.12, 0.016, 0.03, keycapMaterial);
    rightAction.position.set(0.73, -0.9, 0.141);
    this.group.add(rightAction);

    const cameraLens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.032, 20), accentSteelMaterial);
    cameraLens.rotation.x = Math.PI * 0.5;
    cameraLens.position.set(0.98, -0.9, 0.15);
    this.group.add(cameraLens);
    const cameraLensFace = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14), keyFaceMaterial);
    cameraLensFace.rotation.x = Math.PI * 0.5;
    cameraLensFace.position.set(0.98, -0.9, 0.161);
    this.group.add(cameraLensFace);

    const bottomLeftScrew = new THREE.Mesh(screwGeo, screwMaterial);
    bottomLeftScrew.rotation.x = Math.PI * 0.5;
    bottomLeftScrew.position.set(-0.98, -0.86, 0.108);
    this.group.add(bottomLeftScrew);

    // Chat bubble lives outside the device, floating over the right side.
    const floatingChatGroup = new THREE.Group();
    floatingChatGroup.userData.carouselBoundsIgnore = true;
    floatingChatGroup.position.copy(MenuIcon3D.FRIENDS_RIGHT_CHAT_OFFSET);
    // Lean slightly right so it reads like the device is "speaking".
    floatingChatGroup.rotation.set(0, 0, MenuIcon3D.FRIENDS_RIGHT_CHAT_TILT_Z);
    floatingChatGroup.scale.setScalar(MenuIcon3D.FRIENDS_FLOATING_CHAT_WORLD_SCALE);
    this.group.add(floatingChatGroup);
    this.friendsFloatingChatGroup = floatingChatGroup;

    const floatingChatTexture = this.createFriendsFloatingChatTexture();
    floatingChatTexture.needsUpdate = true;
    floatingChatTexture.minFilter = THREE.LinearFilter;
    floatingChatTexture.magFilter = THREE.LinearFilter;
    floatingChatTexture.anisotropy = 2;
    const floatingChatScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(
        MenuIcon3D.FRIENDS_FLOATING_CHAT_PLANE_WIDTH,
        MenuIcon3D.FRIENDS_FLOATING_CHAT_PLANE_HEIGHT
      ),
      new THREE.MeshBasicMaterial({
        map: floatingChatTexture,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    floatingChatScreen.position.set(0, 0, 0.012);
    floatingChatScreen.renderOrder = 26;
    const floatingChatScreenMaterial = floatingChatScreen.material as THREE.MeshBasicMaterial;
    floatingChatScreenMaterial.depthTest = false;
    floatingChatScreenMaterial.depthWrite = false;
    floatingChatGroup.add(floatingChatScreen);

    // Secondary mirrored chat stack on the left side.
    const leftFloatingChatGroup = new THREE.Group();
    leftFloatingChatGroup.userData.carouselBoundsIgnore = true;
    leftFloatingChatGroup.position.copy(MenuIcon3D.FRIENDS_LEFT_CHAT_OFFSET);
    leftFloatingChatGroup.rotation.set(0, 0, MenuIcon3D.FRIENDS_LEFT_CHAT_TILT_Z);
    leftFloatingChatGroup.scale.setScalar(MenuIcon3D.FRIENDS_FLOATING_CHAT_WORLD_SCALE);
    this.group.add(leftFloatingChatGroup);
    this.friendsLeftFloatingChatGroup = leftFloatingChatGroup;

    const leftFloatingChatTexture = this.createFriendsLeftFloatingChatTexture();
    leftFloatingChatTexture.needsUpdate = true;
    leftFloatingChatTexture.minFilter = THREE.LinearFilter;
    leftFloatingChatTexture.magFilter = THREE.LinearFilter;
    leftFloatingChatTexture.anisotropy = 2;
    const leftFloatingChatScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(
        MenuIcon3D.FRIENDS_FLOATING_CHAT_PLANE_WIDTH,
        MenuIcon3D.FRIENDS_FLOATING_CHAT_PLANE_HEIGHT
      ),
      new THREE.MeshBasicMaterial({
        map: leftFloatingChatTexture,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    leftFloatingChatScreen.position.set(0, 0, 0.012);
    leftFloatingChatScreen.renderOrder = 25;
    const leftFloatingChatScreenMaterial = leftFloatingChatScreen.material as THREE.MeshBasicMaterial;
    leftFloatingChatScreenMaterial.depthTest = false;
    leftFloatingChatScreenMaterial.depthWrite = false;
    leftFloatingChatGroup.add(leftFloatingChatScreen);

    this.group.rotation.set(-0.12, 0.3, 0.02);
    this.group.scale.setScalar(0.92);
  }

  private createRadialGlowTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.4, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createOffsetGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(92, 96, 0, 126, 128, 142);
    gradient.addColorStop(0, 'rgba(194, 255, 216, 0.94)');
    gradient.addColorStop(0.32, 'rgba(76, 255, 149, 0.64)');
    gradient.addColorStop(0.68, 'rgba(26, 176, 89, 0.22)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createGlobeAuxTerminalTexture(
    title: string,
    subtitle: string,
    rows: readonly string[]
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    const roundedRectPath = (x: number, y: number, w: number, h: number, r: number): void => {
      const radius = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    ctx.clearRect(0, 0, width, height);

    roundedRectPath(10, 12, width - 20, height - 24, 14);
    ctx.fillStyle = 'rgba(6, 44, 18, 0.08)';
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(98, 255, 169, 0.92)';
    ctx.shadowColor = 'rgba(92, 255, 168, 0.88)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.7;
    roundedRectPath(10, 12, width - 20, height - 24, 14);
    ctx.stroke();
    ctx.restore();

    roundedRectPath(16, 18, width - 32, height - 36, 10);
    ctx.strokeStyle = 'rgba(124, 255, 188, 0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    roundedRectPath(18, 20, width - 36, height - 40, 10);
    ctx.clip();

    const coreGlow = ctx.createRadialGradient(width * 0.42, height * 0.4, 6, width * 0.42, height * 0.4, 160);
    coreGlow.addColorStop(0, 'rgba(78, 255, 164, 0.26)');
    coreGlow.addColorStop(0.58, 'rgba(20, 142, 80, 0.1)');
    coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, width, height);

    for (let y = 24; y < height - 22; y += 3) {
      const alpha = y % 9 === 0 ? 0.14 : 0.06;
      ctx.fillStyle = `rgba(123, 255, 188, ${alpha})`;
      ctx.fillRect(20, y, width - 40, 1);
    }

    ctx.fillStyle = 'rgba(186, 255, 137, 0.92)';
    ctx.font = '600 16px "Courier New", monospace';
    ctx.fillText(title, 24, 40);
    ctx.fillText(subtitle, 24, 58);

    ctx.strokeStyle = 'rgba(106, 255, 176, 0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(24, 68);
    ctx.lineTo(width - 24, 68);
    ctx.stroke();

    ctx.font = '600 12px "Courier New", monospace';
    rows.forEach((row, i) => {
      ctx.fillStyle = `rgba(174, 255, 132, ${0.88 - i * 0.06})`;
      ctx.fillText(row, 24, 94 + i * 20);
    });

    for (let i = 0; i < 16; i++) {
      const barY = 86 + i * 17;
      const barW = 12 + ((i * 19) % 30);
      ctx.fillStyle = 'rgba(94, 255, 168, 0.34)';
      ctx.fillRect(width - 64, barY, barW, 3);
    }

    for (let i = 0; i < 120; i++) {
      const x = 18 + ((i * 53) % (width - 36));
      const y = 20 + ((i * 73) % (height - 40));
      const alpha = 0.03 + (((i * 11) % 10) / 10) * 0.05;
      ctx.fillStyle = `rgba(132, 255, 196, ${alpha.toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const sweepY = 90 + i * 92;
      const band = ctx.createLinearGradient(0, sweepY - 5, 0, sweepY + 5);
      band.addColorStop(0, 'rgba(0, 0, 0, 0)');
      band.addColorStop(0.5, 'rgba(140, 255, 205, 0.24)');
      band.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(18, sweepY - 6, width - 36, 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPhoneScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    this.friendsScreenContext = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.friendsScreenTexture = texture;
    this.renderFriendsPhoneScreen(0);
    texture.needsUpdate = true;
    return texture;
  }

  private renderFriendsPhoneScreen(elapsedSeconds: number): void {
    if (!this.friendsScreenContext) {
      return;
    }

    const ctx = this.friendsScreenContext;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const topBarHeight = Math.round(height * 0.14);
    const topBar = ctx.createLinearGradient(0, 0, 0, topBarHeight);
    topBar.addColorStop(0, '#eef4ff');
    topBar.addColorStop(1, '#dfe9ff');
    ctx.fillStyle = topBar;
    ctx.fillRect(0, 0, width, topBarHeight);

    ctx.fillStyle = '#233a63';
    ctx.font = `700 ${Math.round(height * 0.07)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('B-social', 22, Math.round(topBarHeight * 0.72));

    // Small reception bars in the top-right of the device screen.
    const signalBaseX = width - 84;
    const signalBaseY = Math.round(topBarHeight * 0.82);
    const signalBarWidth = 8;
    const signalGap = 4;
    for (let i = 0; i < 4; i++) {
      const barHeight = 8 + i * 5;
      ctx.fillStyle = i === 3 ? '#2d73ff' : 'rgba(35, 58, 99, 0.82)';
      ctx.fillRect(
        signalBaseX + i * (signalBarWidth + signalGap),
        signalBaseY - barHeight,
        signalBarWidth,
        barHeight
      );
    }
    ctx.fillStyle = 'rgba(35, 58, 99, 0.82)';
    ctx.beginPath();
    ctx.arc(signalBaseX - 9, signalBaseY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const chatPanelX = 22;
    const chatPanelY = topBarHeight + 12;
    const chatPanelWidth = width - chatPanelX * 2;
    const chatPanelHeight = height - chatPanelY - 14;
    const chatPanelFill = ctx.createLinearGradient(0, chatPanelY, 0, chatPanelY + chatPanelHeight);
    chatPanelFill.addColorStop(0, '#f8fbff');
    chatPanelFill.addColorStop(1, '#ecf3ff');
    ctx.fillStyle = chatPanelFill;
    ctx.fillRect(chatPanelX, chatPanelY, chatPanelWidth, chatPanelHeight);

    // Keep the phone UI clean; animated typing/message bubble now floats outside the device.
    const panelLineCount = 8;
    const lineLeft = chatPanelX + 20;
    const lineMaxWidth = chatPanelWidth - 40;
    for (let i = 0; i < panelLineCount; i++) {
      const y = chatPanelY + 20 + i * 34;
      const widthRatio = 0.34 + ((i * 37) % 39) / 100;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(35, 58, 99, 0.12)' : 'rgba(45, 115, 255, 0.11)';
      ctx.fillRect(lineLeft, y, Math.round(lineMaxWidth * widthRatio), 6);
    }

    const smileRadius = Math.round(Math.min(chatPanelWidth, chatPanelHeight) * 0.28);
    const smileCenterX = chatPanelX + Math.round(chatPanelWidth * 0.5);
    const smileCenterY = chatPanelY + Math.round(chatPanelHeight * 0.52);
    const smileFill = ctx.createRadialGradient(
      smileCenterX - smileRadius * 0.35,
      smileCenterY - smileRadius * 0.5,
      smileRadius * 0.2,
      smileCenterX,
      smileCenterY,
      smileRadius
    );
    smileFill.addColorStop(0, '#fff7a4');
    smileFill.addColorStop(0.7, '#f4e72a');
    smileFill.addColorStop(1, '#d2c900');
    ctx.fillStyle = smileFill;
    ctx.beginPath();
    ctx.arc(smileCenterX, smileCenterY, smileRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d0d0d';
    const eyeOffsetX = smileRadius * 0.38;
    const eyeOffsetY = smileRadius * 0.27;
    ctx.beginPath();
    ctx.ellipse(
      smileCenterX - eyeOffsetX,
      smileCenterY - eyeOffsetY,
      smileRadius * 0.12,
      smileRadius * 0.16,
      0,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      smileCenterX + eyeOffsetX,
      smileCenterY - eyeOffsetY,
      smileRadius * 0.12,
      smileRadius * 0.16,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = Math.max(2, Math.round(smileRadius * 0.1));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(
      smileCenterX,
      smileCenterY + smileRadius * 0.06,
      smileRadius * 0.58,
      Math.PI * 0.16,
      Math.PI * 0.84,
      false
    );
    ctx.stroke();
  }

  private createFriendsFloatingChatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width =
      MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_WIDTH * MenuIcon3D.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    canvas.height =
      MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_HEIGHT * MenuIcon3D.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    const ctx = canvas.getContext('2d')!;
    this.friendsFloatingChatContext = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.friendsFloatingChatTexture = texture;
    this.renderFriendsFloatingChat(0);
    texture.needsUpdate = true;
    return texture;
  }

  private createFriendsLeftFloatingChatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width =
      MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_WIDTH * MenuIcon3D.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    canvas.height =
      MenuIcon3D.FRIENDS_FLOATING_CHAT_BASE_HEIGHT * MenuIcon3D.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    const ctx = canvas.getContext('2d')!;
    this.friendsLeftFloatingChatContext = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.friendsLeftFloatingChatTexture = texture;
    this.renderFriendsLeftFloatingChat(0);
    texture.needsUpdate = true;
    return texture;
  }

  private getNextFriendsDemoMessage(): string {
    const messages = ['wya?', 'lol', '\u{1F602}', '\u{1F62D}\u{1F62D}'];
    const next = messages[this.friendsDemoMessageCursor % messages.length];
    this.friendsDemoMessageCursor++;
    return next;
  }

  private getNextFriendsLeftDemoMessage(): string {
    const messages = ['omw', 'world 2?', 'meet me'];
    const next = messages[this.friendsLeftDemoMessageCursor % messages.length];
    this.friendsLeftDemoMessageCursor++;
    return next;
  }

  private registerFriendsTyping(elapsedSeconds: number): void {
    this.friendsLastTypingRegisterTime = elapsedSeconds;
    this.friendsLastTimePlayerTyped = elapsedSeconds;
    if (!this.friendsTypingIndicatorActive) {
      this.showFriendsTypingIndicatorSpace(elapsedSeconds);
    }
  }

  private stopFriendsTyping(elapsedSeconds: number): void {
    if (!this.friendsTypingIndicatorActive) {
      return;
    }
    this.hideFriendsTypingIndicatorSpace(elapsedSeconds);
  }

  private showFriendsTypingIndicatorSpace(elapsedSeconds: number): void {
    this.friendsTypingIndicatorActive = true;
    this.friendsTypingIndicatorStartTime = elapsedSeconds;
    this.startFriendsMessageTranslate(-MenuIcon3D.FRIENDS_TYPING_INDICATOR_HEIGHT, elapsedSeconds);
  }

  private hideFriendsTypingIndicatorSpace(elapsedSeconds: number): void {
    this.friendsTypingIndicatorActive = false;
    this.startFriendsMessageTranslate(0, elapsedSeconds);
  }

  private startFriendsMessageTranslate(targetY: number, elapsedSeconds: number): void {
    if (Math.abs(this.friendsMessageTranslateY - targetY) <= 0.001) {
      this.friendsMessageTranslateY = targetY;
      this.friendsMessageTranslateAnimating = false;
      return;
    }
    this.friendsMessageTranslateStartY = this.friendsMessageTranslateY;
    this.friendsMessageTranslateTargetY = targetY;
    this.friendsMessageTranslateStartTime = elapsedSeconds;
    this.friendsMessageTranslateAnimating = true;
  }

  private updateFriendsMessageTranslate(elapsedSeconds: number): void {
    if (!this.friendsMessageTranslateAnimating) {
      return;
    }
    const progress = THREE.MathUtils.clamp(
      (elapsedSeconds - this.friendsMessageTranslateStartTime) /
        MenuIcon3D.FRIENDS_MESSAGE_TRANSLATE_DURATION,
      0,
      1
    );
    const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
    this.friendsMessageTranslateY = THREE.MathUtils.lerp(
      this.friendsMessageTranslateStartY,
      this.friendsMessageTranslateTargetY,
      smooth
    );
    if (progress >= 1) {
      this.friendsMessageTranslateY = this.friendsMessageTranslateTargetY;
      this.friendsMessageTranslateAnimating = false;
    }
  }

  private removeOldestFriendsBubble(): void {
    if (this.friendsOverheadBubbles.length === 0) {
      return;
    }
    this.friendsOverheadBubbles.shift();
  }

  private showFriendsOverheadMessage(message: string, elapsedSeconds: number): void {
    if (this.friendsOverheadBubbles.length >= MenuIcon3D.FRIENDS_MESSAGE_MAX_STACK) {
      this.removeOldestFriendsBubble();
    }
    this.friendsOverheadBubbles.push({
      id: this.friendsNextBubbleId++,
      text: message,
      createdAt: elapsedSeconds,
    });
  }

  private updateFriendsOverheadBubbles(elapsedSeconds: number): void {
    const maxAge =
      MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION + MenuIcon3D.FRIENDS_MESSAGE_FADE_DURATION;
    this.friendsOverheadBubbles = this.friendsOverheadBubbles.filter(
      (bubble) => elapsedSeconds - bubble.createdAt <= maxAge
    );
  }

  private updateFriendsOverheadDemo(elapsedSeconds: number): void {
    if (
      !this.friendsTypingIndicatorActive &&
      this.friendsPendingMessageAt === null &&
      elapsedSeconds - this.friendsLastTypingRegisterTime >= 3.2
    ) {
      this.registerFriendsTyping(elapsedSeconds);
      this.friendsPendingMessageAt = elapsedSeconds + 1.2;
    }

    if (
      this.friendsTypingIndicatorActive &&
      elapsedSeconds > this.friendsLastTimePlayerTyped + MenuIcon3D.FRIENDS_TYPING_SIGN_DURATION
    ) {
      this.stopFriendsTyping(elapsedSeconds);
      this.friendsPendingMessageAt = null;
    }

    if (this.friendsPendingMessageAt !== null && elapsedSeconds >= this.friendsPendingMessageAt) {
      this.showFriendsOverheadMessage(this.getNextFriendsDemoMessage(), elapsedSeconds);
      this.stopFriendsTyping(elapsedSeconds);
      this.friendsPendingMessageAt = null;
    }

    this.updateFriendsOverheadBubbles(elapsedSeconds);
    this.updateFriendsMessageTranslate(elapsedSeconds);
  }

  private renderFriendsFloatingChat(elapsedSeconds: number): void {
    if (!this.friendsFloatingChatContext) {
      return;
    }

    const ctx = this.friendsFloatingChatContext;
    const pixelWidth = ctx.canvas.width;
    const pixelHeight = ctx.canvas.height;
    const width = MenuIcon3D.FRIENDS_MESSAGE_PARENT_WIDTH;
    const height = MenuIcon3D.FRIENDS_MESSAGE_PARENT_HEIGHT;
    const scaleX = pixelWidth / width;
    const scaleY = pixelHeight / height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const parentWidth = MenuIcon3D.FRIENDS_MESSAGE_PARENT_WIDTH;
    const parentPaddingX = MenuIcon3D.FRIENDS_MESSAGE_PARENT_PADDING_X;
    const messageAreaWidth = parentWidth - parentPaddingX * 2;

    // Draw canonical typing indicator first so message bubbles render above it.
    if (this.friendsTypingIndicatorActive) {
      const indicatorWidth = MenuIcon3D.FRIENDS_TYPING_INDICATOR_WIDTH;
      const indicatorHeight = MenuIcon3D.FRIENDS_TYPING_INDICATOR_BODY_HEIGHT;
      const indicatorX = Math.round((parentWidth - indicatorWidth) * 0.5);
      // Anchor typing bubble to the bottom; message stack uses translate(-24) when typing is active.
      const indicatorY = Math.round(height - indicatorHeight - MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT);

      this.drawFriendsBubble(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 1, true);

      const dotAppearDuration = MenuIcon3D.FRIENDS_DOT_APPEAR_DURATION;
      const pauseDuration = MenuIcon3D.FRIENDS_DOT_PAUSE_DURATION;
      const typingCycleDuration = dotAppearDuration * 3 + pauseDuration + dotAppearDuration * 3 + pauseDuration;
      const timeInCycle =
        ((elapsedSeconds - this.friendsTypingIndicatorStartTime) % typingCycleDuration + typingCycleDuration) %
        typingCycleDuration;
      const dotDiameter = 5;
      const dotOffsetsX = [7, 18, 29];
      const dotTints = [178, 217, 255];
      for (let i = 0; i < dotOffsetsX.length; i++) {
        const dotOpacity = this.getFriendsTypingDotOpacity(i, timeInCycle, dotAppearDuration, pauseDuration);
        if (dotOpacity <= 0) {
          continue;
        }
        const dotTint = dotTints[i];
        ctx.fillStyle = `rgba(${dotTint}, ${dotTint}, ${dotTint}, ${Math.min(1, dotOpacity)})`;
        ctx.beginPath();
        ctx.arc(indicatorX + dotOffsetsX[i], indicatorY + 8, dotDiameter * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw message stack (oldest top, newest bottom) with canonical max stack/fade timings.
    const labelFont = 'normal 12px "Jost", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    const labelMinWidth = MenuIcon3D.FRIENDS_MESSAGE_LABEL_MIN_WIDTH;
    const labelPaddingX = MenuIcon3D.FRIENDS_MESSAGE_LABEL_PADDING_X;
    const bubbleHeight = MenuIcon3D.FRIENDS_MESSAGE_MIN_HEIGHT;
    // Keep tail geometry visible within the texture bounds.
    let currentBottom = height - MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT + this.friendsMessageTranslateY;
    const newestIndex = this.friendsOverheadBubbles.length - 1;

    for (let i = newestIndex; i >= 0; i--) {
      const bubble = this.friendsOverheadBubbles[i];
      const age = elapsedSeconds - bubble.createdAt;
      const bubbleOpacity =
        age <= MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION
          ? 1
          : THREE.MathUtils.clamp(
              1 -
                (age - MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION) /
                  MenuIcon3D.FRIENDS_MESSAGE_FADE_DURATION,
              0,
              1
            );
      if (bubbleOpacity <= 0) {
        continue;
      }

      ctx.font = labelFont;
      const maxTextWidth = messageAreaWidth - labelPaddingX * 2;
      let messageText = bubble.text;
      if (ctx.measureText(messageText).width > maxTextWidth) {
        const chars = Array.from(messageText);
        while (chars.length > 1 && ctx.measureText(`${chars.join('')}...`).width > maxTextWidth) {
          chars.pop();
        }
        messageText = `${chars.join('')}...`;
      }
      const textWidth = Math.ceil(ctx.measureText(messageText).width);
      const bubbleWidth = Math.max(labelMinWidth, textWidth) + labelPaddingX * 2;
      const bubbleX = Math.round(parentPaddingX + (messageAreaWidth - bubbleWidth) * 0.5);
      const showTail = i === newestIndex && !this.friendsTypingIndicatorActive;
      const tailHeight = showTail ? MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT : 0;
      const bubbleY = Math.round(currentBottom - (bubbleHeight + tailHeight));

      this.drawFriendsBubble(
        ctx,
        bubbleX,
        bubbleY,
        bubbleWidth,
        bubbleHeight,
        bubbleOpacity,
        showTail
      );

      ctx.fillStyle = `rgba(255, 255, 255, ${bubbleOpacity})`;
      ctx.font = labelFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = `rgba(0, 0, 0, ${bubbleOpacity})`;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.shadowBlur = 0;
      ctx.fillText(messageText, bubbleX + bubbleWidth * 0.5, bubbleY + bubbleHeight * 0.5);
      ctx.shadowColor = 'rgba(0, 0, 0, 0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      currentBottom = bubbleY - MenuIcon3D.FRIENDS_MESSAGE_STACK_GAP;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private registerFriendsLeftTyping(elapsedSeconds: number): void {
    this.friendsLeftLastTypingRegisterTime = elapsedSeconds;
    this.friendsLeftLastTimePlayerTyped = elapsedSeconds;
    if (!this.friendsLeftTypingIndicatorActive) {
      this.showFriendsLeftTypingIndicatorSpace(elapsedSeconds);
    }
  }

  private stopFriendsLeftTyping(elapsedSeconds: number): void {
    if (!this.friendsLeftTypingIndicatorActive) {
      return;
    }
    this.hideFriendsLeftTypingIndicatorSpace(elapsedSeconds);
  }

  private showFriendsLeftTypingIndicatorSpace(elapsedSeconds: number): void {
    this.friendsLeftTypingIndicatorActive = true;
    this.friendsLeftTypingIndicatorStartTime = elapsedSeconds;
    this.startFriendsLeftMessageTranslate(-MenuIcon3D.FRIENDS_TYPING_INDICATOR_HEIGHT, elapsedSeconds);
  }

  private hideFriendsLeftTypingIndicatorSpace(elapsedSeconds: number): void {
    this.friendsLeftTypingIndicatorActive = false;
    this.startFriendsLeftMessageTranslate(0, elapsedSeconds);
  }

  private startFriendsLeftMessageTranslate(targetY: number, elapsedSeconds: number): void {
    if (Math.abs(this.friendsLeftMessageTranslateY - targetY) <= 0.001) {
      this.friendsLeftMessageTranslateY = targetY;
      this.friendsLeftMessageTranslateAnimating = false;
      return;
    }
    this.friendsLeftMessageTranslateStartY = this.friendsLeftMessageTranslateY;
    this.friendsLeftMessageTranslateTargetY = targetY;
    this.friendsLeftMessageTranslateStartTime = elapsedSeconds;
    this.friendsLeftMessageTranslateAnimating = true;
  }

  private updateFriendsLeftMessageTranslate(elapsedSeconds: number): void {
    if (!this.friendsLeftMessageTranslateAnimating) {
      return;
    }
    const progress = THREE.MathUtils.clamp(
      (elapsedSeconds - this.friendsLeftMessageTranslateStartTime) /
        MenuIcon3D.FRIENDS_MESSAGE_TRANSLATE_DURATION,
      0,
      1
    );
    const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);
    this.friendsLeftMessageTranslateY = THREE.MathUtils.lerp(
      this.friendsLeftMessageTranslateStartY,
      this.friendsLeftMessageTranslateTargetY,
      smooth
    );
    if (progress >= 1) {
      this.friendsLeftMessageTranslateY = this.friendsLeftMessageTranslateTargetY;
      this.friendsLeftMessageTranslateAnimating = false;
    }
  }

  private removeOldestFriendsLeftBubble(): void {
    if (this.friendsLeftOverheadBubbles.length === 0) {
      return;
    }
    this.friendsLeftOverheadBubbles.shift();
  }

  private showFriendsLeftOverheadMessage(message: string, elapsedSeconds: number): void {
    if (this.friendsLeftOverheadBubbles.length >= MenuIcon3D.FRIENDS_MESSAGE_MAX_STACK) {
      this.removeOldestFriendsLeftBubble();
    }
    this.friendsLeftOverheadBubbles.push({
      id: this.friendsLeftNextBubbleId++,
      text: message,
      createdAt: elapsedSeconds,
    });
  }

  private updateFriendsLeftOverheadBubbles(elapsedSeconds: number): void {
    const maxAge =
      MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION + MenuIcon3D.FRIENDS_MESSAGE_FADE_DURATION;
    this.friendsLeftOverheadBubbles = this.friendsLeftOverheadBubbles.filter(
      (bubble) => elapsedSeconds - bubble.createdAt <= maxAge
    );
  }

  private updateFriendsLeftOverheadDemo(elapsedSeconds: number): void {
    if (
      !this.friendsLeftTypingIndicatorActive &&
      this.friendsLeftPendingMessageAt === null &&
      elapsedSeconds - this.friendsLeftLastTypingRegisterTime >= 3.2
    ) {
      this.registerFriendsLeftTyping(elapsedSeconds);
      this.friendsLeftPendingMessageAt = elapsedSeconds + 1.2;
    }

    if (
      this.friendsLeftTypingIndicatorActive &&
      elapsedSeconds > this.friendsLeftLastTimePlayerTyped + MenuIcon3D.FRIENDS_TYPING_SIGN_DURATION
    ) {
      this.stopFriendsLeftTyping(elapsedSeconds);
      this.friendsLeftPendingMessageAt = null;
    }

    if (this.friendsLeftPendingMessageAt !== null && elapsedSeconds >= this.friendsLeftPendingMessageAt) {
      this.showFriendsLeftOverheadMessage(this.getNextFriendsLeftDemoMessage(), elapsedSeconds);
      this.stopFriendsLeftTyping(elapsedSeconds);
      this.friendsLeftPendingMessageAt = null;
    }

    this.updateFriendsLeftOverheadBubbles(elapsedSeconds);
    this.updateFriendsLeftMessageTranslate(elapsedSeconds);
  }

  private startFriendsConversationTyping(side: 'left' | 'right', elapsedSeconds: number): void {
    if (side === 'left') {
      this.registerFriendsLeftTyping(elapsedSeconds);
      return;
    }
    this.registerFriendsTyping(elapsedSeconds);
  }

  private stopFriendsConversationTyping(side: 'left' | 'right', elapsedSeconds: number): void {
    if (side === 'left') {
      this.stopFriendsLeftTyping(elapsedSeconds);
      return;
    }
    this.stopFriendsTyping(elapsedSeconds);
  }

  private showFriendsConversationMessage(
    side: 'left' | 'right',
    message: string,
    elapsedSeconds: number
  ): void {
    if (side === 'left') {
      this.showFriendsLeftOverheadMessage(message, elapsedSeconds);
      return;
    }
    this.showFriendsOverheadMessage(message, elapsedSeconds);
  }

  private getFriendsConversationTypingDuration(message: string): number {
    const glyphCount = Array.from(message).length;
    const duration = 0.35 + Math.min(1.05, glyphCount * 0.045);
    const scaledDuration = duration * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE;
    return THREE.MathUtils.clamp(
      scaledDuration,
      0.35 * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE,
      1.4 * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE
    );
  }

  private getFriendsConversationGapAfter(stepIndex: number): number {
    const current = MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT[stepIndex];
    const next =
      MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT[
        (stepIndex + 1) % MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT.length
      ];
    let gap = current.side === next.side ? 0.28 : 0.8;

    if (current.message.includes('?') || current.message.includes('!')) {
      gap += 0.08;
    }

    if (Array.from(current.message).length <= 3) {
      gap -= 0.05;
    }

    const scaledGap = gap * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE;
    return THREE.MathUtils.clamp(
      scaledGap,
      0.2 * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE,
      1.1 * MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE
    );
  }

  private updateFriendsConversationScript(elapsedSeconds: number): void {
    if (!this.friendsConversationInitialized) {
      this.friendsConversationInitialized = true;
      this.friendsConversationStepIndex = 0;
      this.friendsConversationActiveSide = null;
      this.friendsConversationTypingUntil = 0;
      this.friendsConversationNextActionAt =
        elapsedSeconds +
        MenuIcon3D.FRIENDS_CONVERSATION_INITIAL_DELAY *
          MenuIcon3D.FRIENDS_CONVERSATION_TIME_SCALE;
    }

    if (
      this.friendsConversationActiveSide !== null &&
      elapsedSeconds >= this.friendsConversationTypingUntil
    ) {
      const step = MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT[this.friendsConversationStepIndex];
      const gapAfter = this.getFriendsConversationGapAfter(this.friendsConversationStepIndex);
      this.showFriendsConversationMessage(step.side, step.message, elapsedSeconds);
      this.stopFriendsConversationTyping(step.side, elapsedSeconds);
      this.friendsConversationActiveSide = null;
      this.friendsConversationStepIndex =
        (this.friendsConversationStepIndex + 1) % MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT.length;
      this.friendsConversationNextActionAt = elapsedSeconds + gapAfter;
    }

    if (
      this.friendsConversationActiveSide === null &&
      elapsedSeconds >= this.friendsConversationNextActionAt
    ) {
      const step = MenuIcon3D.FRIENDS_CONVERSATION_SCRIPT[this.friendsConversationStepIndex];
      const typingDuration = this.getFriendsConversationTypingDuration(step.message);
      this.startFriendsConversationTyping(step.side, elapsedSeconds);
      this.friendsConversationActiveSide = step.side;
      this.friendsConversationTypingUntil = elapsedSeconds + typingDuration;
    }

    this.updateFriendsOverheadBubbles(elapsedSeconds);
    this.updateFriendsMessageTranslate(elapsedSeconds);
    this.updateFriendsLeftOverheadBubbles(elapsedSeconds);
    this.updateFriendsLeftMessageTranslate(elapsedSeconds);
  }

  private renderFriendsLeftFloatingChat(elapsedSeconds: number): void {
    if (!this.friendsLeftFloatingChatContext) {
      return;
    }

    const ctx = this.friendsLeftFloatingChatContext;
    const pixelWidth = ctx.canvas.width;
    const pixelHeight = ctx.canvas.height;
    const width = MenuIcon3D.FRIENDS_MESSAGE_PARENT_WIDTH;
    const height = MenuIcon3D.FRIENDS_MESSAGE_PARENT_HEIGHT;
    const scaleX = pixelWidth / width;
    const scaleY = pixelHeight / height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const parentWidth = MenuIcon3D.FRIENDS_MESSAGE_PARENT_WIDTH;
    const parentPaddingX = MenuIcon3D.FRIENDS_MESSAGE_PARENT_PADDING_X;
    const messageAreaWidth = parentWidth - parentPaddingX * 2;

    if (this.friendsLeftTypingIndicatorActive) {
      const indicatorWidth = MenuIcon3D.FRIENDS_TYPING_INDICATOR_WIDTH;
      const indicatorHeight = MenuIcon3D.FRIENDS_TYPING_INDICATOR_BODY_HEIGHT;
      const indicatorX = Math.round((parentWidth - indicatorWidth) * 0.5);
      const indicatorY = Math.round(height - indicatorHeight - MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT);

      this.drawFriendsBubble(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 1, true);

      const dotAppearDuration = MenuIcon3D.FRIENDS_DOT_APPEAR_DURATION;
      const pauseDuration = MenuIcon3D.FRIENDS_DOT_PAUSE_DURATION;
      const typingCycleDuration = dotAppearDuration * 3 + pauseDuration + dotAppearDuration * 3 + pauseDuration;
      const timeInCycle =
        ((elapsedSeconds - this.friendsLeftTypingIndicatorStartTime) % typingCycleDuration + typingCycleDuration) %
        typingCycleDuration;
      const dotDiameter = 5;
      const dotOffsetsX = [7, 18, 29];
      const dotTints = [178, 217, 255];
      for (let i = 0; i < dotOffsetsX.length; i++) {
        const dotOpacity = this.getFriendsTypingDotOpacity(i, timeInCycle, dotAppearDuration, pauseDuration);
        if (dotOpacity <= 0) {
          continue;
        }
        const dotTint = dotTints[i];
        ctx.fillStyle = `rgba(${dotTint}, ${dotTint}, ${dotTint}, ${Math.min(1, dotOpacity)})`;
        ctx.beginPath();
        ctx.arc(indicatorX + dotOffsetsX[i], indicatorY + 8, dotDiameter * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const labelFont = 'normal 12px "Jost", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    const labelMinWidth = MenuIcon3D.FRIENDS_MESSAGE_LABEL_MIN_WIDTH;
    const labelPaddingX = MenuIcon3D.FRIENDS_MESSAGE_LABEL_PADDING_X;
    const bubbleHeight = MenuIcon3D.FRIENDS_MESSAGE_MIN_HEIGHT;
    let currentBottom = height - MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT + this.friendsLeftMessageTranslateY;
    const newestIndex = this.friendsLeftOverheadBubbles.length - 1;

    for (let i = newestIndex; i >= 0; i--) {
      const bubble = this.friendsLeftOverheadBubbles[i];
      const age = elapsedSeconds - bubble.createdAt;
      const bubbleOpacity =
        age <= MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION
          ? 1
          : THREE.MathUtils.clamp(
              1 -
                (age - MenuIcon3D.FRIENDS_MESSAGE_DISPLAY_DURATION) /
                  MenuIcon3D.FRIENDS_MESSAGE_FADE_DURATION,
              0,
              1
            );
      if (bubbleOpacity <= 0) {
        continue;
      }

      ctx.font = labelFont;
      const maxTextWidth = messageAreaWidth - labelPaddingX * 2;
      let messageText = bubble.text;
      if (ctx.measureText(messageText).width > maxTextWidth) {
        const chars = Array.from(messageText);
        while (chars.length > 1 && ctx.measureText(`${chars.join('')}...`).width > maxTextWidth) {
          chars.pop();
        }
        messageText = `${chars.join('')}...`;
      }
      const textWidth = Math.ceil(ctx.measureText(messageText).width);
      const bubbleWidth = Math.max(labelMinWidth, textWidth) + labelPaddingX * 2;
      const bubbleX = Math.round(parentPaddingX + (messageAreaWidth - bubbleWidth) * 0.5);
      const showTail = i === newestIndex && !this.friendsLeftTypingIndicatorActive;
      const tailHeight = showTail ? MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT : 0;
      const bubbleY = Math.round(currentBottom - (bubbleHeight + tailHeight));

      this.drawFriendsBubble(
        ctx,
        bubbleX,
        bubbleY,
        bubbleWidth,
        bubbleHeight,
        bubbleOpacity,
        showTail
      );

      ctx.fillStyle = `rgba(255, 255, 255, ${bubbleOpacity})`;
      ctx.font = labelFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = `rgba(0, 0, 0, ${bubbleOpacity})`;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.shadowBlur = 0;
      ctx.fillText(messageText, bubbleX + bubbleWidth * 0.5, bubbleY + bubbleHeight * 0.5);
      ctx.shadowColor = 'rgba(0, 0, 0, 0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      currentBottom = bubbleY - MenuIcon3D.FRIENDS_MESSAGE_STACK_GAP;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawFriendsBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
    showTail: boolean
  ): void {
    const radius = 6;
    const right = x + width;
    const bottom = y + height;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(right - radius, y);
    ctx.quadraticCurveTo(right, y, right, y + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    if (showTail) {
      const tailWidth = MenuIcon3D.FRIENDS_BUBBLE_TAIL_WIDTH;
      const tailHeight = MenuIcon3D.FRIENDS_BUBBLE_TAIL_HEIGHT;
      const tailCenterX = x + width * 0.5;
      ctx.lineTo(tailCenterX + tailWidth * 0.5, bottom);
      ctx.lineTo(tailCenterX, bottom + tailHeight);
      ctx.lineTo(tailCenterX - tailWidth * 0.5, bottom);
    }
    ctx.lineTo(x + radius, bottom);
    ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * alpha})`;
    ctx.stroke();
  }

  private getFriendsTypingDotOpacity(
    dotIndex: number,
    timeInCycle: number,
    dotAppearDuration: number,
    pauseDuration: number
  ): number {
    const fadeOutStart = dotAppearDuration * 3 + pauseDuration;
    const dotFadeInStart = dotIndex * dotAppearDuration;
    const dotFadeInEnd = dotFadeInStart + dotAppearDuration;
    const dotFadeOutStart = fadeOutStart + dotIndex * dotAppearDuration;
    const dotFadeOutEnd = dotFadeOutStart + dotAppearDuration;

    if (timeInCycle < dotFadeInStart) {
      return 0;
    }
    if (timeInCycle < dotFadeInEnd) {
      return (timeInCycle - dotFadeInStart) / dotAppearDuration;
    }
    if (timeInCycle < dotFadeOutStart) {
      return 1;
    }
    if (timeInCycle < dotFadeOutEnd) {
      return 1 - (timeInCycle - dotFadeOutStart) / dotAppearDuration;
    }
    return 0;
  }

  private createFriendsSocialPanelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width =
      MenuIcon3D.FRIENDS_SOCIAL_PANEL_BASE_WIDTH * MenuIcon3D.FRIENDS_SOCIAL_PANEL_RENDER_SCALE;
    canvas.height =
      MenuIcon3D.FRIENDS_SOCIAL_PANEL_BASE_HEIGHT * MenuIcon3D.FRIENDS_SOCIAL_PANEL_RENDER_SCALE;
    const ctx = canvas.getContext('2d')!;
    this.friendsSocialPanelContext = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.friendsSocialPanelTexture = texture;
    this.renderFriendsSocialPanel(0);
    texture.needsUpdate = true;
    return texture;
  }

  private renderFriendsSocialPanel(elapsedSeconds: number): void {
    if (!this.friendsSocialPanelContext) {
      return;
    }

    const ctx = this.friendsSocialPanelContext;
    const pixelWidth = ctx.canvas.width;
    const pixelHeight = ctx.canvas.height;
    const width = MenuIcon3D.FRIENDS_SOCIAL_PANEL_BASE_WIDTH;
    const height = MenuIcon3D.FRIENDS_SOCIAL_PANEL_BASE_HEIGHT;
    const scaleX = pixelWidth / width;
    const scaleY = pixelHeight / height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const roundedRect = (x: number, y: number, w: number, h: number, r: number): void => {
      const radius = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const SLOT_BG = 'rgba(255, 255, 255, 0.02)';
    const HOVER_BG = 'rgba(255, 255, 255, 0.15)';
    const BORDER_DEFAULT = 'rgba(255, 255, 255, 0.4)';
    const BORDER_HOVER = 'rgba(255, 255, 255, 0.8)';
    const TEXT_COLOR = 'rgb(255, 255, 255)';
    const TEXT_SHADOW = 'rgb(0, 0, 0)';
    const ONLINE_COLOR = 'rgb(77, 255, 77)';
    const OFFLINE_COLOR = 'rgb(102, 102, 102)';

    const drawTextShadow = (
      text: string,
      x: number,
      y: number,
      font: string,
      align: CanvasTextAlign,
      baseline: CanvasTextBaseline,
      color = TEXT_COLOR
    ): void => {
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillStyle = color;
      ctx.shadowColor = TEXT_SHADOW;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.shadowBlur = 0;
      ctx.fillText(text, x, y);
      ctx.shadowColor = 'rgba(0, 0, 0, 0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    const drawBasicButton = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      active = false
    ): void => {
      roundedRect(x, y, w, h, radius);
      ctx.fillStyle = active ? HOVER_BG : SLOT_BG;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = active ? BORDER_HOVER : BORDER_DEFAULT;
      ctx.stroke();
    };

    const drawAvatarPlaceholder = (centerX: number, centerY: number, radius: number): void => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(centerX, centerY - radius * 0.22, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + radius * 0.3, radius * 0.42, radius * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCategoryItem = (x: number, label: string, active: boolean): void => {
      const buttonX = x + 10;
      const buttonY = 12;
      drawBasicButton(buttonX, buttonY, 60, 60, 30, active);
      drawAvatarPlaceholder(buttonX + 30, buttonY + 30, 18);
      drawTextShadow(label, x + 40, 79, '500 16px "Jost", sans-serif', 'center', 'top');
    };

    const drawFriendTile = (
      x: number,
      y: number,
      name: string,
      isOnline: boolean,
      isAddFriend: boolean
    ): void => {
      const iconSize = 60;
      const iconX = x + 20;
      const iconY = y;
      drawBasicButton(iconX, iconY, iconSize, iconSize, iconSize * 0.5, false);

      if (isAddFriend) {
        drawTextShadow('+', iconX + iconSize * 0.5, iconY + iconSize * 0.53, '500 30px "Jost", sans-serif', 'center', 'middle');

        const badgeX = iconX + iconSize - 2;
        const badgeY = iconY + 8;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 12.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 11.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fill();
        drawTextShadow('5', badgeX, badgeY + 0.5, '400 16px "Jost", sans-serif', 'center', 'middle');
      } else {
        drawAvatarPlaceholder(iconX + iconSize * 0.5, iconY + iconSize * 0.5, iconSize * 0.46);

        const statusX = iconX + iconSize - 5;
        const statusY = iconY + iconSize - 5;
        ctx.beginPath();
        ctx.arc(statusX, statusY, 5.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(statusX, statusY, 4, 0, Math.PI * 2);
        ctx.fillStyle = isOnline ? ONLINE_COLOR : OFFLINE_COLOR;
        ctx.fill();
      }

      drawTextShadow(name, x + 50, y + 74, '400 16px "Jost", sans-serif', 'center', 'top');

      if (!isAddFriend) {
        const actionY = y + 98;
        const drawAction = (ax: number, symbol: string): void => {
          drawBasicButton(ax, actionY, 20, 20, 6, false);
          drawTextShadow(
            symbol,
            ax + 10,
            actionY + 10.5,
            '500 12px "Segoe UI Emoji", "Apple Color Emoji", sans-serif',
            'center',
            'middle'
          );
        };
        drawAction(x + 27, '\u{1F4AC}');
        drawAction(x + 53, '\u{1F310}');
      }
    };

    ctx.lineWidth = 1;
    ctx.strokeStyle = BORDER_DEFAULT;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    drawCategoryItem(26, 'Friends', true);
    drawCategoryItem(116, 'Guild', false);

    drawBasicButton(width - 60, 4, 24, 24, 6, false);
    drawTextShadow('\u00D7', width - 48, 16, '400 20px "Jost", sans-serif', 'center', 'middle');

    roundedRect(36, 102, 326, 36, 12);
    ctx.fillStyle = SLOT_BG;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = BORDER_DEFAULT;
    ctx.stroke();
    drawTextShadow(
      'Search friends...',
      50,
      120,
      '400 16px "Jost", sans-serif',
      'left',
      'middle',
      BORDER_HOVER
    );

    const tileStartX = 18;
    const tileStartY = 152;
    const tileStepX = 118;
    const tileStepY = 132;
    const entries = [
      { name: 'Add Friend', online: false, add: true },
      { name: 'NoScopeNinja', online: true, add: false },
      { name: 'PixelCrusher', online: false, add: false },
      { name: 'LagWizard', online: true, add: false },
      { name: 'CritQueen', online: false, add: false },
      { name: 'XPHunter', online: true, add: false },
    ];

    for (let i = 0; i < entries.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const tileX = tileStartX + col * tileStepX;
      const tileY = tileStartY + row * tileStepY;
      const entry = entries[i];
      drawFriendTile(tileX, tileY, entry.name, entry.online, entry.add);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private configureFriendsTextureSampling(renderer?: THREE.WebGLRenderer): void {
    if (this.friendsTextureSamplingConfigured) {
      return;
    }
    const maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    const targetAnisotropy = Math.max(1, Math.min(8, maxAnisotropy));

    if (this.friendsScreenTexture) {
      this.friendsScreenTexture.anisotropy = targetAnisotropy;
      this.friendsScreenTexture.needsUpdate = true;
    }
    if (this.friendsSocialPanelTexture) {
      this.friendsSocialPanelTexture.anisotropy = targetAnisotropy;
      this.friendsSocialPanelTexture.needsUpdate = true;
    }
    if (this.friendsFloatingChatTexture) {
      this.friendsFloatingChatTexture.anisotropy = targetAnisotropy;
      this.friendsFloatingChatTexture.needsUpdate = true;
    }
    if (this.friendsLeftFloatingChatTexture) {
      this.friendsLeftFloatingChatTexture.anisotropy = targetAnisotropy;
      this.friendsLeftFloatingChatTexture.needsUpdate = true;
    }
    this.friendsTextureSamplingConfigured = true;
  }

  private syncRendererSize(renderer: THREE.WebGLRenderer): void {
    const targetWidth = this.ctx.canvas.width;
    const targetHeight = this.ctx.canvas.height;
    renderer.getSize(this.rendererSize);
    if (this.rendererSize.x === targetWidth && this.rendererSize.y === targetHeight) {
      return;
    }
    renderer.setSize(targetWidth, targetHeight, false);
  }

  private createEnvelopePaperMaps(): {
    color: THREE.CanvasTexture;
    bump: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const width = 768;
    const height = 512;
    const hash = (seed: number): number => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
      return value - Math.floor(value);
    };

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorCtx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext('2d')!;

    const baseGradient = colorCtx.createLinearGradient(0, 0, width, height);
    baseGradient.addColorStop(0, '#f4f1e8');
    baseGradient.addColorStop(0.5, '#ece8dd');
    baseGradient.addColorStop(1, '#ddd8cc');
    colorCtx.fillStyle = baseGradient;
    colorCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < 1200; i++) {
      const x = hash(i + 3) * width;
      const y = hash(i + 13) * height;
      const radius = 0.6 + hash(i + 23) * 1.8;
      const alpha = 0.015 + hash(i + 41) * 0.04;
      colorCtx.fillStyle = `rgba(120, 116, 103, ${alpha})`;
      colorCtx.beginPath();
      colorCtx.arc(x, y, radius, 0, Math.PI * 2);
      colorCtx.fill();
    }

    for (let i = 0; i < 28; i++) {
      const y = 18 + i * 16 + hash(i + 61) * 9;
      const alpha = 0.015 + hash(i + 71) * 0.03;
      colorCtx.strokeStyle = `rgba(113, 109, 96, ${alpha})`;
      colorCtx.lineWidth = 0.7 + hash(i + 79) * 0.5;
      colorCtx.beginPath();
      colorCtx.moveTo(-16, y);
      colorCtx.bezierCurveTo(width * 0.2, y + 5, width * 0.7, y - 4, width + 16, y + 3);
      colorCtx.stroke();
    }

    colorCtx.strokeStyle = 'rgba(126, 122, 110, 0.28)';
    colorCtx.lineWidth = 2;
    colorCtx.beginPath();
    colorCtx.moveTo(width * 0.18, height * 0.24);
    colorCtx.lineTo(width * 0.5, height * 0.52);
    colorCtx.lineTo(width * 0.82, height * 0.24);
    colorCtx.stroke();

    colorCtx.font = 'italic 56px "Times New Roman", serif';
    colorCtx.fillStyle = 'rgba(78, 78, 72, 0.62)';
    colorCtx.fillText('Mary', width * 0.7, height * 0.84);
    colorCtx.strokeStyle = 'rgba(78, 78, 72, 0.5)';
    colorCtx.lineWidth = 2;
    colorCtx.beginPath();
    colorCtx.moveTo(width * 0.67, height * 0.86);
    colorCtx.lineTo(width * 0.83, height * 0.88);
    colorCtx.stroke();

    bumpCtx.fillStyle = 'rgb(128,128,128)';
    bumpCtx.fillRect(0, 0, width, height);
    for (let i = 0; i < 720; i++) {
      const x = hash(i + 97) * width;
      const y = hash(i + 107) * height;
      const radius = 0.8 + hash(i + 117) * 2.2;
      const luminance = Math.floor(108 + hash(i + 127) * 46);
      bumpCtx.fillStyle = `rgb(${luminance},${luminance},${luminance})`;
      bumpCtx.beginPath();
      bumpCtx.arc(x, y, radius, 0, Math.PI * 2);
      bumpCtx.fill();
    }
    for (let i = 0; i < 16; i++) {
      const y = 22 + i * 26 + hash(i + 137) * 12;
      const luminance = Math.floor(116 + hash(i + 149) * 22);
      bumpCtx.strokeStyle = `rgb(${luminance},${luminance},${luminance})`;
      bumpCtx.lineWidth = 1.2 + hash(i + 157) * 0.9;
      bumpCtx.beginPath();
      bumpCtx.moveTo(-20, y);
      bumpCtx.bezierCurveTo(width * 0.22, y + 8, width * 0.66, y - 7, width + 20, y + 6);
      bumpCtx.stroke();
    }

    roughCtx.fillStyle = 'rgb(230,230,230)';
    roughCtx.fillRect(0, 0, width, height);
    for (let i = 0; i < 1100; i++) {
      const x = hash(i + 167) * width;
      const y = hash(i + 179) * height;
      const size = 1 + hash(i + 191) * 2.4;
      const luminance = Math.floor(202 + hash(i + 199) * 46);
      roughCtx.fillStyle = `rgb(${luminance},${luminance},${luminance})`;
      roughCtx.fillRect(x, y, size, size);
    }

    const color = new THREE.CanvasTexture(colorCanvas);
    color.colorSpace = THREE.SRGBColorSpace;
    color.needsUpdate = true;

    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.needsUpdate = true;

    const roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.needsUpdate = true;

    return { color, bump, roughness };
  }

  private createPortalStreakTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lineGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    lineGradient.addColorStop(0, 'rgba(44, 93, 255, 0)');
    lineGradient.addColorStop(0.2, 'rgba(0, 56, 230, 0.56)');
    lineGradient.addColorStop(0.5, 'rgba(212, 227, 255, 0.96)');
    lineGradient.addColorStop(0.8, 'rgba(0, 48, 210, 0.58)');
    lineGradient.addColorStop(1, 'rgba(44, 93, 255, 0)');

    const verticalMask = ctx.createLinearGradient(0, 0, 0, canvas.height);
    verticalMask.addColorStop(0, 'rgba(255, 255, 255, 0)');
    verticalMask.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    verticalMask.addColorStop(0.65, 'rgba(255, 255, 255, 0.95)');
    verticalMask.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = lineGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = verticalMask;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createPortalVortexTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    const arcCount = 180;
    for (let i = 0; i < arcCount; i++) {
      const t = i / arcCount;
      const radius = 10 + Math.pow(t, 0.78) * 218;
      const start = i * 0.31 + t * 3.2;
      const sweep = 0.52 + (1 - t) * 1.34;
      const r = Math.round(0 + (1 - t) * 95);
      const g = Math.round(36 + (1 - t) * 112);
      const alpha = 0.1 + (1 - t) * 0.52;

      ctx.strokeStyle = `rgba(${r}, ${g}, 255, ${alpha})`;
      ctx.lineWidth = 1.2 + (1 - t) * 7.8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, start + sweep);
      ctx.stroke();
    }

    const centerGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 128);
    centerGlow.addColorStop(0, 'rgba(227, 238, 255, 0.86)');
    centerGlow.addColorStop(0.35, 'rgba(74, 118, 255, 0.6)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 128, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 18, 86, 0.42)';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private buildInfo(): void {
    const paperWidth = 2.0;
    const paperHeight = 2.6;
    const paperGeometry = new THREE.PlaneGeometry(paperWidth, paperHeight, 26, 32);
    const positions = paperGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const normalizedX = x / (paperWidth * 0.5);
      const normalizedY = y / (paperHeight * 0.5);
      const centerCurve = Math.sin(normalizedY * Math.PI) * 0.035;
      const cornerDistance = Math.abs(normalizedX * normalizedY);
      const cornerCurl = Math.pow(cornerDistance, 1.85) * 0.22;
      const cornerSign = normalizedX * normalizedY > 0 ? 1 : -0.35;
      positions.setZ(i, centerCurve + cornerCurl * cornerSign);
    }

    paperGeometry.computeVertexNormals();

    const paper = new THREE.Mesh(
      paperGeometry,
      new THREE.MeshBasicMaterial({
        map: this.createPaperTexture(),
        color: 0xead7b6,
        side: THREE.DoubleSide,
      })
    );
    paper.rotation.z = -0.26;
    this.group.add(paper);

    this.group.rotation.set(-0.45, 0.18, -0.08);
  }

  private createPaperTexture(): THREE.CanvasTexture {
    const width = 512;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(64, 36, 19, 0.72)';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 38, width - 68, height - 76);

    ctx.strokeStyle = 'rgba(82, 50, 28, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 54, width - 100, height - 108);

    const drawCorner = (originX: number, originY: number, flipX: number, flipY: number): void => {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = 'rgba(56, 29, 14, 0.84)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.bezierCurveTo(14, 18, 38, 10, 72, 2);
      ctx.bezierCurveTo(40, 18, 23, 38, 6, 74);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(18, 70);
      ctx.bezierCurveTo(30, 44, 44, 30, 74, 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(22, 36, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    drawCorner(58, 66, 1, 1);
    drawCorner(width - 58, 66, -1, 1);
    drawCorner(58, height - 66, 1, -1);
    drawCorner(width - 58, height - 66, -1, -1);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 7, 5, 0.94)';
    ctx.font = '700 38px "Times New Roman", serif';
    ctx.fillText('ABOUT US', 88, 164);

    ctx.font = '500 24px "Times New Roman", serif';
    const textLines = [
      'The Big One Initiative',
      'Exploration and discovery',
      'Persistent world systems',
      'Community driven events',
      'Character progression paths',
      'Early access development',
      'Global network operations',
    ];

    textLines.forEach((line, index) => {
      ctx.fillText(line, 88, 214 + index * 40);
    });
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** Update animation state; optionally render via shared renderer and blit to display canvas. */
  update(delta: number, renderer?: THREE.WebGLRenderer): void {
    this.elapsed += delta;
    const renderToCanvas = !this.mountedExternally;
    if (renderToCanvas) {
      if (!renderer) {
        return;
      }
      this.syncRendererSize(renderer);
      renderer.setClearColor(0x000000, 0);
    }

    if (this.type === 'globe') {
      // Keep globe icon static in world space (no float/tilt/spin).
      this.group.rotation.set(-0.18, 0.46, 0.04);
      this.group.position.set(0, 0, 0);
      this.group.scale.set(1, 1, 1);
      if (this.globeCoreGroup) {
        this.globeCoreGroup.position.set(0, 0, 0);
        this.globeCoreGroup.rotation.set(0, 0, 0);
      }
      if (this.globeOrbitalGroup) {
        this.globeOrbitalGroup.rotation.set(Math.PI * 0.43, 0.02, -0.08);
      }
      this.updateGlobeOrbitNodes(this.elapsed);
      for (let i = 0; i < this.globeAuxPanels.length; i++) {
        const panel = this.globeAuxPanels[i];
        panel.group.position.set(panel.baseX, panel.baseY, panel.baseZ);
        panel.group.rotation.y = panel.baseRotY;
        panel.group.rotation.z = panel.baseRotZ;
      }
      for (let i = 0; i < this.globePulseMaterials.length; i++) {
        const pulse = this.globePulseMaterials[i];
        pulse.material.opacity = pulse.baseOpacity;
      }
    } else if (this.type === 'key') {
      this.group.rotation.set(0, Math.PI * 0.5, 0);
      this.group.position.set(0, 0, 0);
      this.group.scale.set(1, 1, 1);
    } else if (this.type === 'info') {
      this.group.rotation.set(-0.45, 0.18, -0.08);
      this.group.position.set(0, 0, 0);
      this.group.scale.set(1, 1, 1);
    } else if (this.type === 'inbox') {
      this.updateInboxOrbitParticles(this.elapsed);
      this.group.rotation.set(-0.1, 0.04, -0.09);
      this.group.position.set(0, 0, 0);
      this.group.scale.setScalar(0.9);
    } else if (this.type === 'friends') {
      this.configureFriendsTextureSampling(renderer);
      this.updateFriendsConversationScript(this.elapsed);

      if (this.friendsScreenTexture) {
        this.renderFriendsPhoneScreen(this.elapsed);
        this.friendsScreenTexture.needsUpdate = true;
      }
      if (this.friendsFloatingChatTexture) {
        this.renderFriendsFloatingChat(this.elapsed);
        this.friendsFloatingChatTexture.needsUpdate = true;
      }
      if (this.friendsLeftFloatingChatTexture) {
        this.renderFriendsLeftFloatingChat(this.elapsed);
        this.friendsLeftFloatingChatTexture.needsUpdate = true;
      }
      this.group.rotation.set(-0.12, 0.3, 0.02);
      this.group.position.set(0, 0, 0);
      this.group.scale.setScalar(0.92);
    } else {
      this.group.position.set(0, 0, 0);
      this.group.scale.set(1, 1, 1);
    }

    if (!renderToCanvas || !renderer) {
      return;
    }

    renderer.render(this.scene, this.camera);
    const targetWidth = this.ctx.canvas.width;
    const targetHeight = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, targetWidth, targetHeight);
    this.ctx.drawImage(
      renderer.domElement,
      0,
      0,
      renderer.domElement.width,
      renderer.domElement.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
  }

  dispose(): void {
    const disposedTextures = new Set<string>();
    const disposedMaterials = new Set<string>();
    const textureSlots = [
      'map',
      'alphaMap',
      'emissiveMap',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'bumpMap',
      'aoMap',
      'specularMap',
      'envMap',
      'lightMap',
      'displacementMap',
      'gradientMap',
    ];

    const disposeMaterial = (material: THREE.Material): void => {
      if (disposedMaterials.has(material.uuid)) {
        return;
      }

      const texturedMaterial = material as THREE.Material & Record<string, unknown>;
      for (const slot of textureSlots) {
        const texture = texturedMaterial[slot] as THREE.Texture | null | undefined;
        if (!texture || disposedTextures.has(texture.uuid)) continue;
        texture.dispose();
        disposedTextures.add(texture.uuid);
      }

      material.dispose();
      disposedMaterials.add(material.uuid);
    };

    const disposeObject = (obj: THREE.Object3D): void => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      } else if (obj instanceof THREE.Sprite) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      }
    };

    if (this.externalRoot) {
      this.externalRoot.traverse(disposeObject);
      if (this.externalRoot.parent) {
        this.externalRoot.parent.remove(this.externalRoot);
      }
    }
    this.scene.traverse(disposeObject);

    this.globeCoreGroup = null;
    this.globeOrbitalGroup = null;
    this.globeAuxPanels = [];
    this.globePulseMaterials = [];
    this.globePacketNodes = [];
    this.inboxOrbitCenter = null;
    this.inboxOrbitParticles = [];
    this.friendsScreenTexture = null;
    this.friendsScreenContext = null;
    this.friendsSocialPanelTexture = null;
    this.friendsSocialPanelContext = null;
    this.friendsSocialPanelGroup = null;
    this.friendsFloatingChatTexture = null;
    this.friendsFloatingChatContext = null;
    this.friendsFloatingChatGroup = null;
    this.friendsLeftFloatingChatTexture = null;
    this.friendsLeftFloatingChatContext = null;
    this.friendsLeftFloatingChatGroup = null;
    this.friendsConversationInitialized = false;
    this.friendsConversationNextActionAt = 0;
    this.friendsConversationStepIndex = 0;
    this.friendsConversationActiveSide = null;
    this.friendsConversationTypingUntil = 0;
    this.friendsTextureSamplingConfigured = false;
    this.externalRoot = null;
    this.mountedExternally = false;
  }
}
