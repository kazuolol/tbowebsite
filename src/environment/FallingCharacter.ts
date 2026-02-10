import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { withFbxWarningFilter } from './fbxWarningFilter';

export interface CharacterConfig {
  gender: 'male' | 'female';
  hair: string;
  outfit: string;
  hairColor: THREE.Color;
}

export interface CharacterTextureLoadOptions {
  downscaleFactor?: number;
  maxTextureSize?: number;
}

type CharacterTextureMap = Record<string, THREE.Texture>;

interface SharedTextureVariantEntry {
  texture: THREE.Texture;
  refCount: number;
  disposeWithEntry: boolean;
}

export class FallingCharacter {
  private scene: THREE.Scene;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Group | null = null;
  private loaded: boolean = false;
  private materials: THREE.Material[] = [];
  private ownsBaseTextures = false;
  private ownedBaseTextures = new Set<THREE.Texture>();
  private acquiredTextureVariantRefCounts = new Map<string, number>();
  private clipMinY = 0;
  private clipMaxY = 0;
  private clipBoundsReady = false;
  private clipBoundsBox = new THREE.Box3();
  private clipBoundsMeshBox = new THREE.Box3();
  private orbitAnchorHipBone: THREE.Bone | null = null;
  private orbitAnchorUpperBone: THREE.Bone | null = null;
  private orbitAnchorHipPos = new THREE.Vector3();
  private orbitAnchorUpperPos = new THREE.Vector3();

  private spinSpeed: number = 0.45; // rad/s

  // Selected variants
  private gender: 'male' | 'female';
  private selectedHair: string;
  private selectedOutfit: string;
  private hairColor: THREE.Color;

  constructor(scene: THREE.Scene, config?: CharacterConfig) {
    this.scene = scene;

    if (config) {
      this.gender = config.gender;
      this.selectedHair = config.hair;
      this.selectedOutfit = config.outfit;
      this.hairColor = config.hairColor;
    } else {
      this.gender = 'female';
      this.selectedHair = String(Math.floor(Math.random() * 5) + 1).padStart(3, '0');
      this.selectedOutfit = String(Math.floor(Math.random() * 5) + 2).padStart(3, '0'); // outfits 2-6, skip 001 (underwear)

      this.hairColor = new THREE.Color();
      this.hairColor.setHSL(
        Math.random(),
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.4
      );
    }
  }

  // ── Static shared loaders ────────────────────────────────────────

  private static readonly femaleTextureFiles: { matName: string; path: string }[] = [
    { matName: 'm_youghfemale_face', path: '/textures/Face.jpg' },
    { matName: 'm_youghfemale_eye', path: '/textures/Face.jpg' },
    { matName: 'm_youghfemale_eyeball', path: '/textures/Face.jpg' },
    { matName: 'm_youghfemale_eyelids', path: '/textures/Face.jpg' },
    { matName: 'm_youghfemale_body', path: '/textures/T_YoughFemale_Body_Basecolor.jpg' },
    { matName: 'm_youghfemale_hair_001', path: '/textures/T_YoughFemale_Hair_001_Basecolor.png' },
    { matName: 'm_youghfemale_hair_002', path: '/textures/T_YoughFemale_Hair_002_Basecolor.png' },
    { matName: 'm_youghfemale_hair_003', path: '/textures/T_YoughFemale_Hair_003_Basecolor.png' },
    { matName: 'm_youghfemale_hair_004', path: '/textures/T_YoughFemale_Hair_004_Basecolor.png' },
    { matName: 'm_youghfemale_hair_005', path: '/textures/T_YoughFemale_Hair_005_Basecolor.png' },
    { matName: 'm_youghfemale_hairbands', path: '/textures/T_YoughFemale_Hair_002_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_001', path: '/textures/T_YoughFemale_Outfit_001_Underwear_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_002', path: '/textures/T_YoughFemale_Outfit_002_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_003', path: '/textures/T_YoughFemale_Outfit_003_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_004', path: '/textures/T_YoughFemale_Outfit_004_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_005', path: '/textures/T_YoughFemale_Outfit_005_Basecolor.png' },
    { matName: 'm_youghfemale_outfit_006', path: '/textures/T_YoughFemale_Outfit_006_BaseColor.png' },
  ];

  private static readonly maleTextureFiles: { matName: string; path: string }[] = [
    { matName: 'm_youghmale_face', path: '/textures/T_YoughMale_Face_Basecolor.png' },
    { matName: 'm_youghmale_eye', path: '/textures/T_YoughMale_Face_Basecolor.png' },
    { matName: 'm_youghmale_eyeball', path: '/textures/T_YoughMale_Face_Basecolor.png' },
    { matName: 'm_youghmale_eyelids', path: '/textures/T_YoughMale_Face_Basecolor.png' },
    { matName: 'm_youghmale_body', path: '/textures/T_YoughMale_Body_Basecolor.png' },
    { matName: 'm_youghmale_hair_001', path: '/textures/T_YoughMale_Hair_001_Basecolor.png' },
    { matName: 'm_youghmale_hair_002', path: '/textures/T_YoughMale_Hair_002_Basecolor.png' },
    { matName: 'm_youghmale_hair_003', path: '/textures/T_YoughMale_Hair_003_Basecolor.png' },
    { matName: 'm_youghmale_hair_004', path: '/textures/T_YoughMale_Hair_004_Basecolor.png' },
    { matName: 'm_youghmale_hair_005', path: '/textures/T_YoughMale_Hair_005_Basecolor.png' },
    { matName: 'm_youghmale_outfit_001', path: '/textures/T_YoughMale_Outfit_001_Basecolor.png' },
    { matName: 'm_youghmale_outfit_002', path: '/textures/T_YoughMale_Outfit_002_Basecolor.png' },
    { matName: 'm_youghmale_outfit_003', path: '/textures/T_YoughMale_Outfit_003_Basecolor.png' },
    { matName: 'm_youghmale_outfit_004', path: '/textures/T_YoughMale_Outfit_004_Basecolor.png' },
    { matName: 'm_youghmale_outfit_005', path: '/textures/T_YoughMale_Outfit_005_Basecolor.png' },
  ];

  private static readonly TEXTURE_SOURCE_PATH_KEY = '__tboSourcePath';
  private static readonly DEFAULT_TEXTURE_VARIANT_KEY = '0,0|1,1|0,0|0|1001|1001';
  private static readonly sharedTextureVariants = new Map<string, SharedTextureVariantEntry>();

  static async loadTextures(
    gender: 'male' | 'female' = 'female',
    options?: CharacterTextureLoadOptions
  ): Promise<CharacterTextureMap> {
    const textureLoader = new THREE.TextureLoader();
    const textureMap: CharacterTextureMap = {};
    const files = gender === 'male' ? FallingCharacter.maleTextureFiles : FallingCharacter.femaleTextureFiles;
    const uniquePaths = [...new Set(files.map((file) => file.path))];
    const texturesByPath = new Map<string, THREE.Texture>();

    await Promise.all(
      uniquePaths.map(async (path) => {
        try {
          const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(path, resolve, undefined, reject);
          });
          loadedTexture.flipY = true;
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          (loadedTexture.userData as Record<string, unknown>)[
            FallingCharacter.TEXTURE_SOURCE_PATH_KEY
          ] = path;
          const optimizedTexture = FallingCharacter.optimizeTextureForTier(
            loadedTexture,
            options
          );
          (optimizedTexture.userData as Record<string, unknown>)[
            FallingCharacter.TEXTURE_SOURCE_PATH_KEY
          ] = path;
          texturesByPath.set(path, optimizedTexture);
        } catch (error) {
          console.warn(`Failed to load texture: ${path}`, error);
        }
      })
    );

    for (const { matName, path } of files) {
      const texture = texturesByPath.get(path);
      if (texture) {
        textureMap[matName] = texture;
      }
    }

    return textureMap;
  }

  private static optimizeTextureForTier(
    texture: THREE.Texture,
    options?: CharacterTextureLoadOptions
  ): THREE.Texture {
    if (typeof document === 'undefined') {
      return texture;
    }

    const downscaleFactor = THREE.MathUtils.clamp(options?.downscaleFactor ?? 1, 0.05, 1);
    const maxTextureSizeOption = options?.maxTextureSize;
    const maxTextureSize =
      typeof maxTextureSizeOption === 'number' && Number.isFinite(maxTextureSizeOption)
        ? Math.max(1, Math.floor(maxTextureSizeOption))
        : Number.POSITIVE_INFINITY;
    if (downscaleFactor >= 0.999 && !Number.isFinite(maxTextureSize)) {
      return texture;
    }

    const image = texture.image as { width?: number; height?: number } | undefined;
    const sourceWidth = image?.width;
    const sourceHeight = image?.height;
    if (
      typeof sourceWidth !== 'number' ||
      typeof sourceHeight !== 'number' ||
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return texture;
    }

    let targetWidth = Math.max(1, Math.floor(sourceWidth * downscaleFactor));
    let targetHeight = Math.max(1, Math.floor(sourceHeight * downscaleFactor));

    if (Number.isFinite(maxTextureSize) && (targetWidth > maxTextureSize || targetHeight > maxTextureSize)) {
      const clampScale = maxTextureSize / Math.max(targetWidth, targetHeight);
      targetWidth = Math.max(1, Math.floor(targetWidth * clampScale));
      targetHeight = Math.max(1, Math.floor(targetHeight * clampScale));
    }

    if (targetWidth === sourceWidth && targetHeight === sourceHeight) {
      return texture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return texture;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(texture.image as CanvasImageSource, 0, 0, targetWidth, targetHeight);

    const optimized = new THREE.CanvasTexture(canvas);
    optimized.name = texture.name;
    optimized.flipY = texture.flipY;
    optimized.colorSpace = texture.colorSpace;
    optimized.wrapS = texture.wrapS;
    optimized.wrapT = texture.wrapT;
    optimized.magFilter = texture.magFilter;
    optimized.minFilter = texture.minFilter;
    optimized.generateMipmaps = texture.generateMipmaps;
    optimized.anisotropy = texture.anisotropy;
    optimized.needsUpdate = true;

    texture.dispose();
    return optimized;
  }

  static async loadAnimationClip(animPath: string): Promise<THREE.AnimationClip> {
    const loader = new FBXLoader();
    return withFbxWarningFilter(
      () =>
        new Promise((resolve, reject) => {
          loader.load(
            animPath,
            (animFbx) => {
              if (animFbx.animations && animFbx.animations.length > 0) {
                resolve(animFbx.animations[0]);
              } else {
                reject(new Error('No animations found in FBX'));
              }
            },
            undefined,
            (error) => reject(error)
          );
        })
    );
  }

  // ── Clone-based initialization (used by CharacterPool) ──────────

  initFromClone(
    clonedModel: THREE.Group,
    textureMap: CharacterTextureMap,
    animClip: THREE.AnimationClip,
    scale: number
  ): void {
    this.releaseTextureVariants();
    this.resetTextureOwnership();
    this.model = clonedModel;
    this.model.scale.setScalar(scale);
    this.model.position.set(0, 0, 0);
    this.model.traverse((child) => {
      child.layers.set(0);
    });
    this.resolveOrbitAnchorBones();

    this.applyVariantConfig(textureMap);

    this.mixer = new THREE.AnimationMixer(this.model);
    const retargetedClip = this.retargetAnimation(animClip);
    const action = this.mixer.clipAction(retargetedClip);
    action.play();

    this.model.visible = false;
    this.loaded = true;
  }

  setVisible(visible: boolean): void {
    if (this.model) {
      this.model.visible = visible;
    }
  }

  syncTo(rotationY: number, animTime: number): void {
    if (this.model) {
      this.model.rotation.y = rotationY;
    }
    if (this.mixer) {
      this.mixer.setTime(animTime);
    }
  }

  // ── Variant configuration (mesh traversal) ──────────────────────

  private applyVariantConfig(textureMap: CharacterTextureMap): void {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        const meshName = child.name.toLowerCase();
        const matName = Array.isArray(child.material)
          ? child.material.map((m: THREE.Material) => m.name.toLowerCase()).join(' ')
          : child.material?.name?.toLowerCase() || '';

        // Hide weapons
        if (matName.includes('m_pistol') || matName.includes('m_sword')) {
          child.visible = false;
          return;
        }

        // Hide non-selected hair
        const hairMatch = meshName.match(/hair[_]?(\d{3})/);
        if (hairMatch && hairMatch[1] !== this.selectedHair) {
          child.visible = false;
          return;
        }

        // Hide non-selected outfit
        const outfitMatch = meshName.match(/outfit[_]?(\d{3})/);
        if (outfitMatch && outfitMatch[1] !== this.selectedOutfit) {
          child.visible = false;
          return;
        }

        // Body visibility: full body only for outfit 001
        if (meshName === 'body' && !matName.includes('m_pistol')) {
          if (this.selectedOutfit !== '001') {
            child.visible = false;
            return;
          }
        }

        const bodyCutMatch = meshName.match(/body[_]?cut[_]?(\d{3})/i);
        if (bodyCutMatch && bodyCutMatch[1] !== this.selectedOutfit) {
          child.visible = false;
          return;
        }

        // Apply materials
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat: THREE.Material) => {
            return this.createMaterialForName(mat.name.toLowerCase(), textureMap, mat);
          });
        } else if (child.material) {
          child.material = this.createMaterialForName(
            child.material.name.toLowerCase(),
            textureMap,
            child.material
          );
        }

        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  // ── Original load() — standalone use still works ────────────────

  async load(
    modelPath: string,
    animationPath?: string,
    scale: number = 0.025
  ): Promise<void> {
    const textureMap = await FallingCharacter.loadTextures(this.gender);
    this.releaseTextureVariants();
    this.resetTextureOwnership();
    this.ownsBaseTextures = true;
    for (const texture of Object.values(textureMap)) {
      this.ownedBaseTextures.add(texture);
    }

    const fbxLoader = new FBXLoader();

    return withFbxWarningFilter(
      () =>
        new Promise((resolve, reject) => {
          fbxLoader.load(
            modelPath,
            (fbx) => {
              this.model = fbx;
              this.model.scale.setScalar(scale);
              this.model.position.set(0, 0, 0);

              this.applyVariantConfig(textureMap);

              this.scene.add(this.model);
              this.mixer = new THREE.AnimationMixer(this.model);

              if (animationPath) {
                this.loadAnimation(animationPath).then(() => {
                  this.loaded = true;
                  resolve();
                }).catch((err) => {
                  console.error('Animation load failed:', err);
                  this.loaded = true;
                  resolve();
                });
              } else if (fbx.animations && fbx.animations.length > 0) {
                const action = this.mixer.clipAction(fbx.animations[0]);
                action.play();
                this.loaded = true;
                resolve();
              } else {
                this.loaded = true;
                resolve();
              }
            },
            undefined,
            (error) => {
              console.error('Error loading FBX model:', error);
              reject(error);
            }
          );
        })
    );
  }

  private createMaterialForName(
    matName: string,
    textureMap: CharacterTextureMap,
    originalMat?: THREE.Material
  ): THREE.MeshStandardMaterial {
    const baseTexture = textureMap[matName] || null;

    if (!baseTexture) {
      console.warn('No texture for material:', matName);
    }

    let materialTexture: THREE.Texture | null = null;
    if (baseTexture) {
      const sourceMaterial = originalMat as
        | THREE.MeshStandardMaterial
        | THREE.MeshPhongMaterial
        | THREE.MeshBasicMaterial
        | undefined;
      materialTexture = this.acquireTextureVariant(baseTexture, sourceMaterial?.map ?? null);
    }

    const isHair = matName.includes('hair');
    const needsTransparency = matName.includes('eyelid') ||
                              matName.includes('eyelash');

    const materialParams: THREE.MeshStandardMaterialParameters = {
      map: materialTexture,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: needsTransparency,
      alphaTest: (isHair || needsTransparency) ? 0.5 : 0,
    };

    if (isHair) {
      materialParams.color = this.hairColor;
    }

    const material = new THREE.MeshStandardMaterial(materialParams);

    this.materials.push(material);
    return material;
  }

  private acquireTextureVariant(
    baseTexture: THREE.Texture,
    sourceMap: THREE.Texture | null
  ): THREE.Texture {
    const textureId = FallingCharacter.getTextureIdentity(baseTexture);
    const variantKey = `${textureId}|${FallingCharacter.getTextureVariantKey(sourceMap)}`;

    let entry = FallingCharacter.sharedTextureVariants.get(variantKey);
    if (!entry) {
      if (FallingCharacter.isDefaultTextureTransform(sourceMap)) {
        entry = {
          texture: baseTexture,
          refCount: 0,
          disposeWithEntry: false,
        };
      } else if (sourceMap) {
        const variant = baseTexture.clone();
        FallingCharacter.applyTextureTransform(sourceMap, variant);
        variant.needsUpdate = true;
        const sourcePath = FallingCharacter.getTextureSourcePath(baseTexture);
        if (sourcePath) {
          (variant.userData as Record<string, unknown>)[
            FallingCharacter.TEXTURE_SOURCE_PATH_KEY
          ] = sourcePath;
        }
        entry = {
          texture: variant,
          refCount: 0,
          disposeWithEntry: true,
        };
      } else {
        entry = {
          texture: baseTexture,
          refCount: 0,
          disposeWithEntry: false,
        };
      }
      FallingCharacter.sharedTextureVariants.set(variantKey, entry);
    }

    entry.refCount += 1;
    this.acquiredTextureVariantRefCounts.set(
      variantKey,
      (this.acquiredTextureVariantRefCounts.get(variantKey) ?? 0) + 1
    );
    return entry.texture;
  }

  private releaseTextureVariants(): void {
    for (const [key, count] of this.acquiredTextureVariantRefCounts) {
      FallingCharacter.releaseTextureVariant(key, count);
    }
    this.acquiredTextureVariantRefCounts.clear();
  }

  private resetTextureOwnership(): void {
    if (this.ownsBaseTextures) {
      for (const texture of this.ownedBaseTextures) {
        texture.dispose();
      }
    }
    this.ownedBaseTextures.clear();
    this.ownsBaseTextures = false;
  }

  private static releaseTextureVariant(key: string, count: number): void {
    const entry = FallingCharacter.sharedTextureVariants.get(key);
    if (!entry) {
      return;
    }

    entry.refCount = Math.max(0, entry.refCount - Math.max(1, count));
    if (entry.refCount > 0) {
      return;
    }

    if (entry.disposeWithEntry) {
      entry.texture.dispose();
    }
    FallingCharacter.sharedTextureVariants.delete(key);
  }

  private static getTextureSourcePath(texture: THREE.Texture): string | null {
    const sourcePath = (texture.userData as Record<string, unknown>)[
      FallingCharacter.TEXTURE_SOURCE_PATH_KEY
    ];
    if (typeof sourcePath === 'string' && sourcePath.length > 0) {
      return sourcePath;
    }
    return null;
  }

  private static getTextureIdentity(texture: THREE.Texture): string {
    return FallingCharacter.getTextureSourcePath(texture) ?? texture.uuid;
  }

  private static getTextureVariantKey(sourceMap: THREE.Texture | null): string {
    if (!sourceMap) {
      return FallingCharacter.DEFAULT_TEXTURE_VARIANT_KEY;
    }

    return [
      sourceMap.offset.x.toFixed(4),
      sourceMap.offset.y.toFixed(4),
      sourceMap.repeat.x.toFixed(4),
      sourceMap.repeat.y.toFixed(4),
      sourceMap.center.x.toFixed(4),
      sourceMap.center.y.toFixed(4),
      sourceMap.rotation.toFixed(4),
      String(sourceMap.wrapS),
      String(sourceMap.wrapT),
    ].join('|');
  }

  private static isDefaultTextureTransform(sourceMap: THREE.Texture | null): boolean {
    if (!sourceMap) {
      return true;
    }

    const epsilon = 1e-6;
    return (
      Math.abs(sourceMap.offset.x) <= epsilon &&
      Math.abs(sourceMap.offset.y) <= epsilon &&
      Math.abs(sourceMap.repeat.x - 1) <= epsilon &&
      Math.abs(sourceMap.repeat.y - 1) <= epsilon &&
      Math.abs(sourceMap.center.x) <= epsilon &&
      Math.abs(sourceMap.center.y) <= epsilon &&
      Math.abs(sourceMap.rotation) <= epsilon &&
      sourceMap.wrapS === THREE.ClampToEdgeWrapping &&
      sourceMap.wrapT === THREE.ClampToEdgeWrapping
    );
  }

  private static applyTextureTransform(source: THREE.Texture, target: THREE.Texture): void {
    target.offset.copy(source.offset);
    target.repeat.copy(source.repeat);
    target.center.copy(source.center);
    target.rotation = source.rotation;
    target.wrapS = source.wrapS;
    target.wrapT = source.wrapT;
    target.flipY = source.flipY;
    target.anisotropy = source.anisotropy;
    target.minFilter = source.minFilter;
    target.magFilter = source.magFilter;
    target.generateMipmaps = source.generateMipmaps;
    target.matrixAutoUpdate = source.matrixAutoUpdate;
    target.matrix.copy(source.matrix);
  }

  private async loadAnimation(animationPath: string): Promise<void> {
    if (!this.model || !this.mixer) {
      throw new Error('Model must be loaded before loading animations');
    }

    const loader = new FBXLoader();

    return withFbxWarningFilter(
      () =>
        new Promise((resolve, reject) => {
          loader.load(
            animationPath,
            (animFbx) => {
              if (animFbx.animations && animFbx.animations.length > 0) {
                const clip = animFbx.animations[0];
                const retargetedClip = this.retargetAnimation(clip);
                const action = this.mixer!.clipAction(retargetedClip);
                action.play();
              }
              resolve();
            },
            undefined,
            (error) => {
              console.error('Error loading animation:', error);
              reject(error);
            }
          );
        })
    );
  }

  private retargetAnimation(clip: THREE.AnimationClip): THREE.AnimationClip {
    if (!this.model) return clip;

    const boneNames = new Set<string>();
    this.model.traverse((child) => {
      boneNames.add(child.name);
    });

    const tracks: THREE.KeyframeTrack[] = [];

    for (const track of clip.tracks) {
      const [bonePath, property] = this.parseTrackName(track.name);
      const targetBone = this.findMatchingBone(bonePath, boneNames);

      if (targetBone) {
        const newTrack = track.clone();
        newTrack.name = `${targetBone}.${property}`;
        tracks.push(newTrack);
      } else {
        tracks.push(track.clone());
      }
    }

    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  private parseTrackName(name: string): [string, string] {
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return [name, ''];
    return [name.substring(0, lastDot), name.substring(lastDot + 1)];
  }

  private findMatchingBone(bonePath: string, boneNames: Set<string>): string | null {
    if (boneNames.has(bonePath)) return bonePath;

    const parts = bonePath.split('/');
    const boneName = parts[parts.length - 1];
    if (boneNames.has(boneName)) return boneName;

    const withoutPrefix = boneName.replace(/^[^:]+:/, '');
    if (boneNames.has(withoutPrefix)) return withoutPrefix;

    for (const name of boneNames) {
      if (name.endsWith(boneName) || name.endsWith(withoutPrefix)) {
        return name;
      }
    }

    return null;
  }

  private findBoneByPriority(priorityNames: readonly string[]): THREE.Bone | null {
    if (!this.model) {
      return null;
    }

    let bestMatch: THREE.Bone | null = null;
    let bestScore = -1;

    this.model.traverse((child) => {
      if (!(child instanceof THREE.Bone)) {
        return;
      }

      const rawName = child.name.toLowerCase();
      const normalized = rawName.replace(/[:\s]/g, '_');
      for (let i = 0; i < priorityNames.length; i += 1) {
        const token = priorityNames[i];
        if (
          normalized === token ||
          normalized.endsWith(`_${token}`) ||
          normalized.includes(token)
        ) {
          const score = priorityNames.length - i;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = child;
          }
          return;
        }
      }
    });

    return bestMatch;
  }

  private resolveOrbitAnchorBones(): void {
    this.orbitAnchorHipBone = this.findBoneByPriority([
      // Shared expected names across male and female rigs.
      'pelvis',
      'hips',
      // Common alternatives in other exports.
      'hip',
      'b_hips',
      'root_hips',
      'root_pelvis',
    ]);

    this.orbitAnchorUpperBone = this.findBoneByPriority([
      'spine_02',
      'spine2',
      'spine_03',
      'spine3',
      'spine_01',
      'spine1',
      'spine',
    ]);
  }

  private elapsed: number = 0;

  update(delta: number): void {
    this.elapsed += delta;

    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.model) {
      this.model.rotation.y += this.spinSpeed * delta;

      // Populate clip bounds from an animated, visible pose.
      if (this.model.visible && !this.clipBoundsReady) {
        this.refreshClipBounds();
      }
    }
  }

  private refreshClipBounds(): void {
    if (!this.model) return;
    this.model.updateWorldMatrix(true, true);
    this.clipBoundsBox.makeEmpty();

    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh)) {
        return;
      }
      if (!child.visible) {
        return;
      }
      const position = child.geometry?.getAttribute('position');
      if (!position || position.count === 0) {
        return;
      }
      this.clipBoundsMeshBox.setFromObject(child, true);
      if (!this.clipBoundsMeshBox.isEmpty()) {
        this.clipBoundsBox.union(this.clipBoundsMeshBox);
      }
    });

    // Fallback in case a variant has no visible mesh bounds.
    if (this.clipBoundsBox.isEmpty()) {
      this.clipBoundsBox.copy(this.clipBoundsMeshBox.setFromObject(this.model));
    }

    if (this.clipBoundsBox.isEmpty()) {
      this.clipBoundsReady = false;
      return;
    }

    this.clipMinY = this.clipBoundsBox.min.y;
    this.clipMaxY = this.clipBoundsBox.max.y;
    this.clipBoundsReady =
      Number.isFinite(this.clipMinY) &&
      Number.isFinite(this.clipMaxY) &&
      this.clipMaxY > this.clipMinY;
  }

  getClipBounds(): { minY: number; maxY: number } | null {
    if (!this.model) return null;
    if (!this.clipBoundsReady) {
      this.refreshClipBounds();
    }
    if (!this.clipBoundsReady) return null;
    return { minY: this.clipMinY, maxY: this.clipMaxY };
  }

  getOrbitAnchor(target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.model) {
      return null;
    }

    this.model.updateWorldMatrix(true, true);

    if (this.orbitAnchorHipBone && this.orbitAnchorUpperBone) {
      this.orbitAnchorHipBone.getWorldPosition(this.orbitAnchorHipPos);
      this.orbitAnchorUpperBone.getWorldPosition(this.orbitAnchorUpperPos);
      // Favor upper torso so orbit controls stay centered around the body mass.
      target.lerpVectors(this.orbitAnchorHipPos, this.orbitAnchorUpperPos, 0.62);
      return target;
    }

    if (this.orbitAnchorUpperBone) {
      this.orbitAnchorUpperBone.getWorldPosition(target);
      return target;
    }

    if (this.orbitAnchorHipBone) {
      this.orbitAnchorHipBone.getWorldPosition(target);
      target.y += 0.35;
      return target;
    }

    return null;
  }

  getBoundingBox(): THREE.Box3 | null {
    if (!this.model) return null;
    return new THREE.Box3().setFromObject(this.model);
  }

  applyClipPlane(plane: THREE.Plane): void {
    for (const material of this.materials) {
      material.clippingPlanes = [plane];
    }
  }

  removeClipPlane(): void {
    for (const material of this.materials) {
      material.clippingPlanes = null;
    }
  }

  getModel(): THREE.Group | null {
    return this.model;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  dispose(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
          child.geometry?.dispose();
        }
      });
    }
    this.releaseTextureVariants();
    this.resetTextureOwnership();
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];
    this.mixer = null;
    this.model = null;
    this.clipBoundsReady = false;
    this.clipMinY = 0;
    this.clipMaxY = 0;
    this.orbitAnchorHipBone = null;
    this.orbitAnchorUpperBone = null;
  }
}
