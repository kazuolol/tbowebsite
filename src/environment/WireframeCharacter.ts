import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class WireframeCharacter {
  private scene: THREE.Scene;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Group | null = null;
  private wireframeMaterial: THREE.MeshBasicMaterial;
  private loaded: boolean = false;

  constructor(scene: THREE.Scene, wireframeColor: number = 0x1a1a1a) {
    this.scene = scene;
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x999999,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
  }

  async load(
    modelPath: string,
    animationPath?: string,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    scale: number = 0.01
  ): Promise<void> {
    const loader = new FBXLoader();

    return new Promise((resolve, reject) => {
      // Load the model/rig
      loader.load(
        modelPath,
        (fbx) => {
          this.model = fbx;
          this.model.scale.setScalar(scale);
          this.model.position.copy(position);

          // Randomly select one hair style (001-008) and one outfit (001-008)
          const selectedHair = String(Math.floor(Math.random() * 8) + 1).padStart(3, '0');
          const selectedOutfit = String(Math.floor(Math.random() * 7) + 2).padStart(3, '0'); // outfits 2-8, skip 001 (underwear)

          // Apply wireframe material to all meshes, filter weapons and duplicate outfits/hair
          this.model.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
              const name = child.name.toLowerCase();
              const matName = Array.isArray(child.material)
                ? child.material.map(m => m.name.toLowerCase()).join(' ')
                : child.material?.name?.toLowerCase() || '';

              const combined = name + ' ' + matName;

              // Hide weapons
              const isWeapon = ['pistol', 'sword', 'gun', 'weapon'].some(kw =>
                combined.includes(kw)
              );

              // Check if this is a hair mesh
              const hairMatch = combined.match(/hair[_\s]*(\d{3})/);
              const isHair = hairMatch !== null || combined.includes('hairband');
              const isSelectedHair = hairMatch && hairMatch[1] === selectedHair;

              // Check if this is an outfit mesh
              const outfitMatch = combined.match(/ou[t]?fit[_\s]*(\d{3})/);
              const isOutfit = outfitMatch !== null;
              const isSelectedOutfit = outfitMatch && outfitMatch[1] === selectedOutfit;

              // Hide if weapon, or non-selected hair/outfit variant
              const shouldHide = isWeapon ||
                                 (isHair && !isSelectedHair) ||
                                 (isOutfit && !isSelectedOutfit);

              if (shouldHide) {
                child.visible = false;
              } else {
                child.userData.originalMaterial = child.material;
                child.material = this.wireframeMaterial;
                child.castShadow = false;
                child.receiveShadow = false;
              }
            }
          });

          this.scene.add(this.model);

          // Set up animation mixer
          this.mixer = new THREE.AnimationMixer(this.model);


          // Always try to load separate animation if provided
          if (animationPath) {
            // Load separate animation file
            this.loadAnimation(animationPath).then(() => {
              this.loaded = true;
              resolve();
            }).catch((err) => {
              console.error('Animation load failed:', err);
              this.loaded = true;
              resolve(); // Still resolve, just without animation
            });
          } else if (fbx.animations && fbx.animations.length > 0) {
            // Use embedded animations
            const action = this.mixer.clipAction(fbx.animations[0]);
            action.play();
            this.loaded = true;
            resolve();
          } else {
            this.loaded = true;
            resolve();
          }
        },
        (progress) => {
          // Loading progress
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading model: ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error('Error loading FBX model:', error);
          reject(error);
        }
      );
    });
  }

  async loadAnimation(animationPath: string): Promise<void> {
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

            // Retarget animation tracks to match model skeleton
            // FBX animations often have track names like "mixamorig:Hips.position"
            // We need to find matching bones in our model
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

    // Build a map of bone names in our model
    const boneNames = new Set<string>();
    this.model.traverse((child) => {
      boneNames.add(child.name);
    });


    // Clone and retarget tracks
    const tracks: THREE.KeyframeTrack[] = [];

    for (const track of clip.tracks) {
      // Track name format: "boneName.property" (e.g., "Hips.position")
      const [bonePath, property] = this.parseTrackName(track.name);

      // Try to find matching bone - check various name formats
      let targetBone = this.findMatchingBone(bonePath, boneNames);

      if (targetBone) {
        // Clone track with corrected name
        const newTrack = track.clone();
        newTrack.name = `${targetBone}.${property}`;
        tracks.push(newTrack);
      } else {
        // Keep original track, might still work
        tracks.push(track.clone());
      }
    }

    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  private parseTrackName(name: string): [string, string] {
    // Handle formats like "boneName.position" or "path/to/bone.quaternion"
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return [name, ''];

    const property = name.substring(lastDot + 1);
    const bonePath = name.substring(0, lastDot);

    return [bonePath, property];
  }

  private findMatchingBone(bonePath: string, boneNames: Set<string>): string | null {
    // Direct match
    if (boneNames.has(bonePath)) return bonePath;

    // Try just the bone name (last part of path)
    const parts = bonePath.split('/');
    const boneName = parts[parts.length - 1];
    if (boneNames.has(boneName)) return boneName;

    // Try without namespace prefix (e.g., "mixamorig:" or "Character:")
    const withoutPrefix = boneName.replace(/^[^:]+:/, '');
    if (boneNames.has(withoutPrefix)) return withoutPrefix;

    // Search for partial match
    for (const name of boneNames) {
      if (name.endsWith(boneName) || name.endsWith(withoutPrefix)) {
        return name;
      }
    }

    return null;
  }

  update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  setPosition(position: THREE.Vector3): void {
    if (this.model) {
      this.model.position.copy(position);
    }
  }

  getPosition(): THREE.Vector3 | null {
    return this.model ? this.model.position.clone() : null;
  }

  setRotation(y: number): void {
    if (this.model) {
      this.model.rotation.y = y;
    }
  }

  setOpacity(opacity: number): void {
    this.wireframeMaterial.opacity = opacity;
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
    this.wireframeMaterial.dispose();
    this.mixer = null;
    this.model = null;
  }
}
