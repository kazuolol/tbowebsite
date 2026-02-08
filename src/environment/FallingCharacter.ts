import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export interface CharacterConfig {
  gender: 'male' | 'female';
  hair: string;
  outfit: string;
  hairColor: THREE.Color;
}

export class FallingCharacter {
  private scene: THREE.Scene;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Group | null = null;
  private loaded: boolean = false;
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
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

  static async loadTextures(gender: 'male' | 'female' = 'female'): Promise<{ [matName: string]: THREE.Texture }> {
    const textureLoader = new THREE.TextureLoader();
    const textureMap: { [matName: string]: THREE.Texture } = {};
    const files = gender === 'male' ? FallingCharacter.maleTextureFiles : FallingCharacter.femaleTextureFiles;

    await Promise.all(files.map(async ({ matName, path }) => {
      try {
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(path, resolve, undefined, reject);
        });
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        textureMap[matName] = texture;
      } catch (e) {
        console.warn(`Failed to load texture: ${path}`);
      }
    }));

    return textureMap;
  }

  static async loadAnimationClip(animPath: string): Promise<THREE.AnimationClip> {
    const loader = new FBXLoader();
    return new Promise((resolve, reject) => {
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
    });
  }

  // ── Clone-based initialization (used by CharacterPool) ──────────

  initFromClone(
    clonedModel: THREE.Group,
    textureMap: { [matName: string]: THREE.Texture },
    animClip: THREE.AnimationClip,
    scale: number
  ): void {
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

  private applyVariantConfig(textureMap: { [matName: string]: THREE.Texture }): void {
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
    for (const tex of Object.values(textureMap)) {
      this.textures.push(tex);
    }

    const fbxLoader = new FBXLoader();

    return new Promise((resolve, reject) => {
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
    });
  }

  private createMaterialForName(
    matName: string,
    textureMap: { [key: string]: THREE.Texture },
    originalMat?: THREE.Material
  ): THREE.MeshStandardMaterial {
    const texture = textureMap[matName] || null;

    if (!texture) {
      console.warn('No texture for material:', matName);
    }

    let materialTexture: THREE.Texture | null = null;
    if (texture) {
      materialTexture = texture.clone();

      if (originalMat) {
        const origMat = originalMat as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial | THREE.MeshBasicMaterial;
        if (origMat.map) {
          materialTexture.offset.copy(origMat.map.offset);
          materialTexture.repeat.copy(origMat.map.repeat);
          materialTexture.rotation = origMat.map.rotation;
          materialTexture.center.copy(origMat.map.center);
        }
      }
    }

    const isHair = matName.includes('hair');
    const needsTransparency = matName.includes('eyelid') ||
                              matName.includes('eyelash');

    const material = new THREE.MeshStandardMaterial({
      map: materialTexture,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: needsTransparency,
      alphaTest: (isHair || needsTransparency) ? 0.5 : 0,
      color: isHair ? this.hairColor : undefined,
    });

    this.materials.push(material);
    return material;
  }

  private async loadAnimation(animationPath: string): Promise<void> {
    if (!this.model || !this.mixer) {
      throw new Error('Model must be loaded before loading animations');
    }

    const loader = new FBXLoader();

    return new Promise((resolve, reject) => {
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
    });
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
    for (const mat of this.materials) {
      if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
        mat.map.dispose();
      }
      mat.dispose();
    }
    for (const tex of this.textures) {
      tex.dispose();
    }
    this.materials = [];
    this.textures = [];
    this.mixer = null;
    this.model = null;
    this.clipBoundsReady = false;
    this.clipMinY = 0;
    this.clipMaxY = 0;
    this.orbitAnchorHipBone = null;
    this.orbitAnchorUpperBone = null;
  }
}
