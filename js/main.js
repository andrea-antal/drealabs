import * as THREE from 'three';
import { initScene, loadBackground, lerpCameraTo, screenToWorld, worldToScreen, render, getRenderer } from './scene.js';
import { initCharacter, loadCharacterSprites, walkTo, update as updateCharacter, getPosition, setWalkBounds, getFloorY, isCharacterWalking } from './character.js';
import { initHotspots, setEnabled as setHotspotsEnabled, getHoveredHotspot, checkProximityPulse } from './hotspots.js';
import { initUI, showPanel, closePanel, isPanelOpen, showCaptainsLog, showMessageBottle } from './ui.js';

let clock;
let projectsData;
let isLoading = true;
let speechBubble;
let thoughtBubble;
let activeBubble = null; // 'speech' or 'thought'

// Bubble trigger tracking
let lastActivityTime = 0;
let hasWalkedOnce = false;
let lastHoveredHotspot = null;
let walkBoundsMin = -1800;
let walkBoundsMax = 1800;
let hasShownEdgeMessage = false;

// Bubble text options
const idleThoughts = [
  "doo doo doo",
  "under the sea~",
  "yawn.",
  "what's for dinner?"
];

const nearHotspotSpeech = [
  "wait a sec...",
  "hmm, what's this?"
];

const afterPanelSpeech = [
  "neato!",
  "what a nice little project."
];

const firstWalkThought = "hmm, what's over here?";
const edgeThought = "that's as far as I can go.";

const welcomeSpeech = [
  "Welcome to DREA LABS, glad you stopped by!\nClick on a tank and give it a try.",
  "Welcome to DREA LABS, where ideas brew...\nClick on a tank, there's lots to view.",
  "Welcome to DREA LABS, under the sea~\nTap on a tank and see what I made for thee.",
  "Welcome to DREA LABS, have a peek!\nClick a tank for the project you seek.",
  "Welcome, friend, to my underwater lair!\nTap a tank to see what's there."
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Check viewport size
function checkViewport() {
  const minHeight = 500;

  const tooSmall = window.innerHeight < minHeight;

  const gameContainer = document.getElementById('game-container');
  const fallback = document.getElementById('small-screen-fallback');

  if (tooSmall) {
    gameContainer.style.display = 'none';
    fallback.style.display = 'flex';
    return false;
  } else {
    gameContainer.style.display = 'block';
    fallback.style.display = 'none';
    return true;
  }
}

async function loadProjectsData() {
  try {
    const response = await fetch('data/projects.json');
    projectsData = await response.json();
    return projectsData;
  } catch (e) {
    console.error('Failed to load projects data:', e);
    return null;
  }
}

async function init() {
  // Check viewport first
  if (!checkViewport()) {
    window.addEventListener('resize', () => {
      if (checkViewport() && !clock) {
        init();
      }
    });
    return;
  }

  // Show loading
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'flex';

  // Load project data
  const data = await loadProjectsData();
  if (!data) {
    console.error('Could not load project data');
    return;
  }

  // Initialize Three.js scene
  const container = document.getElementById('game-container');
  initScene(container);

  // Load background
  try {
    await loadBackground('assets/background.png');
  } catch (e) {
    console.warn('Could not load background image, using solid color');
  }

  // Initialize character
  const startX = data.scene?.characterStartX || 0;
  const floorY = data.scene?.floorY || -400;
  await initCharacter(startX, floorY);

  // Set walk bounds based on scene
  const sceneWidth = data.scene?.width || 4096;
  walkBoundsMin = -sceneWidth / 2 + 200;
  walkBoundsMax = sceneWidth / 2 - 200;
  setWalkBounds(walkBoundsMin, walkBoundsMax);

  // Try to load character sprites
  try {
    await loadCharacterSprites(
      'assets/character/idle.png',
      'assets/character/walk.png',
      6
    );
  } catch (e) {
    console.warn('Could not load character sprites, using placeholder');
  }

  // Initialize hotspots
  initHotspots(data.projects, onHotspotClicked);

  // Initialize UI
  initUI(onPanelClosed);

  // Set up input handlers
  setupFloorClick();
  setupKeyboardControls();

  // Hide loading
  if (loadingEl) loadingEl.style.display = 'none';
  isLoading = false;

  // Initialize bubbles
  speechBubble = document.getElementById('speech-bubble');
  thoughtBubble = document.getElementById('thought-bubble');
  lastActivityTime = Date.now();
  setTimeout(() => {
    showSpeechBubble(randomFrom(welcomeSpeech), 0); // Stay until user clicks
  }, 500);

  // Start animation loop
  clock = new THREE.Clock();
  animate();

  // Handle resize
  window.addEventListener('resize', checkViewport);
}

function setupFloorClick() {
  const renderer = getRenderer();

  renderer.domElement.addEventListener('click', (event) => {
    // Hide bubble on interaction
    if (activeBubble) {
      hideBubble();
    }

    // Reset activity timer
    lastActivityTime = Date.now();

    if (isPanelOpen()) return;

    // Convert screen to world coordinates
    const world = screenToWorld(event.clientX, event.clientY);

    // Only walk if clicking on the floor area
    const floorY = getFloorY();
    if (world.y < floorY + 300) { // Allow some tolerance above floor
      // First walk trigger
      if (!hasWalkedOnce) {
        hasWalkedOnce = true;
        setTimeout(() => {
          if (!activeBubble && !isPanelOpen()) {
            showThoughtBubble(firstWalkThought, 3000);
          }
        }, 500);
      }

      walkTo(world.x);
    }
  });
}

function setupKeyboardControls() {
  const moveDistance = 400; // How far to move per key press

  document.addEventListener('keydown', (event) => {
    if (isPanelOpen()) return;

    // Reset activity timer
    lastActivityTime = Date.now();

    const currentPos = getPosition();

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // First walk trigger
      if (!hasWalkedOnce) {
        hasWalkedOnce = true;
        setTimeout(() => {
          if (!activeBubble && !isPanelOpen()) {
            showThoughtBubble(firstWalkThought, 3000);
          }
        }, 500);
      }

      if (event.key === 'ArrowLeft') {
        walkTo(currentPos.x - moveDistance);
      } else {
        walkTo(currentPos.x + moveDistance);
      }
    }
  });
}

function onHotspotClicked(project) {
  // Disable hotspots while panel is open
  setHotspotsEnabled(false);

  // Check for special hotspots
  if (project.id === 'helm') {
    showCaptainsLog();
  } else if (project.id === 'sonar') {
    showMessageBottle();
  } else {
    showPanel(project);
  }
}

function onPanelClosed() {
  // Re-enable hotspots
  setHotspotsEnabled(true);

  // Reset activity timer
  lastActivityTime = Date.now();

  // Show reaction after closing panel
  setTimeout(() => {
    if (!activeBubble && !isPanelOpen()) {
      showSpeechBubble(randomFrom(afterPanelSpeech), 3000);
    }
  }, 300);
}

function showSpeechBubble(text, duration = 5000) {
  hideBubble();
  if (speechBubble) {
    if (text) {
      speechBubble.querySelector('.bubble-text').textContent = text;
    }
    activeBubble = 'speech';
    speechBubble.classList.add('visible');
    if (duration > 0) {
      setTimeout(() => {
        if (activeBubble === 'speech') hideBubble();
      }, duration);
    }
  }
}

function showThoughtBubble(text, duration = 5000) {
  hideBubble();
  if (thoughtBubble) {
    if (text) {
      thoughtBubble.querySelector('.bubble-text').textContent = text;
    }
    activeBubble = 'thought';
    thoughtBubble.classList.add('visible');
    if (duration > 0) {
      setTimeout(() => {
        if (activeBubble === 'thought') hideBubble();
      }, duration);
    }
  }
}

function hideBubble() {
  if (speechBubble) {
    speechBubble.classList.remove('visible');
  }
  if (thoughtBubble) {
    thoughtBubble.classList.remove('visible');
  }
  activeBubble = null;
}

function updateBubblePosition() {
  if (!activeBubble) return;

  const bubble = activeBubble === 'speech' ? speechBubble : thoughtBubble;
  if (!bubble) return;

  const charPos = getPosition();
  // Position bubble above character's head
  const screenPos = worldToScreen(charPos.x, charPos.y + 500);

  const bubbleRect = bubble.getBoundingClientRect();
  const offsetY = activeBubble === 'thought' ? 60 : 20; // Extra offset for thought dots
  bubble.style.left = `${screenPos.x - bubbleRect.width / 2}px`;
  bubble.style.top = `${screenPos.y - bubbleRect.height - offsetY}px`;
}

function checkBubbleTriggers() {
  // Don't trigger if bubble is showing or panel is open
  if (activeBubble || isPanelOpen()) return;

  const charPos = getPosition();
  const isWalking = isCharacterWalking();

  // 1. Idle detection (15+ seconds of no activity)
  const idleTime = Date.now() - lastActivityTime;
  if (idleTime > 15000 && !isWalking) {
    lastActivityTime = Date.now(); // Reset so we don't spam
    showThoughtBubble(randomFrom(idleThoughts), 3000);
    return;
  }

  // 2. Edge detection
  const edgeThreshold = 50;
  const nearLeftEdge = charPos.x <= walkBoundsMin + edgeThreshold;
  const nearRightEdge = charPos.x >= walkBoundsMax - edgeThreshold;

  if ((nearLeftEdge || nearRightEdge) && !isWalking && !hasShownEdgeMessage) {
    hasShownEdgeMessage = true;
    showThoughtBubble(edgeThought, 3000);
    // Reset edge message flag after a delay
    setTimeout(() => {
      hasShownEdgeMessage = false;
    }, 10000);
    return;
  }

  // 3. Near hotspot detection
  const hoveredHotspot = getHoveredHotspot();
  if (hoveredHotspot && hoveredHotspot !== lastHoveredHotspot && !isWalking) {
    lastHoveredHotspot = hoveredHotspot;
    // Small delay to make it feel natural
    setTimeout(() => {
      if (!activeBubble && !isPanelOpen() && getHoveredHotspot() === hoveredHotspot) {
        showSpeechBubble(randomFrom(nearHotspotSpeech), 2500);
      }
    }, 800);
    return;
  }

  // Reset hovered hotspot when not hovering
  if (!hoveredHotspot) {
    lastHoveredHotspot = null;
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (isLoading) return;

  const deltaTime = clock.getDelta();

  // Update character
  updateCharacter(deltaTime);

  // Camera follows character
  const charPos = getPosition();
  lerpCameraTo(charPos.x, 0.05);

  // Check if character is near a hotspot and pulse it
  checkProximityPulse(charPos.x, charPos.y);

  // Update speech bubble position
  updateBubblePosition();

  // Check bubble triggers
  checkBubbleTriggers();

  // Render
  render();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
