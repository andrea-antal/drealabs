// The `map` command.
//
// Positions come from the exits themselves, not from coordinates written by hand.
// Add a room with `north: 'somewhere'` and it places itself, so the map cannot
// drift from the dungeon the way a hand-drawn one would.
//
// The player sees only what they have earned: rooms they have stood in are named,
// rooms they have merely seen an exit toward are a question mark, and anything
// further is not drawn at all.

const DELTA = {
  north: { row: -1, col: 0 },
  south: { row: 1, col: 0 },
  east: { row: 0, col: 1 },
  west: { row: 0, col: -1 }
};

const UNKNOWN = '?';

/**
 * Walk the exit graph from `startRoom`, assigning each room a row and column.
 *
 * Breadth-first, so the shortest path decides a room's position and a loop back
 * on itself cannot drag one somewhere odd. Rooms with no path from the start are
 * left out entirely.
 *
 * @returns {Map<string, {row: number, col: number}>}
 */
export function layoutRooms(rooms, startRoom) {
  const at = new Map();
  if (!rooms[startRoom]) return at;

  at.set(startRoom, { row: 0, col: 0 });
  const queue = [startRoom];

  while (queue.length > 0) {
    const key = queue.shift();
    const here = at.get(key);

    for (const [direction, target] of Object.entries(rooms[key].exits || {})) {
      const delta = DELTA[direction];
      if (!delta || !rooms[target] || at.has(target)) continue;

      at.set(target, { row: here.row + delta.row, col: here.col + delta.col });
      queue.push(target);
    }
  }

  return at;
}

// A room is drawn if the player has stood in it, or if they have stood somewhere
// with an exit leading to it. Everything beyond that is still dark.
function knownRooms(rooms, visited) {
  const known = new Set(visited);
  for (const key of visited) {
    for (const target of Object.values(rooms[key]?.exits || {})) {
      if (rooms[target]) known.add(target);
    }
  }
  return known;
}

function cellFor(rooms, key, visited) {
  if (!key) return '';
  return `[${visited.has(key) ? rooms[key].mapLabel : ` ${UNKNOWN} `}]`;
}

// Space between one column's box and the next, before any connector is drawn.
const GAP = 2;

/**
 * Draw the explored dungeon as ASCII.
 *
 * @param {object} rooms - the room graph
 * @param {string} startRoom - where layout begins
 * @param {Set<string>} visited - rooms the player has entered
 * @returns {string} the map, or '' if the player has been nowhere
 */
export function renderMap(rooms, startRoom, visited) {
  const at = layoutRooms(rooms, startRoom);
  const known = knownRooms(rooms, visited);

  const drawn = [...known].filter(key => at.has(key));
  if (drawn.length === 0) return '';

  const rowsOf = drawn.map(key => at.get(key).row);
  const colsOf = drawn.map(key => at.get(key).col);
  const minRow = Math.min(...rowsOf);
  const maxRow = Math.max(...rowsOf);
  const minCol = Math.min(...colsOf);
  const maxCol = Math.max(...colsOf);

  // grid[row][col] holds a room key, or null for empty space.
  const grid = [];
  for (let row = minRow; row <= maxRow; row++) {
    const line = [];
    for (let col = minCol; col <= maxCol; col++) {
      line.push(drawn.find(key => {
        const spot = at.get(key);
        return spot.row === row && spot.col === col;
      }) || null);
    }
    grid.push(line);
  }

  // Every column is as wide as its widest cell. Cells are then centred on the
  // column's midpoint rather than merely padded, so a short [Atrium] and a long
  // [Oubliette] share an axis and the pipe between them is genuinely vertical.
  const widths = grid[0].map((_, col) =>
    Math.max(...grid.map(line => cellFor(rooms, line[col], visited).length), 0)
  );

  const axis = [];
  let x = 0;
  widths.forEach((width, col) => {
    axis[col] = x + Math.floor(width / 2);
    x += width + GAP;
  });
  const totalWidth = x - GAP;

  const linked = (a, b) =>
    a && b && Object.values(rooms[a].exits || {}).includes(b);

  // Where a cell's text starts, given that its middle character sits on the axis.
  const startOf = (key, col) =>
    axis[col] - Math.floor(cellFor(rooms, key, visited).length / 2);

  const write = (line, at, text) => {
    for (let i = 0; i < text.length; i++) line[at + i] = text[i];
  };

  const out = [];
  grid.forEach((row, index) => {
    const line = new Array(totalWidth).fill(' ');

    row.forEach((key, col) => {
      if (key) write(line, startOf(key, col), cellFor(rooms, key, visited));
    });

    // Dashes run from the right edge of one box to the left edge of the next,
    // however much padding the columns put between them.
    row.forEach((key, col) => {
      const right = row[col + 1];
      if (!linked(key, right)) return;
      const from = startOf(key, col) + cellFor(rooms, key, visited).length;
      const to = startOf(right, col + 1);
      for (let i = from; i < to; i++) line[i] = '-';
    });

    out.push(line.join('').trimEnd());

    const next = grid[index + 1];
    if (!next) return;

    const joinLine = new Array(totalWidth).fill(' ');
    row.forEach((key, col) => {
      if (linked(key, next[col])) joinLine[axis[col]] = '|';
    });
    if (joinLine.join('').trim()) out.push(joinLine.join('').trimEnd());
  });

  return out.filter(line => line.trim()).join('\n');
}
