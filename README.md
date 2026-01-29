# DREA LABS

An interactive point-and-click portfolio experience built with Three.js. Explore a pixel art submarine lab and discover projects by clicking on specimen tanks.

**Live:** [drealabs.com](https://drealabs.com)

## Features

- **Point-and-click navigation** - Click to walk, explore the scene
- **Interactive hotspots** - Click on tanks to view project details
- **Captain's Log** - Changelog displayed in a pixel art book (click the helm)
- **Message in a Bottle** - Animated link to the blog (click the sonar)
- **Speech & thought bubbles** - Character reacts to exploration
- **Mobile responsive** - Adapted layout for smaller screens

## Tech Stack

- **Three.js** - 3D rendering (orthographic camera for 2D feel)
- **Vanilla JS** - ES modules, no build step
- **HTML/CSS** - Overlay panels and UI
- **Vercel** - Hosting with auto-deploy

## Local Development

No build step required. Serve the files with any static server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve

# Then open http://localhost:8000
```

## Project Structure

```
drealabs/
├── index.html              # Entry point
├── style.css               # All styles
├── data/
│   ├── projects.json       # Project content + hotspot positions
│   └── changelog.json      # Captain's log entries
├── js/
│   ├── main.js             # Entry, animation loop, bubble triggers
│   ├── scene.js            # Three.js setup, camera, background
│   ├── character.js        # Sprite, movement, animation
│   ├── hotspots.js         # Raycasting, click detection
│   └── ui.js               # Panels, overlays
└── assets/
    ├── background.png      # 4096x2048 scene
    ├── captains-log.png    # Book overlay image
    ├── message-bottle.mp4  # Animated bottle
    └── character/          # Idle + walk sprites
```

## Adding Projects

Edit `data/projects.json` to add or modify projects:

```json
{
  "id": "tank-1",
  "title": "Project Name",
  "description": "What it does...",
  "tech": ["Three.js", "WebGL"],
  "links": {
    "live": "https://example.com",
    "github": "https://github.com/..."
  },
  "screenshot": "assets/projects/screenshot.png",
  "hotspot": {
    "x": 1030,
    "y": 340,
    "width": 150,
    "height": 370
  }
}
```

Coordinates: origin at center, positive X = right, positive Y = up.

## Assets

- **Image generation:** [Google Gemini Nano Banana Pro](https://gemini.google.com/app)
- **Image editing:** [Canva Pro](https://canva.com)

## License

MIT
