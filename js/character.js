import * as THREE from 'three';
import { getScene } from './scene.js';

let sprite;
let targetX = null;
let isWalking = false;
let facingRight = true;
let walkSpeed = 1200; // pixels per second
let onArrivalCallback = null;

// Animation
let idleTexture, walkTexture;
let walkFrameCount = 6;
let currentFrame = 0;
let frameTime = 0;
let frameDuration = 0.1; // seconds per frame

// Bounds
let minX = -1800;
let maxX = 1800;
let floorY = -700;

// Character dimensions (scaled 3.6x for background proportion)
const idleWidth = 461;   // 128 * 3.6
const idleHeight = 922;  // 256 * 3.6
const walkWidth = 315;   // 480 * 0.657 (scaled to match idle height)
const walkHeight = 922;  // 1403 * 0.657 (matches idle height)

export async function initCharacter(startX = 0, floorYPos = -700) {
  floorY = floorYPos;

  const scene = getScene();

  // Create placeholder texture (colored rectangle)
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Draw placeholder character
  ctx.fillStyle = '#00ffd0';
  ctx.fillRect(32, 0, 64, 200);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(48, 20, 32, 32); // Head area

  const placeholderTexture = new THREE.CanvasTexture(canvas);
  placeholderTexture.magFilter = THREE.NearestFilter;
  placeholderTexture.minFilter = THREE.NearestFilter;

  idleTexture = placeholderTexture;
  walkTexture = placeholderTexture;

  // Create sprite
  const material = new THREE.SpriteMaterial({
    map: idleTexture,
    transparent: true
  });

  sprite = new THREE.Sprite(material);
  sprite.scale.set(idleWidth, idleHeight, 1);
  sprite.position.set(startX, floorY + idleHeight / 2, 0);

  scene.add(sprite);

  return sprite;
}

export async function loadCharacterSprites(idleUrl, walkUrl, frameCount = 8) {
  const loader = new THREE.TextureLoader();
  walkFrameCount = frameCount;

  // Load idle texture
  if (idleUrl) {
    try {
      idleTexture = await new Promise((resolve, reject) => {
        loader.load(idleUrl, resolve, undefined, reject);
      });
      idleTexture.magFilter = THREE.NearestFilter;
      idleTexture.minFilter = THREE.NearestFilter;
      idleTexture.colorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn('Could not load idle sprite, using placeholder');
    }
  }

  // Load walk texture (spritesheet)
  if (walkUrl) {
    try {
      walkTexture = await new Promise((resolve, reject) => {
        loader.load(walkUrl, resolve, undefined, reject);
      });
      walkTexture.magFilter = THREE.NearestFilter;
      walkTexture.minFilter = THREE.NearestFilter;
      walkTexture.colorSpace = THREE.SRGBColorSpace;
      walkTexture.repeat.set(1 / walkFrameCount, 1);
    } catch (e) {
      console.warn('Could not load walk sprite, using placeholder');
    }
  }

  // Apply idle texture
  if (sprite && idleTexture) {
    sprite.material.map = idleTexture;
    sprite.material.needsUpdate = true;
  }
}

export function walkTo(x, callback = null) {
  // Clamp to walkable area
  targetX = Math.max(minX, Math.min(maxX, x));
  isWalking = true;
  onArrivalCallback = callback;

  // Determine direction and switch to walk dimensions
  if (targetX > sprite.position.x) {
    facingRight = true;
  } else if (targetX < sprite.position.x) {
    facingRight = false;
  }
  sprite.scale.set(walkWidth, walkHeight, 1);

  // Switch to walk animation with correct facing
  if (walkTexture && walkTexture !== idleTexture) {
    sprite.material.map = walkTexture;
    // Flip texture for direction
    if (facingRight) {
      walkTexture.repeat.set(1 / walkFrameCount, 1);
      walkTexture.offset.x = currentFrame / walkFrameCount;
    } else {
      walkTexture.repeat.set(-1 / walkFrameCount, 1);
      walkTexture.offset.x = (currentFrame + 1) / walkFrameCount;
    }
    sprite.material.needsUpdate = true;
  }
}

export function update(deltaTime) {
  if (!sprite) return;

  if (isWalking && targetX !== null) {
    const direction = targetX > sprite.position.x ? 1 : -1;
    const distance = Math.abs(targetX - sprite.position.x);
    const moveAmount = walkSpeed * deltaTime;

    if (distance <= moveAmount) {
      // Arrived
      sprite.position.x = targetX;
      isWalking = false;
      targetX = null;

      // Switch to idle with idle dimensions
      if (idleTexture) {
        sprite.material.map = idleTexture;
        // Flip texture for direction
        if (facingRight) {
          idleTexture.repeat.set(1, 1);
          idleTexture.offset.x = 0;
        } else {
          idleTexture.repeat.set(-1, 1);
          idleTexture.offset.x = 1;
        }
        sprite.material.needsUpdate = true;
        sprite.scale.set(idleWidth, idleHeight, 1);
      }

      // Callback on arrival
      if (onArrivalCallback) {
        const cb = onArrivalCallback;
        onArrivalCallback = null;
        cb();
      }
    } else {
      sprite.position.x += direction * moveAmount;

      // Animate walk cycle
      frameTime += deltaTime;
      if (frameTime >= frameDuration) {
        frameTime = 0;
        currentFrame = (currentFrame + 1) % walkFrameCount;

        if (walkTexture && walkTexture.repeat) {
          if (facingRight) {
            walkTexture.offset.x = currentFrame / walkFrameCount;
          } else {
            walkTexture.offset.x = (currentFrame + 1) / walkFrameCount;
          }
        }
      }
    }
  }
}

export function getPosition() {
  return sprite ? { x: sprite.position.x, y: sprite.position.y } : { x: 0, y: 0 };
}

export function setWalkBounds(min, max) {
  minX = min;
  maxX = max;
}

export function isCharacterWalking() {
  return isWalking;
}

export function stopWalking() {
  isWalking = false;
  targetX = null;
  onArrivalCallback = null;

  if (idleTexture && sprite) {
    sprite.material.map = idleTexture;
    // Flip texture for direction
    if (facingRight) {
      idleTexture.repeat.set(1, 1);
      idleTexture.offset.x = 0;
    } else {
      idleTexture.repeat.set(-1, 1);
      idleTexture.offset.x = 1;
    }
    sprite.material.needsUpdate = true;
    sprite.scale.set(idleWidth, idleHeight, 1);
  }
}

export function getFloorY() {
  return floorY;
}

export function setFloorY(newFloorY) {
  floorY = newFloorY;
  // Update sprite position to match new floor
  if (sprite) {
    sprite.position.y = floorY + idleHeight / 2;
  }
}

export function setPosition(x, y = null) {
  if (!sprite) return;
  sprite.position.x = x;
  if (y !== null) {
    sprite.position.y = y;
  } else {
    sprite.position.y = floorY + idleHeight / 2;
  }
  // Reset walking state
  isWalking = false;
  targetX = null;
  onArrivalCallback = null;
}

export function disposeCharacter() {
  if (!sprite) return;

  const scene = getScene();
  scene.remove(sprite);

  // Dispose materials and textures
  if (sprite.material) {
    sprite.material.dispose();
  }

  // Dispose loaded textures (not the placeholder canvas texture)
  if (idleTexture && idleTexture.image && !(idleTexture.image instanceof HTMLCanvasElement)) {
    idleTexture.dispose();
  }
  if (walkTexture && walkTexture !== idleTexture && walkTexture.image && !(walkTexture.image instanceof HTMLCanvasElement)) {
    walkTexture.dispose();
  }

  sprite = null;
  idleTexture = null;
  walkTexture = null;
  isWalking = false;
  targetX = null;
  onArrivalCallback = null;
}
