import * as THREE from 'three';

let scene, camera, renderer;
let sceneWidth = 4096;
let sceneHeight = 2048;
let backgroundMesh;
let resizeHandler;

export function initScene(container) {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Orthographic camera for pixel-perfect 2D
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = sceneHeight;
  const viewWidth = viewHeight * aspect;

  camera = new THREE.OrthographicCamera(
    -viewWidth / 2,
    viewWidth / 2,
    viewHeight / 2,
    -viewHeight / 2,
    0.1,
    1000
  );
  camera.position.z = 500;

  // Renderer with pixel art settings
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1); // Keep pixels crisp
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Handle resize
  resizeHandler = onResize;
  window.addEventListener('resize', resizeHandler);

  return { scene, camera, renderer };
}

export async function loadBackground(url, useSRGB = false) {
  // Dispose existing background if present
  if (backgroundMesh) {
    scene.remove(backgroundMesh);
    backgroundMesh.geometry.dispose();
    backgroundMesh.material.map?.dispose();
    backgroundMesh.material.dispose();
    backgroundMesh = null;
  }

  const loader = new THREE.TextureLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        // Pixel art settings
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        if (useSRGB) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }

        // Create background plane
        const geometry = new THREE.PlaneGeometry(sceneWidth, sceneHeight);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: false
        });

        backgroundMesh = new THREE.Mesh(geometry, material);
        backgroundMesh.position.z = -100; // Behind everything
        scene.add(backgroundMesh);

        resolve(backgroundMesh);
      },
      undefined,
      reject
    );
  });
}

export function setCameraPosition(x) {
  const viewWidth = (camera.right - camera.left);

  // If viewport is wider than scene, center it
  if (viewWidth >= sceneWidth) {
    camera.position.x = 0;
    return;
  }

  // Clamp camera to scene bounds
  const minX = -sceneWidth / 2 + viewWidth / 2;
  const maxX = sceneWidth / 2 - viewWidth / 2;

  camera.position.x = Math.max(minX, Math.min(maxX, x));
}

export function getCameraPosition() {
  return camera.position.x;
}

export function lerpCameraTo(targetX, alpha = 0.05) {
  const viewWidth = (camera.right - camera.left);

  // If viewport is wider than scene, center it
  if (viewWidth >= sceneWidth) {
    camera.position.x += (0 - camera.position.x) * alpha;
    return;
  }

  // Clamp camera to scene bounds
  const minX = -sceneWidth / 2 + viewWidth / 2;
  const maxX = sceneWidth / 2 - viewWidth / 2;

  const clampedTarget = Math.max(minX, Math.min(maxX, targetX));
  camera.position.x += (clampedTarget - camera.position.x) * alpha;
}

export function screenToWorld(screenX, screenY) {
  // Convert screen coordinates to world coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((screenX - rect.left) / rect.width) * 2 - 1;
  const y = -((screenY - rect.top) / rect.height) * 2 + 1;

  const vector = new THREE.Vector3(x, y, 0);
  vector.unproject(camera);

  return { x: vector.x, y: vector.y };
}

export function worldToScreen(worldX, worldY) {
  // Convert world coordinates to screen coordinates
  const vector = new THREE.Vector3(worldX, worldY, 0);
  vector.project(camera);

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((vector.x + 1) / 2) * rect.width + rect.left;
  const y = ((-vector.y + 1) / 2) * rect.height + rect.top;

  return { x, y };
}

export function render() {
  renderer.render(scene, camera);
}

function onResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = sceneHeight;
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function getSceneBounds() {
  return { width: sceneWidth, height: sceneHeight };
}

export function setSceneDimensions(width, height) {
  sceneWidth = width;
  sceneHeight = height;
  // Trigger resize to update camera
  onResize();
}

export function disposeScene() {
  // Dispose background
  if (backgroundMesh) {
    scene.remove(backgroundMesh);
    backgroundMesh.geometry.dispose();
    backgroundMesh.material.map?.dispose();
    backgroundMesh.material.dispose();
    backgroundMesh = null;
  }
}
