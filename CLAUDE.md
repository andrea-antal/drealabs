# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drealabs is a portfolio website built as an interactive point-and-click adventure game. Visitors explore a themed environment and click on objects to discover portfolio projects.

## Current Status

**Placeholder site deployed.** A coming soon page is live while the main project is in development.

### Live Site
- **URL:** drealabs.com
- **Hosting:** Vercel (auto-deploys from `main` branch)
- `/blog` redirects to drealabs.substack.com

### Structure
```
drealabs/
├── index.html          # Placeholder page
├── style.css           # Minimal retro-terminal styling
├── vercel.json         # Redirect config for /blog
├── comingsoon.png      # LucasArts-style pixel art hero image
└── project_start.md    # Interview questionnaire for main project
```

## Build Commands

No build step required - static HTML/CSS served directly by Vercel.

**Local preview:**
```bash
vercel dev
# or just open index.html in a browser
```

## Next Steps (Main Project)

1. Complete the interview in `project_start.md`
2. Generate customized build guide and architecture based on answers
3. Establish tech stack (likely React + Phaser.js or similar)
4. Replace placeholder with full interactive experience

## Architecture

**Current:** Static HTML/CSS with Vercel hosting

**Planned:** Point-and-click adventure game with:
- Canvas-based game engine
- Interactive environment exploration
- Portfolio project reveals through object clicks
