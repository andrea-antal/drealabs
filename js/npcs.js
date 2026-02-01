import * as THREE from 'three';
import { getScene, getCamera, getRenderer } from './scene.js';
import { walkTo, getPosition } from './character.js';

let npcSprites = [];      // Three.js Sprite objects
let npcMeshes = [];       // Invisible click detection meshes
let npcData = [];         // Store NPC data for reference
let animationTime = 0;    // For frame animation
let raycaster;
let mouse;
let hoveredNPC = null;
let onNPCClick = null;
let enabled = true;

// Store bound handlers for cleanup
let mouseMoveHandler = null;
let clickHandler = null;

// Debug mode
const DEBUG_NPCS = false;

// Animation parameters
const FRAME_DURATION = 0.2;  // Seconds per frame (5 FPS for idle)

export function initNPCs(npcsDataArray, clickCallback) {
  if (!npcsDataArray || npcsDataArray.length === 0) return;

  const scene = getScene();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  onNPCClick = clickCallback;
  npcData = npcsDataArray;

  const textureLoader = new THREE.TextureLoader();

  npcsDataArray.forEach((npc, index) => {
    const frameCount = npc.frameCount || 1;
    // Random phase offset so NPCs don't animate in sync
    const phaseOffset = Math.random() * frameCount;

    // Create sprite for NPC
    const spriteMaterial = new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    // Try to load sprite texture, fall back to placeholder
    textureLoader.load(
      npc.sprite,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        // Set up for sprite sheet - show one frame at a time
        texture.repeat.set(1 / frameCount, 1);
        texture.offset.x = 0;
        spriteMaterial.map = texture;
        spriteMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        // Create placeholder canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        // Placeholder rectangle
        ctx.fillStyle = '#8855ff';
        ctx.fillRect(8, 0, 48, 128);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NPC', 32, 70);

        const placeholderTexture = new THREE.CanvasTexture(canvas);
        placeholderTexture.magFilter = THREE.NearestFilter;
        placeholderTexture.minFilter = THREE.NearestFilter;
        spriteMaterial.map = placeholderTexture;
        spriteMaterial.needsUpdate = true;
      }
    );

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(npc.width, npc.height, 1);
    sprite.position.set(npc.position.x, npc.position.y + npc.height / 2, 5);
    sprite.userData = {
      npc,
      frameCount,
      frameDuration: npc.frameDuration || FRAME_DURATION,
      phaseOffset,
      currentFrame: 0
    };

    scene.add(sprite);
    npcSprites.push(sprite);

    // Create invisible click mesh
    const geometry = new THREE.PlaneGeometry(npc.width, npc.height);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: DEBUG_NPCS ? 0.3 : 0,
      color: DEBUG_NPCS ? 0x00ff00 : 0xffffff,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(npc.position.x, npc.position.y + npc.height / 2, 6);
    mesh.userData = { npc, spriteIndex: index };

    scene.add(mesh);
    npcMeshes.push(mesh);
  });

  // Add event listeners
  mouseMoveHandler = onMouseMove;
  clickHandler = onClick;

  const canvas = getRenderer().domElement;
  canvas.addEventListener('mousemove', mouseMoveHandler);
  canvas.addEventListener('click', clickHandler);
}

export function updateNPCs(deltaTime) {
  if (npcSprites.length === 0) return;

  animationTime += deltaTime;

  // Update sprite sheet animation for each NPC
  npcSprites.forEach((sprite) => {
    const { frameCount, frameDuration, phaseOffset } = sprite.userData;
    if (frameCount <= 1 || !sprite.material.map) return;

    // Calculate current frame with ping-pong (1-2-3-4-3-2-1-2-3-4...)
    const cycleLength = (frameCount - 1) * 2; // For 4 frames: 6 steps per cycle
    const timeInCycle = ((animationTime / frameDuration) + phaseOffset) % cycleLength;
    let frame;
    if (timeInCycle < frameCount) {
      frame = Math.floor(timeInCycle);
    } else {
      frame = frameCount - 1 - Math.floor(timeInCycle - (frameCount - 1));
    }

    // Update texture offset if frame changed
    if (frame !== sprite.userData.currentFrame) {
      sprite.userData.currentFrame = frame;
      sprite.material.map.offset.x = frame / frameCount;
    }
  });
}

function onMouseMove(event) {
  if (!enabled) return;

  const renderer = getRenderer();
  const camera = getCamera();
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(npcMeshes);

  if (intersects.length > 0) {
    const newHovered = intersects[0].object;
    if (hoveredNPC !== newHovered) {
      hoveredNPC = newHovered;
      renderer.domElement.style.cursor = 'pointer';
    }
  } else {
    if (hoveredNPC) {
      hoveredNPC = null;
      // Only reset cursor if hotspots module hasn't set it
      // Check if we're hovering over something else handled elsewhere
      renderer.domElement.style.cursor = 'default';
    }
  }
}

function onClick(event) {
  if (!enabled) return;

  const renderer = getRenderer();
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, getCamera());
  const intersects = raycaster.intersectObjects(npcMeshes);

  if (intersects.length > 0) {
    const npcMesh = intersects[0].object;
    const npc = npcMesh.userData.npc;
    const targetX = npc.position.x;

    // Walk to NPC, then trigger callback
    walkTo(targetX, () => {
      if (onNPCClick) {
        onNPCClick(npc);
      }
    });
  }
}

export function setEnabled(value) {
  enabled = value;

  if (!enabled) {
    const renderer = getRenderer();
    if (hoveredNPC) {
      hoveredNPC = null;
      renderer.domElement.style.cursor = 'default';
    }
  }
}

export function isEnabled() {
  return enabled;
}

export function getHoveredNPC() {
  return hoveredNPC ? hoveredNPC.userData.npc : null;
}

export function disposeNPCs() {
  const scene = getScene();
  const canvas = getRenderer().domElement;

  // Remove event listeners
  if (mouseMoveHandler) {
    canvas.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }
  if (clickHandler) {
    canvas.removeEventListener('click', clickHandler);
    clickHandler = null;
  }

  // Remove and dispose all NPC sprites
  npcSprites.forEach(sprite => {
    scene.remove(sprite);
    if (sprite.material.map) {
      sprite.material.map.dispose();
    }
    sprite.material.dispose();
  });
  npcSprites = [];

  // Remove and dispose all NPC meshes
  npcMeshes.forEach(mesh => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  npcMeshes = [];

  // Reset state
  npcData = [];
  hoveredNPC = null;
  animationTime = 0;
  enabled = true;
}
