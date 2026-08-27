import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachProjects } from './adventure-projects.js';

const LEVELS = {
  'submarine-lab': {
    projects: [
      {
        id: 'tank-1',
        title: "Nathan's Words",
        description: 'A soundboard.',
        tech: ['TypeScript'],
        links: { github: 'https://github.com/andrea-antal/baby-words' },
        screenshots: [],
        hotspot: {}
      },
      {
        id: 'tank-3',
        title: 'Project 3 - Cat',
        description: 'Placeholder description for tank 3.',
        tech: ['Tech1'],
        links: {},
        screenshots: []
      },
      {
        id: 'helm',
        title: 'Helm',
        description: "The ship's helm.",
        tech: [],
        links: {},
        screenshots: []
      }
    ]
  }
};

function rooms(objects) {
  return { cave: { name: 'A cave', objects } };
}

test('fills an orb from the matching project in projects.json', () => {
  const out = attachProjects(rooms({
    'amber orb': { name: 'an amber orb', projectId: 'tank-1' }
  }), LEVELS);

  const orb = out.cave.objects['amber orb'];
  assert.equal(orb.project.title, "Nathan's Words");
  assert.equal(orb.project.description, 'A soundboard.');
  assert.deepEqual(orb.project.tech, ['TypeScript']);
  assert.equal(orb.project.links.github, 'https://github.com/andrea-antal/baby-words');
});

test('carries no hotspot or screenshots into the adventure', () => {
  const out = attachProjects(rooms({
    'amber orb': { name: 'an amber orb', projectId: 'tank-1' }
  }), LEVELS);

  const orb = out.cave.objects['amber orb'];
  assert.deepEqual(Object.keys(orb.project).sort(), ['description', 'links', 'tech', 'title']);
});

test('keeps the hand-written prose on the orb', () => {
  const out = attachProjects(rooms({
    'amber orb': {
      name: 'an amber orb',
      keywords: ['amber', 'orb'],
      examine: 'Warmth floods through you.',
      projectId: 'tank-1'
    }
  }), LEVELS);

  const orb = out.cave.objects['amber orb'];
  assert.equal(orb.examine, 'Warmth floods through you.');
  assert.deepEqual(orb.keywords, ['amber', 'orb']);
  assert.equal(orb.name, 'an amber orb');
});

test('an orb whose project was removed goes dormant instead of stale', () => {
  const out = attachProjects(rooms({
    'violet orb': { name: 'a violet orb', projectId: 'tank-404' }
  }), LEVELS);

  const orb = out.cave.objects['violet orb'];
  assert.equal(orb.project, undefined);
  assert.match(orb.flavor, /\S/);
});

test('an orb pointing at a slot reverted to a placeholder goes dormant', () => {
  const out = attachProjects(rooms({
    'violet orb': { name: 'a violet orb', projectId: 'tank-3' }
  }), LEVELS);

  assert.equal(out.cave.objects['violet orb'].project, undefined);
});

test('an orb pointing at scenery goes dormant', () => {
  const out = attachProjects(rooms({
    'violet orb': { name: 'a violet orb', projectId: 'helm' }
  }), LEVELS);

  assert.equal(out.cave.objects['violet orb'].project, undefined);
});

test('a dormant orb keeps its own flavor rather than the fallback', () => {
  const out = attachProjects(rooms({
    'dormant orb': {
      name: 'a dormant orb',
      flavor: 'Future projects await.',
      projectId: 'tank-404'
    }
  }), LEVELS);

  assert.equal(out.cave.objects['dormant orb'].flavor, 'Future projects await.');
});

test('objects with no projectId are untouched', () => {
  const out = attachProjects(rooms({
    pillars: { name: 'stone pillars', examine: 'Tall and cracked.' }
  }), LEVELS);

  assert.deepEqual(out.cave.objects.pillars, { name: 'stone pillars', examine: 'Tall and cracked.' });
});

test('a room with no objects is fine', () => {
  const out = attachProjects({ empty: { name: 'An empty room' } }, LEVELS);
  assert.deepEqual(out.empty, { name: 'An empty room' });
});

test('does not mutate the rooms it is given', () => {
  const source = rooms({ 'amber orb': { name: 'an amber orb', projectId: 'tank-1' } });
  attachProjects(source, LEVELS);
  assert.equal(source.cave.objects['amber orb'].project, undefined);
});

test('every orb goes dormant when projects.json could not be loaded', () => {
  const out = attachProjects(rooms({
    'amber orb': { name: 'an amber orb', projectId: 'tank-1' }
  }), null);

  assert.equal(out.cave.objects['amber orb'].project, undefined);
  assert.match(out.cave.objects['amber orb'].flavor, /\S/);
});
