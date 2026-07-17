# Meet — Melanie AI assistant

A prototype of Google Meet with an integrated in-call AI assistant, **Melanie**, who listens
to the meeting and surfaces relevant context in a side panel. Built from the
[AI-meeting-assistant Figma design](https://www.figma.com/design/XOuDRsSkSSiNhiAE79eNqb/AI-meeting-assistant?node-id=1-2),
reproducing the Meet dark theme, participant tiles, control bar, and side panel — with the
"Meeting tools" panel reworked into Melanie's assistant surface.

**This is a mockup.** There is no real audio, camera, transcription, or meeting backend. The
meeting is a scripted simulation: participants are shown "speaking," captions play on a timer,
and Melanie's findings are canned. The point is to demonstrate the *experience* of an AI that
proactively surfaces context mid-meeting, not to wire up a working one.

**Live: https://danielone-labs.vercel.app/meet-melanie/**

## Running it

Open `index.html` in a browser — it's a single self-contained file (HTML/CSS/JS inline, fonts
from Google Fonts). No build step, no server required. Or serve the folder:

```
python3 -m http.server 8890
```

The layout is built for a wide desktop viewport, matching Google Meet.

## The scenario

The simulated call is a **system-downtime incident meeting** between two people — Sarah Jones
and David Smith — plus Melanie, the AI notetaker, joined as a third tile. Over ~30 seconds
a scripted exchange plays out about a Kubernetes / API-gateway outage, and Melanie reacts to it.

## What Melanie does

- **Listening indicator** — Melanie's tile shows a pulsing orb with expanding rings and a
  "Listening" equalizer; the panel header echoes it with a live status dot.
- **Speaking participants** — Sarah and David load as active speakers, with animated mic-bar
  badges and a blue tile glow that follows whoever is talking. Live captions play beneath the
  stage.
- **Click to discover** — clicking anywhere in the Melanie panel triggers the core moment: the
  meeting clock jumps forward (time elapsed), a transient amber coach-mark points the way, and
  Melanie posts a chat message announcing she's found related bugs contributing to the
  Kubernetes downtime — anchored to a primary ticket (`JIRA-4021`).
- **Surfaced issues** — four related bugs appear as selectable cards, each with a priority
  badge (Critical / High / Low) and a status badge (Open / In Process / Closed). Actions:
  **Link all related issues to primary**, **Summarize impact of selected issue(s)**, and
  **Consider later (add to meeting summary)**.
- **Chat** — a sticky message box at the bottom of the panel. Type a message and Melanie
  replies; typing **"Stop"** or **"Wait"** pauses her (animations freeze, status → Paused), and
  **"Resume"** starts her listening again.

## Panel layout

The right-hand panel is titled **Melanie** with an **AI Assistant** subhead, and has two tabs:
**Chat** (the assistant thread and issue feed) and **Related documents**.

## Files

- `index.html` — everything: markup, inline styles, and the simulation script.

## Notes

- All timing is simulated with `setTimeout`; there is no speech recognition or NLP. The
  "matched" reasons on cards and the bug list are hardcoded for the downtime scenario.
- Participant avatars are CSS gradients and letter/initial tiles, not real video.
- Google Meet's name, logo, and design language belong to Google; this is a personal design
  prototype for reference only.
