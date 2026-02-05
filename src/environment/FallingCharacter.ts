import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class FallingCharacter {
  private scene: THREE.Scene;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Group | null = null;
  private loaded: boolean = false;
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];

  private spinSpeed: number = 1.2; // rad/s

  // Selected variants
  private selectedHair: string;
  private selectedOutfit: string;
  private hairColor: THREE.Color;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.selectedHair = String(Math.floor(Math.random() * 5) + 1).padStart(3, '0');
    this.selectedOutfit = String(Math.floor(Math.random() * 5) + 2).padStart(3, '0'); // outfits 2-6, skip 001 (underwear)

    // Random hair color using full RGB spectrum with varied saturation
    this.hairColor = new THREE.Color();
    this.hairColor.setHSL(
      Math.random(),                    // Hue: full spectrum 0-1
      0.3 + Math.random() * 0.7,        // Saturation: 0.3-1.0
      0.3 + Math.random() * 0.4         // Lightness: 0.3-0.7 (avoid too dark/bright)
    );
  }

  async load(
    modelPath: string,
    animationPath?: string,
    scale: number = 0.025
  ): Promise<void> {
    const textureLoader = new THREE.TextureLoader();
    const fbxLoader = new FBXLoader();

    // Load all needed textures and create material name -> texture mapping
    const textureMap: { [matName: string]: THREE.Texture } = {};

    const textureFiles: { matName: string; path: string }[] = [
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

    await Promise.all(textureFiles.map(async ({ matName, path }) => {
      try {
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(path, resolve, undefined, reject);
        });
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        textureMap[matName] = texture;
        this.textures.push(texture);
      } catch (e) {
        console.warn(`Failed to load texture: ${path}`);
      }
    }));

    return new Promise((resolve, reject) => {
      fbxLoader.load(
        modelPath,
        (fbx) => {
          this.model = fbx;
          this.model.scale.setScalar(scale);
          this.model.position.set(0, 0, 0);

          // Process meshes
          this.model.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
              const meshName = child.name.toLowerCase();
              const matName = Array.isArray(child.material)
                ? child.material.map(m => m.name.toLowerCase()).join(' ')
                : child.material?.name?.toLowerCase() || '';

              // Check if this is a weapon (hide it)
              if (matName.includes('m_pistol') || matName.includes('m_sword')) {
                child.visible = false;
                return;
              }

              // Check hair variant - hide non-selected
              const hairMatch = meshName.match(/hair[_]?(\d{3})/);
              if (hairMatch && hairMatch[1] !== this.selectedHair) {
                child.visible = false;
                return;
              }

              // Check outfit variant - hide non-selected
              const outfitMatch = meshName.match(/outfit[_]?(\d{3})/);
              if (outfitMatch && outfitMatch[1] !== this.selectedOutfit) {
                child.visible = false;
                return;
              }

              // Body visibility logic:
              // - "Body" (no number) = full body, only for outfit 001
              // - "Body_Cut_XXX" = body cut for outfit XXX
              if (meshName === 'body' && !matName.includes('m_pistol')) {
                // Full body mesh - only show for outfit 001
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

              // Handle materials
              if (Array.isArray(child.material)) {
                // Multi-material mesh
                child.material = child.material.map((mat) => {
                  return this.createMaterialForName(mat.name.toLowerCase(), textureMap, mat);
                });
              } else if (child.material) {
                // Single material mesh
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
    // Direct match only
    const texture = textureMap[matName] || null;

    if (!texture) {
      console.warn('No texture for material:', matName);
    }

    // Clone the texture to apply per-material UV transforms
    let materialTexture = texture;
    if (texture && originalMat) {
      materialTexture = texture.clone();

      // Try to get UV transform from original material
      const origMat = originalMat as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial | THREE.MeshBasicMaterial;
      if (origMat.map) {
        materialTexture.offset.copy(origMat.map.offset);
        materialTexture.repeat.copy(origMat.map.repeat);
        materialTexture.rotation = origMat.map.rotation;
        materialTexture.center.copy(origMat.map.center);
      }
    }

    // Check if this material needs transparency (hair, eyelids, etc.)
    const isHair = matName.includes('hair');
    const needsTransparency = isHair ||
                              matName.includes('eyelid') ||
                              matName.includes('eyelash');

    const material = new THREE.MeshStandardMaterial({
      map: materialTexture,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: needsTransparency,
      alphaTest: needsTransparency ? 0.5 : 0,
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

  private elapsed: number = 0;

  update(delta: number): void {
    this.elapsed += delta;

    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.model) {
      this.model.rotation.y += this.spinSpeed * delta;
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
  }
}
