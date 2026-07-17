# Video conferencing meeting — Melanie AI assistant

A simple quick prototype - as part of 50 minute design jam - where Google Meet gets an integrated in-call AI assistant, **Melanie**, who listens
to the meeting with the key feature of surfacing relevant context to particpants with the option to have these available as well in the meeting summary at the end of the call. Features of Google Meet included are dark theme, participant tiles, and control bar. The prototype shows Melanie already turned on for a meeting and her displaying as an active participant to emhpasize her impact and active participation (and listening), along with a dedicated side panel for users to interact with Melanie. 

**This is a mockup.** There is no real audio, camera, transcription, or meeting backend. The
meeting is a scripted simulation: participants are shown "speaking," captions play on a timer,
and Melanie's findings are canned. The point is to demonstrate the *experience* of an AI that
proactively surfaces context mid-meeting with actions, and not to wire up a fully working app.

**Live: https://danielone-labs.vercel.app/meet-melanie/**

Click anywhere in Melanie's panel to mimic Melanie surfacing relevant context mid-meeting.

## Running it

Open `index.html` in a browser — it's a single self-contained file (HTML/CSS/JS inline, fonts
from Google Fonts). No build step, no server required. Or serve the folder:

```
python3 -m http.server 8890
```

The layout is built for a wide desktop viewport, matching Google Meet, and for demo design & dev simplicity to focus on illustrating the concept.

## The scenario

The simulated call is a **system-downtime incident meeting** between two people — Sarah Jones and David Smith
— plus Melanie, the AI notetaker, joined as a third tile. Over ~30 seconds of a scripted exchange plays out about system issues ( Kubernetes / API-gateway outage), and Melanie reacts to it identifying key related issues she thinks the other attendees should be aware of. Sarah and David are then also presented with several actions they can take including relating the issues to the primary ticket, getting a summarized take on the impacts of selected issue(s), or the option to add these findings from Melanie to a meeting summary report at the end of the meeting. 


## Key features & interactions

- **Behavior indicator** — Melanie's tile shows a pulsing orb with expanding rings and a
  "Listening/Speaking/Thinking/Chatting" equalizer and staus; the panel header echoes it with a live status dot
- **Speaking participants** — Sarah and David load as active speakers, with animated mic-bar
  badges and a blue tile glow that follows whoever is talking. Live captions play beneath the
  stage.
- **Surfaced issues** — four related bugs appear as selectable cards, each with a priority
  badge (Critical / High / Low) and a status badge (Open / In Process / Closed). Actions (display only):
  **Link all related issues to primary**, **Summarize impact of selected issue(s)**, and
  **Consider later (add to meeting summary)**.
- **Chat** (display only) — a sticky message box at the bottom of the panel. Type a message and Melanie
  replies; typing **"Stop"** or **"Wait"** pauses her (animations freeze, status → Paused), and
  **"Resume"** starts her listening again

## Melanie's Panel

The AI assistant **Melanie** has dedicated panel with two tabs:
**Chat** where users can interact with the assistant through text when that is a preferred modality and which also shows interactive insights to the participants, and **Related documents** (display only) which displays related documents Melanie thinks are noteworthy throughout the conversation.

## Files

- `index.html` — everything: markup, inline styles, and the simulation script.

## What there wasn't time for
This was done as part of a quick design jam so there are a number of areas that didn't get touched on that would have with more time: 
- Better affordance that Melanie has meetings insight(s) to share with participants: currently there is a toast bubble that appears but it displays above the meeting controls. Better positioning or another affordance would be explored, such as introducing a state in Melanie's participant card with the option of Melanie speaking as well to get participants' attention and make it feel like she is a member of the team. This will build emotional connection with users and have them saying hopefully "don’t forget to invite Melanie to the meeting!"
- Currently all issues can be selected to link with the primary issue and individual issues can be selected but there is not proper control for linking just selected issues to the primary ticket. This can be easily solved with an additional action but other methods could be explored with additional time.
- Make Melanie's panel more clear that you can interact with Melanie via text or chat (leveraging Deepgram's APIs for example to power such)
- Include a first time user experience for inviting Melanie to the meeting where she can introduce herself and all the things she can do to help with a focus on surfacing relevant context mid-meeting for prototype purposes; introduce value opportunities to users. An embedded help affordance (e.g., help icon, tour icon) can be introduced as well to allow users to easily bring up such info.

## Design & implementation notes

- The prototype was built and designed with Claude Code with context from the the [AI-meeting-assistant Figma design](https://www.figma.com/design/XOuDRsSkSSiNhiAE79eNqb/AI-meeting-assistant?node-id=0-1&t=SOszNF5BIi8lvuKf-1) I included a sketch that I did in the Figma file to give some insight into my thinking about the workflow prior to getting down to pixels.
- All timing is simulated with `setTimeout`; there is no speech recognition or NLP. The
  "matched" reasons on cards and the bug list are hardcoded for the downtime scenario.
- Participant avatars are CSS gradients and letter/initial tiles, not real video.
- Google Meet's name, logo, and design language belong to Google; this is a personal design
  prototype for reference only.
