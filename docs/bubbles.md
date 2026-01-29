# Character Bubbles & Hotspot Effects

This document tracks all speech/thought bubble messages and hotspot visual effects.

## Bubble Types

### Speech Bubble
- **Style**: White background, pixel art border, triangle tail pointing down
- **Use for**: Direct dialogue, greetings, instructions, reactions

### Thought Bubble
- **Style**: White background, pixel art border, three trailing dots, italic text
- **Use for**: Internal thoughts, wondering, contemplation

---

## Active Triggers - Bubbles

| Trigger | Type | Text Options | Duration | Notes |
|---------|------|--------------|----------|-------|
| **Page load** (500ms delay) | Speech | Random rhyming couplet (see below) | Until click | Stays visible until user interacts |
| **First time walking** | Thought | "hmm, what's over here?" | 3s | Only once per session |
| **Idle 30+ seconds** | Thought | "doo doo doo" / "under the sea~" / "yawn." / "what's for dinner?" | 3s | Random, resets timer |
| **Hover near hotspot** | Speech | "wait a sec..." / "hmm, what's this?" | 2.5s | 800ms delay, once per hotspot |
| **After closing panel** | Speech | "neato!" / "what a nice little project." | 3s | Random reaction |
| **Reaching scene edge** | Thought | "that's as far as I can go." | 3s | 10s cooldown between triggers |

---

## Active Triggers - Hotspot Effects

| Trigger | Effect | Threshold | Notes |
|---------|--------|-----------|-------|
| **Character proximity** | White pulse (0.35 opacity) | 600px | Pulses all hotspots at similar x position (both rows); once per approach |
| **Mouse hover** | White glow (0.5 opacity) | On hotspot | Immediate, stays while hovering |
| **Small screen idle** (< 800px) | Sequential pulse | N/A | For touch devices; robot first, then random |

---

## Welcome Couplets (Page Load)

Randomly selected, displayed as two lines:

1. "Welcome to DREA LABS, glad you stopped by!
   Click on a tank and give it a try."

2. "Welcome to DREA LABS, where ideas brew...
   Click on a tank, there's lots to view."

3. "Welcome to DREA LABS, under the sea~
   Tap on a tank and see what I made for thee."

4. "Welcome to DREA LABS, have a peek!
   Click a tank for the project you seek."

5. "Welcome, friend, to my underwater lair!
   Tap a tank to see what's there."

---

## Trigger Priority

### Bubbles
1. Panel open → No bubbles shown
2. Bubble already showing → No new bubbles
3. Edge detection (when stopped at edge)
4. Hotspot proximity (when hovering)
5. Idle detection (30+ seconds)

### Hotspot Effects
1. Hover glow takes priority over pulse
2. Proximity pulse won't trigger if already pulsing
3. Each hotspot only pulses once per approach (resets when character moves 700px+ away)

---

## API

### Bubbles (`js/main.js`)

```javascript
// Show speech bubble
showSpeechBubble(text, duration)
// text: string (optional, uses existing HTML text if omitted)
// duration: ms (default 5000, use 0 for no auto-hide)

// Show thought bubble
showThoughtBubble(text, duration)
// Same parameters as above

// Hide any active bubble
hideBubble()

// Get random item from array
randomFrom(arr)
```

### Hotspot Effects (`js/hotspots.js`)

```javascript
// Check proximity and pulse nearby hotspots
checkProximityPulse(characterX, characterY, proximityThreshold = 600)
```

---

## Text Arrays

```javascript
const welcomeSpeech = [
  "Welcome to DREA LABS, glad you stopped by!\nClick on a tank and give it a try.",
  "Welcome to DREA LABS, where ideas brew...\nClick on a tank, there's lots to view.",
  "Welcome to DREA LABS, under the sea~\nTap on a tank and see what I made for thee.",
  "Welcome to DREA LABS, have a peek!\nClick a tank for the project you seek.",
  "Welcome, friend, to my underwater lair!\nTap a tank to see what's there."
];

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
```

---

## Implementation Notes

### Bubbles
- Only one bubble visible at a time (showing one hides the other)
- Bubbles follow character position in real-time
- Clicking anywhere on canvas hides active bubble and resets activity timer
- Keyboard input also resets activity timer
- Edge message has 10-second cooldown to prevent spam
- Hotspot speech only triggers once per hotspot until user hovers away and back
- Welcome bubble stays until user clicks (duration = 0)

### Hotspot Effects
- Proximity pulse uses x-distance only (600px threshold)
- Both top and bottom row hotspots pulse together if at similar x position
- Pulse resets when character moves 700px+ away from hotspot
- Small screen pulse (< 800px viewport) runs independently for touch device discoverability
