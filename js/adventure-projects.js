// The text adventure's half of the shared project data.
//
// Rooms, orbs and prose are hand-written in adventure.html — the amber orb's
// warmth is written to match Nathan's Words, and no generator would write that.
// Only the facts are shared: an orb names a `projectId`, and this module fills in
// the title, description, tech and links from data/projects.json.
//
// The point is that adding or removing a project in one place cannot leave the
// adventure quoting a project the portfolio no longer lists.

import { orderProjects } from './project-order.js';

const DORMANT = 'The orb is dim. Whatever it once held has moved on.';

// Only the display fields cross over. A hotspot is a position in the submarine
// scene and a screenshot is a PNG; neither means anything in a text adventure.
function displayFields(project) {
  return {
    title: project.title,
    description: project.description,
    tech: project.tech,
    links: project.links
  };
}

/**
 * Resolve every `projectId` in the room graph against projects.json.
 *
 * An orb naming a project that is live gets a `project` object. An orb naming a
 * project that was removed, reverted to a placeholder, or is scenery gets no
 * `project` and falls back to `flavor` — so a deleted project reads as a dimmed
 * orb rather than stale text. The same happens for every orb if `levels` is null,
 * which is what a failed fetch looks like: the adventure still plays.
 *
 * @param {object} rooms - the hand-written room graph
 * @param {object|null} levels - `levels` from data/projects.json, or null
 * @returns {object} a new room graph; the input is left untouched
 */
export function attachProjects(rooms, levels) {
  const byId = new Map(
    levels ? orderProjects(levels).map(project => [project.id, project]) : []
  );

  const out = {};
  for (const [roomKey, room] of Object.entries(rooms)) {
    if (!room.objects) {
      out[roomKey] = room;
      continue;
    }

    const objects = {};
    for (const [objectKey, object] of Object.entries(room.objects)) {
      if (!object.projectId) {
        objects[objectKey] = object;
        continue;
      }

      const project = byId.get(object.projectId);
      objects[objectKey] = project
        ? { ...object, project: displayFields(project) }
        : { ...object, flavor: object.flavor || DORMANT };
    }

    out[roomKey] = { ...room, objects };
  }

  return out;
}
