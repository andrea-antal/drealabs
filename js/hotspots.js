import * as THREE from 'three';
import { getScene, getCamera, getRenderer } from './scene.js';
import { walkTo, getPosition } from './character.js';

let hotspotMeshes = [];
let raycaster;
let mouse;
let hoveredHotspot = null;
let onHotspotClick = null;
let enabled = true;

// Idle pulse animation (for touch/small screens only)
let pulsingHotspot = null;
let pulsePhase = 0;
let pulseInterval = null;
let lastPulsedIndex = -1;
let isInitialPhase = true;
let initialPhaseStart = 0;
let initialPulseCount = 0;
let pulseEnabled = false;

// Proximity pulse (for when character nears a hotspot)
let proximityPulsingHotspots = [];
let proximityPulsePhase = 0;
let lastProximityPulsedIds = new Set();

export function initHotspots(projects, clickCallback) {
  const scene = getScene();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  onHotspotClick = clickCallback;

  // Filter out placeholder projects (keep real projects and special hotspots like helm/sonar)
  const activeProjects = projects.filter(p =>
    !p.description.startsWith('Placeholder description')
  );

  // Create invisible meshes for each hotspot
  activeProjects.forEach((project) => {
    const { x, y, width, height } = project.hotspot;
    const radius = 20; // Corner radius

    // Create rounded rectangle shape
    const shape = new THREE.Shape();
    const w = width / 2;
    const h = height / 2;
    const r = Math.min(radius, w, h);

    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);

    const geometry = new THREE.ShapeGeometry(shape);
    // Debug mode - set to true to see hotspots
    const DEBUG_HOTSPOTS = false;

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: DEBUG_HOTSPOTS ? 0.3 : 0,
      color: DEBUG_HOTSPOTS ? new THREE.Color(0xff0000) : new THREE.Color(0xffffff),
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 10); // Slightly in front of background
    mesh.userData = { projectId: project.id, project };

    scene.add(mesh);
    hotspotMeshes.push(mesh);
  });

  // Add event listeners
  const canvas = getRenderer().domElement;
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  // Start idle pulse animation for small screens (< 800px)
  checkPulseEnabled();
  window.addEventListener('resize', checkPulseEnabled);
}

function checkPulseEnabled() {
  const shouldPulse = window.innerWidth < 800;

  if (shouldPulse && !pulseEnabled) {
    // Enable pulse
    pulseEnabled = true;
    initialPhaseStart = Date.now();
    isInitialPhase = true;
    initialPulseCount = 0;
    startIdlePulse(4); // Start with robot
  } else if (!shouldPulse && pulseEnabled) {
    // Disable pulse
    pulseEnabled = false;
    if (pulseInterval) {
      clearTimeout(pulseInterval);
      pulseInterval = null;
    }
    if (pulsingHotspot) {
      pulsingHotspot.material.opacity = 0;
      pulsingHotspot = null;
    }
  }
}

function startIdlePulse(firstIndex = null) {
  if (!pulseEnabled) return;

  // Check if initial phase should end (after 8 seconds)
  if (isInitialPhase && Date.now() - initialPhaseStart > 8000) {
    isInitialPhase = false;
  }

  // Pick which hotspot to pulse
  let index;
  if (firstIndex !== null) {
    index = firstIndex;
  } else if (isInitialPhase) {
    // Keep pulsing robot during initial phase
    index = 4;
  } else {
    // Random selection, avoid repeating the same one
    do {
      index = Math.floor(Math.random() * hotspotMeshes.length);
    } while (index === lastPulsedIndex && hotspotMeshes.length > 1);
  }

  lastPulsedIndex = index;
  pulsingHotspot = hotspotMeshes[index];
  pulsePhase = 0;
  initialPulseCount++;

  // Animate the pulse
  animatePulse();
}

function animatePulse() {
  if (!pulseEnabled) return;

  if (!pulsingHotspot || pulsingHotspot === hoveredHotspot) {
    // Skip if being hovered, schedule next pulse
    pulsingHotspot = null;
    scheduleNextPulse();
    return;
  }

  // Faster and brighter during initial phase
  const speed = isInitialPhase ? 0.035 : 0.02;
  const maxOpacity = isInitialPhase ? 0.45 : 0.25;

  pulsePhase += speed;

  if (pulsePhase <= 1) {
    // Fade in and out using sine wave
    const opacity = Math.sin(pulsePhase * Math.PI) * maxOpacity;
    pulsingHotspot.material.opacity = opacity;
    requestAnimationFrame(animatePulse);
  } else {
    // Pulse complete
    pulsingHotspot.material.opacity = 0;
    pulsingHotspot = null;
    scheduleNextPulse();
  }
}

function scheduleNextPulse() {
  if (!pulseEnabled) return;

  // Shorter delay during initial phase, longer after
  const delay = isInitialPhase
    ? 800 + Math.random() * 400   // 0.8-1.2 seconds during initial
    : 4000 + Math.random() * 2000; // 4-6 seconds normally

  pulseInterval = setTimeout(() => {
    if (enabled && pulseEnabled) {
      startIdlePulse();
    } else if (pulseEnabled) {
      scheduleNextPulse();
    }
  }, delay);
}

function onMouseMove(event) {
  if (!enabled) return;

  const renderer = getRenderer();
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, getCamera());
  const intersects = raycaster.intersectObjects(hotspotMeshes);

  if (intersects.length > 0) {
    const newHovered = intersects[0].object;
    if (hoveredHotspot !== newHovered) {
      // Remove glow from previous hotspot (unless it's pulsing)
      if (hoveredHotspot && hoveredHotspot !== pulsingHotspot) {
        hoveredHotspot.material.opacity = 0;
      }
      // Stop pulse on this hotspot if it was pulsing
      if (newHovered === pulsingHotspot) {
        pulsingHotspot = null;
      }
      // Add glow to new hotspot
      hoveredHotspot = newHovered;
      hoveredHotspot.material.opacity = 0.5;
      renderer.domElement.style.cursor = 'pointer';
    }
  } else {
    if (hoveredHotspot) {
      // Remove glow
      hoveredHotspot.material.opacity = 0;
      hoveredHotspot = null;
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
  const intersects = raycaster.intersectObjects(hotspotMeshes);

  if (intersects.length > 0) {
    // Clicked on hotspot - walk there then trigger
    const hotspot = intersects[0].object;
    const project = hotspot.userData.project;
    const targetX = hotspot.position.x;

    walkTo(targetX, () => {
      if (onHotspotClick) {
        onHotspotClick(project);
      }
    });
  }
}

export function setEnabled(value) {
  enabled = value;
  if (!enabled) {
    const renderer = getRenderer();
    renderer.domElement.style.cursor = 'default';

    // Reset hovered hotspot opacity before nulling
    if (hoveredHotspot) {
      hoveredHotspot.material.opacity = 0;
      hoveredHotspot = null;
    }

    // Stop and reset any proximity pulse in progress
    proximityPulsingHotspots.forEach(hotspot => {
      hotspot.material.opacity = 0;
    });
    proximityPulsingHotspots = [];

    // Stop and reset any idle pulse in progress
    if (pulsingHotspot) {
      pulsingHotspot.material.opacity = 0;
      pulsingHotspot = null;
    }
  }
}

export function isEnabled() {
  return enabled;
}

export function getHoveredHotspot() {
  return hoveredHotspot ? hoveredHotspot.userData.project : null;
}

// Check if character is near any hotspot and pulse it
export function checkProximityPulse(characterX, characterY, proximityThreshold = 600) {
  // Don't pulse if already pulsing or if a hotspot is hovered
  if (proximityPulsingHotspots.length > 0 || hoveredHotspot) return;

  // Find all hotspots within x threshold (both rows)
  const nearbyHotspots = [];

  for (const mesh of hotspotMeshes) {
    const xDistance = Math.abs(mesh.position.x - characterX);

    if (xDistance < proximityThreshold && !lastProximityPulsedIds.has(mesh.userData.projectId)) {
      nearbyHotspots.push(mesh);
    }
  }

  // Pulse all nearby hotspots that haven't been pulsed yet
  if (nearbyHotspots.length > 0) {
    nearbyHotspots.forEach(h => lastProximityPulsedIds.add(h.userData.projectId));
    startProximityPulse(nearbyHotspots);
  }

  // Reset pulsed IDs for hotspots character has moved away from
  for (const id of lastProximityPulsedIds) {
    const mesh = hotspotMeshes.find(m => m.userData.projectId === id);
    if (mesh && Math.abs(mesh.position.x - characterX) > proximityThreshold + 100) {
      lastProximityPulsedIds.delete(id);
    }
  }
}

function startProximityPulse(hotspots) {
  proximityPulsingHotspots = hotspots;
  proximityPulsePhase = 0;
  animateProximityPulse();
}

function animateProximityPulse() {
  if (proximityPulsingHotspots.length === 0) return;

  proximityPulsePhase += 0.025;

  if (proximityPulsePhase <= 1) {
    // Fade in and out using sine wave
    const opacity = Math.sin(proximityPulsePhase * Math.PI) * 0.35;
    proximityPulsingHotspots.forEach(hotspot => {
      // Don't animate if being hovered
      if (hotspot !== hoveredHotspot) {
        hotspot.material.opacity = opacity;
      }
    });
    requestAnimationFrame(animateProximityPulse);
  } else {
    // Pulse complete
    proximityPulsingHotspots.forEach(hotspot => {
      if (hotspot !== hoveredHotspot) {
        hotspot.material.opacity = 0;
      }
    });
    proximityPulsingHotspots = [];
  }
}
