import * as THREE from 'three';
import { initScene, loadBackground, lerpCameraTo, screenToWorld, worldToScreen, render, getRenderer, setSceneDimensions, disposeScene } from './scene.js';
import { initCharacter, loadCharacterSprites, walkTo, update as updateCharacter, getPosition, setWalkBounds, getFloorY, isCharacterWalking, setPosition, setFloorY, stopWalking } from './character.js';
import { initHotspots, setEnabled as setHotspotsEnabled, getHoveredHotspot, checkProximityPulse, disposeHotspots } from './hotspots.js';
import { initNPCs, updateNPCs, setEnabled as setNPCsEnabled, disposeNPCs } from './npcs.js';
import { initUI, showPanel, closePanel, isPanelOpen, showCaptainsLog, showMessageBottle, showAdventureModal, showPortfolioModal, showNPCDialog, closeNPCDialog, isNPCDialogOpen, showGuestbook, isGuestbookOpen, fadeOut, fadeIn } from './ui.js';
import { initSceneManager, loadLevel, checkPortalTrigger, getCurrentLevel, isInTransition, setTransitioning, setCurrentLevel } from './scene-manager.js';

let clock;
let projectsData;
let changelogData;
let isLoading = true;
let speechBubble;
let thoughtBubble;
let activeBubble = null; // 'speech' or 'thought'
let portalArrowLeft;
let portalArrowRight;

// Bubble trigger tracking
let lastActivityTime = 0;
let hasWalkedOnce = false;
let lastHoveredHotspot = null;
let walkBoundsMin = -1800;
let walkBoundsMax = 1800;
let hasShownEdgeMessage = false;
let hasShownWelcome = false;
let hasShownChangelogBubble = false;

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
const portalThought = "ooh, what's over there?";

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

async function loadChangelogData() {
  try {
    const response = await fetch('data/changelog.json');
    changelogData = await response.json();
    return changelogData;
  } catch (e) {
    console.error('Failed to load changelog data:', e);
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

  // Load changelog data
  await loadChangelogData();

  // Initialize Three.js scene
  const container = document.getElementById('game-container');
  initScene(container);

  // Initialize scene manager
  initSceneManager(data, onHotspotClicked);

  // Get starting level
  const startLevelId = data.startLevel || 'submarine-lab';
  const startLevel = data.levels[startLevelId];

  // Load background
  try {
    await loadBackground(startLevel.background, startLevel.backgroundSRGB || false);
  } catch (e) {
    console.warn('Could not load background image, using solid color');
  }

  // Initialize character
  const startX = startLevel.characterStartX || 0;
  const floorY = startLevel.floorY || -400;
  await initCharacter(startX, floorY);

  // Set walk bounds based on scene
  const sceneWidth = startLevel.width || 4096;
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

  // Initialize hotspots with projects from the starting level
  initHotspots(startLevel.projects, onHotspotClicked);

  // Initialize NPCs if present in the level
  if (startLevel.npcs && startLevel.npcs.length > 0) {
    initNPCs(startLevel.npcs, onNPCClicked);
  }

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

  // Initialize portal arrows
  portalArrowLeft = document.getElementById('portal-arrow-left');
  portalArrowRight = document.getElementById('portal-arrow-right');

  // Portal arrow click handlers
  portalArrowLeft?.addEventListener('click', () => {
    const portal = getPortalByEdge('left');
    if (portal) handlePortalTransition(portal);
  });
  portalArrowRight?.addEventListener('click', () => {
    const portal = getPortalByEdge('right');
    if (portal) handlePortalTransition(portal);
  });
  setTimeout(() => {
    hasShownWelcome = true;
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
      const wasWelcomeBubble = hasShownWelcome && !hasShownChangelogBubble;
      hideBubble();

      // Show changelog bubble after welcome is dismissed
      if (wasWelcomeBubble && changelogData?.entries?.length > 0) {
        hasShownChangelogBubble = true;
        const latest = changelogData.entries[0];
        const date = new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        setTimeout(() => {
          showSpeechBubble(`New in v${latest.version} (${date}): ${latest.title}!`, 5000);
        }, 300);
      }
    }

    // Reset activity timer
    lastActivityTime = Date.now();

    if (isPanelOpen() || isNPCDialogOpen() || isGuestbookOpen() || isInTransition()) return;

    // Convert screen to world coordinates
    const world = screenToWorld(event.clientX, event.clientY);

    // Only walk if clicking on the floor area
    const floorY = getFloorY();
    if (world.y < floorY + 300) { // Allow some tolerance above floor
      // First walk trigger
      if (!hasWalkedOnce) {
        hasWalkedOnce = true;
        setTimeout(() => {
          if (!activeBubble && !isPanelOpen() && !isGuestbookOpen()) {
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
    if (isPanelOpen() || isNPCDialogOpen() || isGuestbookOpen() || isInTransition()) return;

    // Reset activity timer
    lastActivityTime = Date.now();

    const currentPos = getPosition();

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // First walk trigger
      if (!hasWalkedOnce) {
        hasWalkedOnce = true;
        setTimeout(() => {
          if (!activeBubble && !isPanelOpen() && !isGuestbookOpen()) {
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
  // Disable hotspots and NPCs while panel is open
  setHotspotsEnabled(false);
  setNPCsEnabled(false);

  // Check for special hotspots
  if (project.id === 'helm') {
    showCaptainsLog();
  } else if (project.id === 'sonar') {
    showMessageBottle();
  } else if (project.id === 'guestbook') {
    showGuestbook();
  } else if (project.id === 'computer') {
    // Show adventure modal
    showAdventureModal();
  } else if (project.id === 'filing-cabinet') {
    // Show portfolio modal
    showPortfolioModal();
  } else {
    showPanel(project);
  }
}

function onPanelClosed() {
  // Re-enable hotspots and NPCs
  setHotspotsEnabled(true);
  setNPCsEnabled(true);

  // Reset activity timer
  lastActivityTime = Date.now();

  // Show reaction after closing panel
  setTimeout(() => {
    if (!activeBubble && !isPanelOpen() && !isNPCDialogOpen() && !isGuestbookOpen()) {
      showSpeechBubble(randomFrom(afterPanelSpeech), 3000);
    }
  }, 300);
}

function onNPCClicked(npc) {
  // Disable hotspots and NPCs while dialog is open
  setHotspotsEnabled(false);
  setNPCsEnabled(false);

  // Hide any active bubble
  hideBubble();

  // Check interaction type
  if (npc.interactionType === 'minigame' && npc.minigameId) {
    // Mini-game hook for Phase 3 - for now, just show dialog
    showNPCDialog(npc);
  } else {
    // Show dialog
    showNPCDialog(npc);
  }
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

function getPortalByEdge(edge) {
  const currentLevel = getCurrentLevel();
  if (!currentLevel || !currentLevel.portals) return null;
  return currentLevel.portals.find(p => p.edge === edge) || null;
}

function updatePortalArrows() {
  const currentLevel = getCurrentLevel();
  if (!currentLevel || !currentLevel.portals || isInTransition() || isPanelOpen() || isGuestbookOpen()) {
    // Hide both arrows during transition, panel open, or if no level
    portalArrowLeft?.classList.remove('visible');
    portalArrowRight?.classList.remove('visible');
    return;
  }

  const charPos = getPosition();
  const proximityThreshold = 400; // Show arrow when within this distance of portal trigger

  for (const portal of currentLevel.portals) {
    if (portal.edge === 'left') {
      const distance = charPos.x - portal.triggerX;
      if (distance <= proximityThreshold && distance >= -100) {
        portalArrowLeft?.classList.add('visible');
      } else {
        portalArrowLeft?.classList.remove('visible');
      }
    } else if (portal.edge === 'right') {
      const distance = portal.triggerX - charPos.x;
      if (distance <= proximityThreshold && distance >= -100) {
        portalArrowRight?.classList.add('visible');
      } else {
        portalArrowRight?.classList.remove('visible');
      }
    }
  }
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

async function handlePortalTransition(portal) {
  if (isInTransition()) return;

  // Don't transition if panel or guestbook is open
  if (isPanelOpen() || isGuestbookOpen()) return;

  setTransitioning(true);
  stopWalking();
  setHotspotsEnabled(false);
  setNPCsEnabled(false);
  hideBubble();

  // Fade out immediately to signal click registered
  await fadeOut(300);

  // Dispose current level
  disposeHotspots();
  disposeNPCs();
  disposeScene();

  // Get target level data
  const targetLevel = projectsData.levels[portal.targetLevel];
  if (!targetLevel) {
    console.error(`Target level ${portal.targetLevel} not found`);
    setTransitioning(false);
    await fadeIn(400);
    return;
  }

  // Update scene dimensions
  setSceneDimensions(targetLevel.width, targetLevel.height);

  // Load new background
  try {
    await loadBackground(targetLevel.background, targetLevel.backgroundSRGB || false);
  } catch (e) {
    console.warn(`Could not load background for ${portal.targetLevel}`);
  }

  // Reposition character
  setFloorY(targetLevel.floorY);
  setPosition(portal.targetSpawnX);

  // Update walk bounds
  walkBoundsMin = -targetLevel.width / 2 + 200;
  walkBoundsMax = targetLevel.width / 2 - 200;
  setWalkBounds(walkBoundsMin, walkBoundsMax);

  // Update current level in scene manager
  setCurrentLevel(portal.targetLevel);

  // Initialize hotspots for new level
  initHotspots(targetLevel.projects, onHotspotClicked);

  // Initialize NPCs for new level
  if (targetLevel.npcs && targetLevel.npcs.length > 0) {
    initNPCs(targetLevel.npcs, onNPCClicked);
  }

  // Reset edge message flag
  hasShownEdgeMessage = false;

  // Fade in
  await fadeIn(400);

  setHotspotsEnabled(true);
  setNPCsEnabled(true);
  setTransitioning(false);
}

function checkBubbleTriggers() {
  // Don't trigger if bubble is showing, panel is open, dialog is open, guestbook is open, or transitioning
  if (activeBubble || isPanelOpen() || isNPCDialogOpen() || isGuestbookOpen() || isInTransition()) return;

  const charPos = getPosition();
  const isWalking = isCharacterWalking();

  // 1. Idle detection (15+ seconds of no activity)
  const idleTime = Date.now() - lastActivityTime;
  if (idleTime > 15000 && !isWalking) {
    lastActivityTime = Date.now(); // Reset so we don't spam
    showThoughtBubble(randomFrom(idleThoughts), 3000);
    return;
  }

  // 2. Edge detection (only show "can't go further" if no portal)
  const currentLevel = getCurrentLevel();
  const edgeThreshold = 50;
  const nearLeftEdge = charPos.x <= walkBoundsMin + edgeThreshold;
  const nearRightEdge = charPos.x >= walkBoundsMax - edgeThreshold;

  // Check if there's a portal at this edge
  let hasPortalAtEdge = false;
  if (currentLevel && currentLevel.portals) {
    for (const portal of currentLevel.portals) {
      if ((nearRightEdge && portal.edge === 'right') || (nearLeftEdge && portal.edge === 'left')) {
        hasPortalAtEdge = true;
        break;
      }
    }
  }

  if ((nearLeftEdge || nearRightEdge) && !isWalking && !hasShownEdgeMessage && !hasPortalAtEdge) {
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
      if (!activeBubble && !isPanelOpen() && !isGuestbookOpen() && getHoveredHotspot() === hoveredHotspot) {
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

  // Update NPCs (bob animation)
  updateNPCs(deltaTime);

  // Camera follows character
  const charPos = getPosition();
  lerpCameraTo(charPos.x, 0.05);

  // Check if character is near a hotspot and pulse it
  checkProximityPulse(charPos.x, charPos.y);

  // Update speech bubble position
  updateBubblePosition();

  // Update portal arrow visibility
  updatePortalArrows();

  // Check bubble triggers (includes portal detection)
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
