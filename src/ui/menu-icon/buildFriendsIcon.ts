import * as THREE from 'three';
import { FRIENDS_CONVERSATION_SCRIPT } from './friendsConversationScript';
import * as FriendsIconConfig from './friendsConstants';

export class FriendsIconRuntime {
  private readonly scene: THREE.Scene;
  private readonly group: THREE.Group;
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
  private friendsLastRenderStateKey = '';
  private friendsNextTextureUpdateAt = 0;
  private friendsPhoneTextureDirty = true;

  constructor(group: THREE.Group, scene: THREE.Scene) {
    this.group = group;
    this.scene = scene;
    this.buildFriendsPlaceholder();
  }

  public update(elapsedSeconds: number, renderer?: THREE.WebGLRenderer): void {
    this.configureFriendsTextureSampling(renderer);
    this.updateFriendsConversationScript(elapsedSeconds);

    const visualStateKey = this.getFriendsVisualStateKey();
    const visualStateChanged = visualStateKey !== this.friendsLastRenderStateKey;
    if (visualStateChanged) {
      this.friendsLastRenderStateKey = visualStateKey;
    }

    if (this.friendsScreenTexture && this.friendsPhoneTextureDirty) {
      this.renderFriendsPhoneScreen(elapsedSeconds);
      this.friendsScreenTexture.needsUpdate = true;
      this.friendsPhoneTextureDirty = false;
    }

    const shouldRenderAnimatedTextures =
      visualStateChanged ||
      (this.shouldAnimateFriendsTextures(elapsedSeconds) &&
        elapsedSeconds >= this.friendsNextTextureUpdateAt);

    if (shouldRenderAnimatedTextures) {
      if (this.friendsFloatingChatTexture) {
        this.renderFriendsFloatingChat(elapsedSeconds);
        this.friendsFloatingChatTexture.needsUpdate = true;
      }
      if (this.friendsLeftFloatingChatTexture) {
        this.renderFriendsLeftFloatingChat(elapsedSeconds);
        this.friendsLeftFloatingChatTexture.needsUpdate = true;
      }
      this.friendsNextTextureUpdateAt =
        elapsedSeconds + 1 / FriendsIconConfig.FRIENDS_TEXTURE_UPLOAD_FPS;
    }
  }

  public dispose(): void {
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
    this.friendsLastRenderStateKey = '';
    this.friendsNextTextureUpdateAt = 0;
    this.friendsPhoneTextureDirty = true;
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

    interface InstanceTransform {
      x: number;
      y: number;
      z: number;
      rx?: number;
      ry?: number;
      rz?: number;
      sx?: number;
      sy?: number;
      sz?: number;
    }

    const instanceDummy = new THREE.Object3D();
    const addInstancedMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      transforms: readonly InstanceTransform[]
    ): THREE.InstancedMesh | null => {
      if (transforms.length === 0) {
        return null;
      }

      const instanced = new THREE.InstancedMesh(geometry, material, transforms.length);
      instanced.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      transforms.forEach((transform, index) => {
        instanceDummy.position.set(transform.x, transform.y, transform.z);
        instanceDummy.rotation.set(transform.rx ?? 0, transform.ry ?? 0, transform.rz ?? 0);
        instanceDummy.scale.set(
          transform.sx ?? 1,
          transform.sy ?? transform.sx ?? 1,
          transform.sz ?? transform.sx ?? 1
        );
        instanceDummy.updateMatrix();
        instanced.setMatrixAt(index, instanceDummy.matrix);
      });
      instanced.instanceMatrix.needsUpdate = true;
      this.group.add(instanced);
      return instanced;
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
          depthTest: true,
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
    const screwTransforms: InstanceTransform[] = [
      { x: -0.98, y: 0.06, z: 0.108, rx: Math.PI * 0.5 },
      { x: 0.98, y: 0.06, z: 0.108, rx: Math.PI * 0.5 },
      { x: -0.98, y: -0.86, z: 0.108, rx: Math.PI * 0.5 },
    ];
    addInstancedMesh(screwGeo, screwMaterial, screwTransforms);

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
    const regularKeyTransforms: InstanceTransform[] = [];
    const accentKeyTransforms: InstanceTransform[] = [];
    const regularKeyFaceTransforms: InstanceTransform[] = [];
    const accentKeyFaceTransforms: InstanceTransform[] = [];
    for (let row = 0; row < keyRows; row++) {
      const rowShift = row % 2 === 0 ? 0 : 0.018;
      for (let col = 0; col < keyCols; col++) {
        const isAccent =
          (row === 0 && col < 3) ||
          (row === 0 && col > 8) ||
          (row === 4 && col > 8) ||
          (row === 3 && col >= 8 && col <= 9);
        const x = keyStartX + col * keyStepX + rowShift;
        const y = keyStartY - row * keyStepY;
        const rotationZ = ((row + col) % 2 === 0 ? 1 : -1) * 0.025;
        const keyTransform = { x, y, z: 0.145, rz: rotationZ };
        const keyFaceTransform = {
          x,
          y: y + 0.0015,
          z: 0.157,
          rz: rotationZ * 0.7,
        };

        if (isAccent) {
          accentKeyTransforms.push(keyTransform);
          accentKeyFaceTransforms.push(keyFaceTransform);
        } else {
          regularKeyTransforms.push(keyTransform);
          regularKeyFaceTransforms.push(keyFaceTransform);
        }
      }
    }
    addInstancedMesh(keyBodyGeometry, keycapMaterial, regularKeyTransforms);
    addInstancedMesh(keyBodyGeometry, keyHighlightMaterial, accentKeyTransforms);
    addInstancedMesh(keyFaceGeometry, keyFaceMaterial, regularKeyFaceTransforms);
    addInstancedMesh(keyFaceGeometry, keyAccentFaceMaterial, accentKeyFaceTransforms);

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

    // Chat bubble lives outside the device, floating over the right side.
    const floatingChatGroup = new THREE.Group();
    floatingChatGroup.userData.carouselBoundsIgnore = true;
    floatingChatGroup.position.copy(FriendsIconConfig.FRIENDS_RIGHT_CHAT_OFFSET);
    // Lean slightly right so it reads like the device is "speaking".
    floatingChatGroup.rotation.set(0, 0, FriendsIconConfig.FRIENDS_RIGHT_CHAT_TILT_Z);
    floatingChatGroup.scale.setScalar(FriendsIconConfig.FRIENDS_FLOATING_CHAT_WORLD_SCALE);
    this.group.add(floatingChatGroup);
    this.friendsFloatingChatGroup = floatingChatGroup;

    const floatingChatTexture = this.createFriendsFloatingChatTexture();
    floatingChatTexture.needsUpdate = true;
    floatingChatTexture.minFilter = THREE.LinearFilter;
    floatingChatTexture.magFilter = THREE.LinearFilter;
    floatingChatTexture.anisotropy = 2;
    const floatingChatScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(
        FriendsIconConfig.FRIENDS_FLOATING_CHAT_PLANE_WIDTH,
        FriendsIconConfig.FRIENDS_FLOATING_CHAT_PLANE_HEIGHT
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
    leftFloatingChatGroup.position.copy(FriendsIconConfig.FRIENDS_LEFT_CHAT_OFFSET);
    leftFloatingChatGroup.rotation.set(0, 0, FriendsIconConfig.FRIENDS_LEFT_CHAT_TILT_Z);
    leftFloatingChatGroup.scale.setScalar(FriendsIconConfig.FRIENDS_FLOATING_CHAT_WORLD_SCALE);
    this.group.add(leftFloatingChatGroup);
    this.friendsLeftFloatingChatGroup = leftFloatingChatGroup;

    const leftFloatingChatTexture = this.createFriendsLeftFloatingChatTexture();
    leftFloatingChatTexture.needsUpdate = true;
    leftFloatingChatTexture.minFilter = THREE.LinearFilter;
    leftFloatingChatTexture.magFilter = THREE.LinearFilter;
    leftFloatingChatTexture.anisotropy = 2;
    const leftFloatingChatScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(
        FriendsIconConfig.FRIENDS_FLOATING_CHAT_PLANE_WIDTH,
        FriendsIconConfig.FRIENDS_FLOATING_CHAT_PLANE_HEIGHT
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
    this.friendsPhoneTextureDirty = false;
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
      FriendsIconConfig.FRIENDS_FLOATING_CHAT_BASE_WIDTH * FriendsIconConfig.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    canvas.height =
      FriendsIconConfig.FRIENDS_FLOATING_CHAT_BASE_HEIGHT * FriendsIconConfig.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
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
      FriendsIconConfig.FRIENDS_FLOATING_CHAT_BASE_WIDTH * FriendsIconConfig.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
    canvas.height =
      FriendsIconConfig.FRIENDS_FLOATING_CHAT_BASE_HEIGHT * FriendsIconConfig.FRIENDS_FLOATING_CHAT_RENDER_SCALE;
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
    this.startFriendsMessageTranslate(-FriendsIconConfig.FRIENDS_TYPING_INDICATOR_HEIGHT, elapsedSeconds);
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
        FriendsIconConfig.FRIENDS_MESSAGE_TRANSLATE_DURATION,
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
    if (this.friendsOverheadBubbles.length >= FriendsIconConfig.FRIENDS_MESSAGE_MAX_STACK) {
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
      FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION + FriendsIconConfig.FRIENDS_MESSAGE_FADE_DURATION;
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
      elapsedSeconds > this.friendsLastTimePlayerTyped + FriendsIconConfig.FRIENDS_TYPING_SIGN_DURATION
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
    const width = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_WIDTH;
    const height = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_HEIGHT;
    const scaleX = pixelWidth / width;
    const scaleY = pixelHeight / height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const parentWidth = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_WIDTH;
    const parentPaddingX = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_PADDING_X;
    const messageAreaWidth = parentWidth - parentPaddingX * 2;

    // Draw canonical typing indicator first so message bubbles render above it.
    if (this.friendsTypingIndicatorActive) {
      const indicatorWidth = FriendsIconConfig.FRIENDS_TYPING_INDICATOR_WIDTH;
      const indicatorHeight = FriendsIconConfig.FRIENDS_TYPING_INDICATOR_BODY_HEIGHT;
      const indicatorX = Math.round((parentWidth - indicatorWidth) * 0.5);
      // Anchor typing bubble to the bottom; message stack uses translate(-24) when typing is active.
      const indicatorY = Math.round(height - indicatorHeight - FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT);

      this.drawFriendsBubble(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 1, true);

      const dotAppearDuration = FriendsIconConfig.FRIENDS_DOT_APPEAR_DURATION;
      const pauseDuration = FriendsIconConfig.FRIENDS_DOT_PAUSE_DURATION;
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
    const labelMinWidth = FriendsIconConfig.FRIENDS_MESSAGE_LABEL_MIN_WIDTH;
    const labelPaddingX = FriendsIconConfig.FRIENDS_MESSAGE_LABEL_PADDING_X;
    const bubbleHeight = FriendsIconConfig.FRIENDS_MESSAGE_MIN_HEIGHT;
    // Keep tail geometry visible within the texture bounds.
    let currentBottom = height - FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT + this.friendsMessageTranslateY;
    const newestIndex = this.friendsOverheadBubbles.length - 1;

    for (let i = newestIndex; i >= 0; i--) {
      const bubble = this.friendsOverheadBubbles[i];
      const age = elapsedSeconds - bubble.createdAt;
      const bubbleOpacity =
        age <= FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION
          ? 1
          : THREE.MathUtils.clamp(
              1 -
                (age - FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION) /
                  FriendsIconConfig.FRIENDS_MESSAGE_FADE_DURATION,
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
      const tailHeight = showTail ? FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT : 0;
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

      currentBottom = bubbleY - FriendsIconConfig.FRIENDS_MESSAGE_STACK_GAP;
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
    this.startFriendsLeftMessageTranslate(-FriendsIconConfig.FRIENDS_TYPING_INDICATOR_HEIGHT, elapsedSeconds);
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
        FriendsIconConfig.FRIENDS_MESSAGE_TRANSLATE_DURATION,
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
    if (this.friendsLeftOverheadBubbles.length >= FriendsIconConfig.FRIENDS_MESSAGE_MAX_STACK) {
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
      FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION + FriendsIconConfig.FRIENDS_MESSAGE_FADE_DURATION;
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
      elapsedSeconds > this.friendsLeftLastTimePlayerTyped + FriendsIconConfig.FRIENDS_TYPING_SIGN_DURATION
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
    const scaledDuration = duration * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE;
    return THREE.MathUtils.clamp(
      scaledDuration,
      0.35 * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE,
      1.4 * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE
    );
  }

  private getFriendsConversationGapAfter(stepIndex: number): number {
    const current = FRIENDS_CONVERSATION_SCRIPT[stepIndex];
    const next =
      FRIENDS_CONVERSATION_SCRIPT[
        (stepIndex + 1) % FRIENDS_CONVERSATION_SCRIPT.length
      ];
    let gap = current.side === next.side ? 0.28 : 0.8;

    if (current.message.includes('?') || current.message.includes('!')) {
      gap += 0.08;
    }

    if (Array.from(current.message).length <= 3) {
      gap -= 0.05;
    }

    const scaledGap = gap * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE;
    return THREE.MathUtils.clamp(
      scaledGap,
      0.2 * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE,
      1.1 * FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE
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
        FriendsIconConfig.FRIENDS_CONVERSATION_INITIAL_DELAY *
          FriendsIconConfig.FRIENDS_CONVERSATION_TIME_SCALE;
    }

    if (
      this.friendsConversationActiveSide !== null &&
      elapsedSeconds >= this.friendsConversationTypingUntil
    ) {
      const step = FRIENDS_CONVERSATION_SCRIPT[this.friendsConversationStepIndex];
      const gapAfter = this.getFriendsConversationGapAfter(this.friendsConversationStepIndex);
      this.showFriendsConversationMessage(step.side, step.message, elapsedSeconds);
      this.stopFriendsConversationTyping(step.side, elapsedSeconds);
      this.friendsConversationActiveSide = null;
      this.friendsConversationStepIndex =
        (this.friendsConversationStepIndex + 1) % FRIENDS_CONVERSATION_SCRIPT.length;
      this.friendsConversationNextActionAt = elapsedSeconds + gapAfter;
    }

    if (
      this.friendsConversationActiveSide === null &&
      elapsedSeconds >= this.friendsConversationNextActionAt
    ) {
      const step = FRIENDS_CONVERSATION_SCRIPT[this.friendsConversationStepIndex];
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

  private hasFriendsFadingBubbles(
    bubbles: Array<{ id: number; text: string; createdAt: number }>,
    elapsedSeconds: number
  ): boolean {
    const fadeStart = FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION;
    const fadeEnd = fadeStart + FriendsIconConfig.FRIENDS_MESSAGE_FADE_DURATION;
    for (const bubble of bubbles) {
      const age = elapsedSeconds - bubble.createdAt;
      if (age > fadeStart && age <= fadeEnd) {
        return true;
      }
    }
    return false;
  }

  private shouldAnimateFriendsTextures(elapsedSeconds: number): boolean {
    if (this.friendsTypingIndicatorActive || this.friendsLeftTypingIndicatorActive) {
      return true;
    }
    if (this.friendsMessageTranslateAnimating || this.friendsLeftMessageTranslateAnimating) {
      return true;
    }
    if (this.hasFriendsFadingBubbles(this.friendsOverheadBubbles, elapsedSeconds)) {
      return true;
    }
    if (this.hasFriendsFadingBubbles(this.friendsLeftOverheadBubbles, elapsedSeconds)) {
      return true;
    }
    return false;
  }

  private getFriendsVisualStateKey(): string {
    const rightBubbleIds = this.friendsOverheadBubbles.map((bubble) => bubble.id).join(',');
    const leftBubbleIds = this.friendsLeftOverheadBubbles.map((bubble) => bubble.id).join(',');
    return [
      this.friendsTypingIndicatorActive ? '1' : '0',
      this.friendsLeftTypingIndicatorActive ? '1' : '0',
      Math.round(this.friendsMessageTranslateY * 1000),
      Math.round(this.friendsLeftMessageTranslateY * 1000),
      rightBubbleIds,
      leftBubbleIds,
    ].join('|');
  }

  private renderFriendsLeftFloatingChat(elapsedSeconds: number): void {
    if (!this.friendsLeftFloatingChatContext) {
      return;
    }

    const ctx = this.friendsLeftFloatingChatContext;
    const pixelWidth = ctx.canvas.width;
    const pixelHeight = ctx.canvas.height;
    const width = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_WIDTH;
    const height = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_HEIGHT;
    const scaleX = pixelWidth / width;
    const scaleY = pixelHeight / height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    const parentWidth = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_WIDTH;
    const parentPaddingX = FriendsIconConfig.FRIENDS_MESSAGE_PARENT_PADDING_X;
    const messageAreaWidth = parentWidth - parentPaddingX * 2;

    if (this.friendsLeftTypingIndicatorActive) {
      const indicatorWidth = FriendsIconConfig.FRIENDS_TYPING_INDICATOR_WIDTH;
      const indicatorHeight = FriendsIconConfig.FRIENDS_TYPING_INDICATOR_BODY_HEIGHT;
      const indicatorX = Math.round((parentWidth - indicatorWidth) * 0.5);
      const indicatorY = Math.round(height - indicatorHeight - FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT);

      this.drawFriendsBubble(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 1, true);

      const dotAppearDuration = FriendsIconConfig.FRIENDS_DOT_APPEAR_DURATION;
      const pauseDuration = FriendsIconConfig.FRIENDS_DOT_PAUSE_DURATION;
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
    const labelMinWidth = FriendsIconConfig.FRIENDS_MESSAGE_LABEL_MIN_WIDTH;
    const labelPaddingX = FriendsIconConfig.FRIENDS_MESSAGE_LABEL_PADDING_X;
    const bubbleHeight = FriendsIconConfig.FRIENDS_MESSAGE_MIN_HEIGHT;
    let currentBottom = height - FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT + this.friendsLeftMessageTranslateY;
    const newestIndex = this.friendsLeftOverheadBubbles.length - 1;

    for (let i = newestIndex; i >= 0; i--) {
      const bubble = this.friendsLeftOverheadBubbles[i];
      const age = elapsedSeconds - bubble.createdAt;
      const bubbleOpacity =
        age <= FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION
          ? 1
          : THREE.MathUtils.clamp(
              1 -
                (age - FriendsIconConfig.FRIENDS_MESSAGE_DISPLAY_DURATION) /
                  FriendsIconConfig.FRIENDS_MESSAGE_FADE_DURATION,
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
      const tailHeight = showTail ? FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT : 0;
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

      currentBottom = bubbleY - FriendsIconConfig.FRIENDS_MESSAGE_STACK_GAP;
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
      const tailWidth = FriendsIconConfig.FRIENDS_BUBBLE_TAIL_WIDTH;
      const tailHeight = FriendsIconConfig.FRIENDS_BUBBLE_TAIL_HEIGHT;
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
      FriendsIconConfig.FRIENDS_SOCIAL_PANEL_BASE_WIDTH * FriendsIconConfig.FRIENDS_SOCIAL_PANEL_RENDER_SCALE;
    canvas.height =
      FriendsIconConfig.FRIENDS_SOCIAL_PANEL_BASE_HEIGHT * FriendsIconConfig.FRIENDS_SOCIAL_PANEL_RENDER_SCALE;
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
    const width = FriendsIconConfig.FRIENDS_SOCIAL_PANEL_BASE_WIDTH;
    const height = FriendsIconConfig.FRIENDS_SOCIAL_PANEL_BASE_HEIGHT;
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
}
