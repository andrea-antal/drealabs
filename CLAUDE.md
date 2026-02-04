# CLAUDE.md

## Session Reminders
- [ ] Upcoming todo: simple portfolio

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drealabs is a portfolio website built as an interactive point-and-click adventure game using Three.js. Visitors explore a themed submarine lab environment and click on objects to discover portfolio projects.

## Current Status

**Interactive portfolio in development.** Core engine implemented, awaiting final assets.

### Live Site
- **URL:** drealabs.com
- **Hosting:** Vercel (auto-deploys from `main` branch)
- `/blog` redirects to drealabs.substack.com

### Structure
```
drealabs/
├── index.html              # Entry point + panel HTML
├── style.css               # Game container, panel, fallback styles
├── vercel.json             # Redirect config for /blog
├── favicon.png             # Site favicon
├── comingsoon.png          # Fallback image for small screens
├── data/
│   └── projects.json       # Project content + hotspot positions
├── js/
│   ├── main.js             # Entry point, animation loop
│   ├── scene.js            # Three.js setup (camera, renderer, background)
│   ├── character.js        # Sprite, movement, animation
│   ├── hotspots.js         # Raycasting, click detection
│   └── ui.js               # Panel show/hide, content population
└── assets/
    ├── background.png      # 4096x2048 submarine lab scene (needed)
    └── character/
        ├── idle.png        # 128x256 idle sprite (needed)
        └── walk.png        # 1024x256 walk cycle, 8 frames (needed)
```

## Build Commands

No build step required - static HTML/CSS/JS served directly by Vercel.

**Local preview:**
```bash
python3 -m http.server 8001
# or
npx serve -p 8001
# then open http://localhost:8001
```

## Architecture

### Tech Stack
- **Three.js** via CDN (ES modules, no bundler)
- **Vanilla JS** modules
- **HTML/CSS overlay** for project panels

### Core Systems

**Scene (`js/scene.js`):**
- Orthographic camera for pixel-perfect 2D
- 4096x2048 scrollable background
- Camera follows character with lerp, clamped to bounds

**Character (`js/character.js`):**
- Three.js Sprite with placeholder (awaiting sprites)
- Click floor to walk, sprite flips for direction
- Walk animation from spritesheet

**Hotspots (`js/hotspots.js`):**
- Invisible PlaneGeometry meshes over clickable objects
- Raycaster detects hover (cursor change) and clicks
- Click → walk to hotspot → panel opens on arrival

**UI (`js/ui.js`):**
- HTML/CSS overlay panels (accessible)
- Close on backdrop click or Escape
- Projects populated from `data/projects.json`

**Responsive:**
- Minimum viewport: 1024x600
- Below threshold: fallback message + blog link

## Assets Needed

| Asset | Specs | Prompt Reference |
|-------|-------|------------------|
| Background | 4096x2048 PNG | Use existing `comingsoon.png` style |
| Character idle | 128x256 PNG | See `project_start.md` for prompts |
| Character walk | 1024x256 PNG (8 frames) | See `project_start.md` for prompts |

## Modifying Projects

Edit `data/projects.json` to change:
- Project titles, descriptions, tech stacks
- Hotspot positions (x, y in world coordinates)
- Links (live site, GitHub)

Scene coordinates: origin at center, positive X = right, positive Y = up.
