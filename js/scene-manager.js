// Scene Manager - Orchestrates level switching
import { loadBackground, disposeScene, setSceneDimensions } from './scene.js';
import { initCharacter, loadCharacterSprites, setPosition, setFloorY, setWalkBounds, disposeCharacter } from './character.js';
import { initHotspots, disposeHotspots } from './hotspots.js';

let levelsData = null;
let currentLevel = null;
let onHotspotClickCallback = null;
let isTransitioning = false;

export function initSceneManager(data, hotspotCallback) {
  levelsData = data;
  onHotspotClickCallback = hotspotCallback;
  // Set the initial current level
  const startLevelId = data.startLevel || 'submarine-lab';
  currentLevel = data.levels[startLevelId];
}

export function getCurrentLevel() {
  return currentLevel;
}

export function getLevelsData() {
  return levelsData;
}

export function isInTransition() {
  return isTransitioning;
}

export function setTransitioning(value) {
  isTransitioning = value;
}

export async function loadLevel(levelId, spawnX = null) {
  const level = levelsData.levels[levelId];
  if (!level) {
    console.error(`Level ${levelId} not found`);
    return null;
  }

  // Dispose current level resources
  if (currentLevel) {
    disposeHotspots();
    // Note: We don't dispose character - just reposition it
    disposeScene();
  }

  currentLevel = level;

  // Update scene dimensions
  setSceneDimensions(level.width, level.height);

  // Load background
  try {
    await loadBackground(level.background, level.backgroundSRGB || false);
  } catch (e) {
    console.warn(`Could not load background for ${levelId}, using solid color`);
  }

  // Position character
  const characterX = spawnX !== null ? spawnX : level.characterStartX;
  if (currentLevel) {
    setFloorY(level.floorY);
    setPosition(characterX);
  } else {
    // First load - initialize character
    await initCharacter(characterX, level.floorY);
    try {
      await loadCharacterSprites(
        'assets/character/idle.png',
        'assets/character/walk.png',
        6
      );
    } catch (e) {
      console.warn('Could not load character sprites, using placeholder');
    }
  }

  // Set walk bounds
  const walkBoundsMin = -level.width / 2 + 200;
  const walkBoundsMax = level.width / 2 - 200;
  setWalkBounds(walkBoundsMin, walkBoundsMax);

  // Initialize hotspots for this level
  initHotspots(level.projects, onHotspotClickCallback);

  return {
    level,
    walkBoundsMin,
    walkBoundsMax
  };
}

export function checkPortalTrigger(characterX) {
  if (!currentLevel || !currentLevel.portals) return null;

  for (const portal of currentLevel.portals) {
    if (portal.edge === 'right' && characterX >= portal.triggerX) {
      return portal;
    }
    if (portal.edge === 'left' && characterX <= portal.triggerX) {
      return portal;
    }
  }
  return null;
}

export function setCurrentLevel(levelId) {
  if (levelsData && levelsData.levels[levelId]) {
    currentLevel = levelsData.levels[levelId];
    return currentLevel;
  }
  return null;
}
