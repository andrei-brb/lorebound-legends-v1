

User wants me to design **new** Chat and Trade tabs (don't touch the old `ChatPanel`/`TradeUI`) so they can preview the new "no-boxes, seamless, scene-based" aesthetic before committing to a full redesign. Two new tabs in the nav, parallel to the existing ones.

Let me check what exists for trade and the nav structure to make sure I plug in cleanly.

I'll plan two pilot scenes that demonstrate the design language from my last message:
- **Chat → Tavern Hearth scene** (parchment notes, fire glow, no rectangles)
- **Trade → Moonlit Bazaar scene** (two facing pedestals, mist between, items float)

Both will be self-contained components, dropped into nav as **"Chat (new)"** and **"Trade (new)"** so the originals stay untouched for comparison.

---

## Plan — Pilot redesign: new Chat + Trade scenes

### What I'll build

**1. Shared primitives** (`src/components/scene/`)
- `SceneBackdrop.tsx` — full-bleed gradient + animated particle/ember layer + radial vignette. Props: `mood` (`hearth` | `moonlit` | `forge` | `vault`).
- `MistEdge.tsx` — SVG turbulence + radial mask used to dissolve content edges into the backdrop instead of using borders.
- `FloatingLabel.tsx` — inline carved/inked text for in-world labels (no chip/badge boxes).
- `GlowOrb.tsx` — round, pulsing element used for avatars, currencies, statuses.

These replace `<Card>` for the new tabs only. Existing tabs untouched.

**2. New tab: `ChatScene.tsx` — "The Hearth"**
- Scene: warm ember backdrop, hearth glow bottom-center, soft smoke drifting up.
- Channel switch (Global / Guild) = two **lanterns** hanging top-left; the lit one is active. Click to swap, the other fades.
- Messages = **parchment notes** drifting gently upward like embers from the fire. Each note has:
  - Torn-paper SVG edge (no rectangle)
  - Sender avatar = small `GlowOrb` with portrait
  - Inked handwriting-style text
  - Older notes fade and shrink toward the top, newest at the bottom near the fire
- Composer = a **quill resting on parchment** at the bottom. The input has no box — just an underline of ink that grows as you type. Send = the parchment curls and flies up into the message stream.
- Empty state = "The hearth is quiet…" floating above the flames.
- Uses existing `api.getChat` / `api.postChat` so it works immediately.

**3. New tab: `TradeScene.tsx` — "Moonlit Bazaar"**
- Scene: deep indigo night sky backdrop, moon top-center casting a vertical light beam, faint stars, mist on the floor.
- Two **stone pedestals** facing each other across the moonbeam: left = "Your Offer", right = "Their Offer". No card containers — just the pedestals carved into the scene with their tops glowing.
- Cards offered = float slightly above each pedestal, gently bobbing. Drag from your collection drawer (a **curtain that pulls up from the bottom** when you click a hanging tassel) onto your pedestal.
- Partner picker = three **silhouetted travellers** standing in the mist on the right; click one to open trade. (Wired to `api.listFriends` so it's real data.)
- Status indicator = the moonbeam **brightens** when both sides have locked their offer; a rune circle ignites on the floor when the trade is sealed.
- Confirm/Cancel = **two glowing runes** etched into the floor between the pedestals, not buttons.
- Uses existing trade endpoints (whatever `TradeUI` currently calls) — I'll mirror them.

**4. Nav integration** (`src/pages/Index.tsx`)
- Add two entries to the **Community** category sub-tabs: `chat-new` (label "Hearth ✨") and `trade-new` (label "Bazaar ✨").
- Keep existing Chat/Trade entries so user can compare side-by-side.
- Each new tab still wrapped in `TabTransition` for the camera-pan feel.

**5. Motion & accessibility**
- All ambient animation (ember drift, message float, pedestal bob) gated behind `settings.reduceMotion`. When off → static composition that still looks scene-like.
- Keyboard support: chat input focus, trade pedestals tab-navigable.
- Performance: SVG filters are static; only transform-based animations run in rAF.

### What stays untouched
Old `ChatPanel`, `TradeUI`, all other tabs, backend, schema, data. Pure additive UI experiment.

### Open question
Trade backend: I haven't re-read `TradeUI.tsx` yet to confirm exact API calls. If the existing trade flow turns out to need extra wiring (offer-locking, etc.) I'll match it exactly when I implement — no schema changes either way.

### After you see them
You tell me which feels right (or what to tweak: colors, motion, layout, scene metaphor). Once one direction is approved I'll roll the same primitives out to Friends, Guild, Profile, Daily, Collection, etc.

