// The fixtures are strings and not .md files because Biome formats Markdown under tests/, and a
// formatted fixture is no longer the page the test was written for.

// A page of about 350 words that breaks no rule.
export const CLEAN_PAGE = {
  path: "content/schemes/cover-3-sky.md",
  text: `---
title: Cover 3 Sky
summary: A three-deep zone coverage that rotates the strong safety down and sends the free safety to the middle of the field.
type: scheme
---

Cover 3 Sky is the base zone coverage of many four-man-front defenses. Three defenders split the deep part of the field into thirds, and four more cover the underneath zones. The "sky" call tells the strong safety to rotate down, so he plays the flat on the passing strength instead of dropping deep.

## Assignments

The two cornerbacks take the deep thirds on the outside. The free safety backs up the middle third and reads the quarterback's eyes. Against a 3x1 formation, the free safety also has to be ready for a vertical route from the single receiver.

- The strong safety plays the curl-to-flat zone on the side of the tight end.
- The Mike linebacker drops to the hook zone in the middle and gets depth quickly.
- The weak linebacker takes the opposite hook, and the Will works to the weak flat.

Every defender plays his zone first and then the man who enters it.

## What it takes away

Cover 3 Sky is built to stop the deep ball. With three players over the top and the safety deep in the middle, a vertical route has to beat two defenders. Coaches who run it also like that eight players can fall back against the run when the quarterback hands off, because the strong safety is already close to the line.

Bill Belichick has described the value of matching routes in a zone call in an [interview about pattern matching](https://example.com/belichick-interview). Many staffs now teach Cover 3 that way, with the corners passing the receiver off to the safety once he crosses their deep third.

## Where it gets beaten

The seams are the weak point. A tight end running up the seam between the hook defender and the deep third can sit down in the open space, and the strong safety cannot always reach him. Four verticals put four receivers on the three deep zones at once.

| Route | Zone it attacks | Defender who answers |
| --- | --- | --- |
| Curl | Hook | Mike or Will |
| Flat | Flat | Strong safety |
| Seam | Between hook and deep third | Free safety |
| Go | Deep third | Cornerback |
`,
};

// Prose written the way a page of the wiki is: about 530 words on one technique. It must raise no finding.
export const LONG_PAGE = {
  path: "content/techniques/inside-zone-blocking-rules.md",
  text: `---
title: Inside zone blocking rules
summary: How offensive linemen choose a block on an inside zone play, and what the rules ask of the line.
---

Inside zone is the run that most offenses in football build their ground game on. The offensive line does not block a fixed man. Each lineman follows a short list of rules that tells him whom to block based on where the defenders line up and how they move after the snap. This page walks through the rules in the order a lineman applies them.

## The aiming point

The running back aims for the outside hip of the guard on the playside. Linemen step at a certain angle, not straight ahead, so the whole line moves in the direction of the play. Most coaches call the first step a "zone step" and want it short, about six inches, so the lineman stays balanced and keeps his shoulders square.

The reason for the short step is that a lineman who reaches far with his first foot loses his base. A defender can then split him or slip around his outside shoulder.

## Rules for each lineman

The center and the two guards work in pairs. When a defensive lineman lines up on the playside shoulder of a lineman, that lineman has him alone. When the defender lines up in a gap between two blockers, both blockers have him until one of them can leave for a linebacker.

1. Look at the man playside of you first.
2. If a defender is over you or in your playside gap, block him.
3. If no defender is there, help your neighbor, then climb to the linebacker.
4. If the defender slants away, follow him with your eyes and take the next level.

The double team is where most of the work gets done. Two linemen drive the defender back together and keep their hips close, and the one who is better placed to see the linebacker peels off first. Coaches usually call this the "combo" block and spend a lot of practice time on its timing.

## The tackle and the tight end

The playside tackle has the same rules as the guards, but he often has a wider defender to deal with. The tight end blocks the defender on the end of the line, and if the defensive end slants inside, the tackle takes him while the tight end works up to the linebacker.

The backside tackle uses a cutoff block. His job is to stop the defender from chasing the play from behind. He steps with the same zone step, but he aims at the playside number of the defender, so the defender cannot run through the gap and tackle the back.

## Common mistakes

Linemen who watch only the defender in front of them miss the stunt. A defensive tackle looping to the other side will beat the block if the guard stays locked on the man he started with. The fix is to keep the eyes on the second level and feel the pressure with the hands.

Another mistake is a lineman climbing to the linebacker too soon. If the double team has not moved the defender, the defender stays in the gap, and the back has nowhere to go. Coaches teach the lineman to feel the defender's hips move before he leaves.
`,
};

// A page of the terms type that breaks each of the twelve rules once.
export const TRIP_PAGE = {
  path: "content/terms/trip-everything.md",
  text: `---
title: Trip everything
summary: A page that breaks each mechanical rule once.
---

## Overview

The safety reads the quarterback and breaks on the ball. A corner keeps his eyes on the receiver and his feet under him. The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time.

The corner jams the receiver — then falls off the route.

A corner keeps his eyes on the receiver and his feet under him. The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time. The line rushes four men and keeps the quarterback inside the pocket.

The corner is very quick off the line.

The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time. The line rushes four men and keeps the quarterback inside the pocket. Coaches teach the drop with a bag and a short count of steps.

- **Mike**: the middle linebacker.

Each defender passes the receiver to the next zone at the right time. The line rushes four men and keeps the quarterback inside the pocket. Coaches teach the drop with a bag and a short count of steps. The nickel back covers the slot and widens with the inside receiver.

The defensive coordinator told the room that the safety must read the quarterback, break on the ball, pass the receiver to the next zone, and keep his eyes on the receiver while the linebackers drop to their landmarks.

The line rushes four men and keeps the quarterback inside the pocket. Coaches teach the drop with a bag and a short count of steps. The nickel back covers the slot and widens with the inside receiver. A good tackler arrives with his head up and his feet wide.

> A line from a coach.

Coaches teach the drop with a bag and a short count of steps. The nickel back covers the slot and widens with the inside receiver. A good tackler arrives with his head up and his feet wide. The safety reads the quarterback and breaks on the ball.

He said "Run it. Run it now." in [a clinic talk](https://example.com/talk).

The nickel back covers the slot and widens with the inside receiver. A good tackler arrives with his head up and his feet wide. The safety reads the quarterback and breaks on the ball. A corner keeps his eyes on the receiver and his feet under him.

He said "run it to the right" on film.

A good tackler arrives with his head up and his feet wide. The safety reads the quarterback and breaks on the ball. A corner keeps his eyes on the receiver and his feet under him. The linebackers drop to their landmarks and watch the guards.

The back runs Z -> flat on the call.

The safety reads the quarterback and breaks on the ball. A corner keeps his eyes on the receiver and his feet under him. The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time.

![A diagram of the shell](shell.png)

A corner keeps his eyes on the receiver and his feet under him. The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time. The line rushes four men and keeps the quarterback inside the pocket.

A **zone** call and a **man** call.

The linebackers drop to their landmarks and watch the guards. Each defender passes the receiver to the next zone at the right time. The line rushes four men and keeps the quarterback inside the pocket. Coaches teach the drop with a bag and a short count of steps.
`,
};

// A note on a source: a list of points, which may be wordy and carry dashes and labels.
export const GOOD_NOTE = {
  path: "sources/notes/clinic-talk.md",
  text: `---
title: Clinic talk on Cover 3
---

- **Premise**: the speaker builds the call around the free safety.
- The speaker says the corners "bail on the snap" when the split is wide, which he calls a very common error.
- Route on the sideline -> flat, then a post, as he draws it.
- Three coverage rules, in his words: read the quarterback, keep leverage, and pass the route off.

Source: [the talk](https://example.com/clinic-talk).
`,
};

// A note that copies a block, a figure and a long quotation.
export const COPIED_NOTE = {
  path: "sources/notes/copied.md",
  text: `> The first rule of the zone is to play the ball in the air and the
> second rule is to tackle the man who catches it.

![Cover 3 diagram](cover-3.png)

The coach says "Play the ball in the air. Then tackle the man who catches it." in the talk.
`,
};
