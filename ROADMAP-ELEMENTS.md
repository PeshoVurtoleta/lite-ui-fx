# lite-ui-fx -- element vocabulary gap analysis

What interactive elements does this package NOT yet have a visual for, and where
should each land? Researched 2026-09-07 against the sibling package
(@zakkster/lite-headless 1.8.0, 59 primitives), the W3C ARIA APG pattern index
(30 patterns), four dominant headless/component kits (React Aria, Radix
Primitives, Ark UI / Zag, shadcn/ui), and the copy-paste galleries (uiverse.io,
Aceternity UI, Magic UI, React Bits) for demand.

This is a planning input, not a session brief. Each accepted gap becomes (or
joins) a BRIEF the same way U2/U3 did. Nothing here changes shipped code.

---

## 0. Framing -- lite-ui-fx is a VISUAL layer, not a component kit

The package's whole pitch is "the native element handles accessibility; the
canvas handles visuals." So "a missing element" is NOT "a component lite-ui-fx
should reimplement." It is "an interactive control with a visual worth painting
on a canvas that has no first-class home here yet." Behaviour, focus management,
positioning, and dismiss stacks belong to @zakkster/lite-headless permanently
(ROADMAP.md law + U8/enrichment NON-GOALS). Data grids belong to lite-table.
Fullscreen atmospheres to lite-ambient-fx, reveals to lite-scratch-fx, charts to
lite-charts. The gap analysis is scoped to what THIS package can paint.

### The four delivery vehicles (an element must map to one, or be OUT)

- **V1 -- hijack `UIType`** (`mountUIFX`): a canvas over a native element the
  controller creates (`opacity:0`). Shipped: button, toggle, slider, checkbox,
  progress, knob.
- **V2 -- grouped control** (`mountUIFXGroup`, roadmap U7): N native elements +
  one canvas + one recipe. Planned: radio, tabs, stepper, rating (+ SegmentedSlide).
- **V3 -- decorate** (`decorateUIFX`, shipped U4b): a canvas AROUND a live
  element, driven by its own events. Shipped recipes: FocusHalo, ErrorShake,
  SuccessBloom, PasswordStrength, TypewriterField. Planned (E2): text-fx,
  pointer/cursor, card decorations.
- **V4 -- headless-skin** (`skinHeadless`, enrichment E1): paint over a
  lite-headless primitive through its painted `data-*` attribute contract, owning
  zero ARIA. Planned skins: meter, progress, rating, switch, slider, steps,
  pin-input, file-upload, toast, command-palette, color-picker.
- **OUT** -- routed to lite-headless / lite-table / lite-charts / the fx siblings.

---

## 1. Coverage matrix

Union of the lite-headless catalog + APG patterns + the four kits, mapped to a
vehicle. Status: SHIPPED / U7 / E1 / E2 / E3 (already in a roadmap slot), **GAP**
(paintable, no slot yet), or OUT (route elsewhere).

### Already covered or slotted

| element | category | status | vehicle / note |
| --- | --- | --- | --- |
| Button (+ variants) | native-control | SHIPPED | V1 -- many button recipes; the package's strongest, highest-demand family |
| Toggle / switch | native-control | SHIPPED | V1 UIType.TOGGLE |
| Checkbox (tri-state) | native-control | SHIPPED | V1 UIType.CHECKBOX (U4a) |
| Slider (single-thumb) | native-control | SHIPPED | V1 UIType.SLIDER |
| Knob / dial / angle-slider | composite | SHIPPED | V1 UIType.KNOB (U4a) -- a differentiator: only Ark ships this among the four kits |
| Progress bar | native-control | SHIPPED | V1 UIType.PROGRESS (U4a) |
| Meter / gauge | native-control | SHIPPED/E1 | V1 PROGRESS visual; E1 skins lite-headless meter |
| Password strength | composite | SHIPPED | V3 PasswordStrength (U4b) |
| Form field feedback (focus/error/success) | composite | SHIPPED | V3 FocusHalo/ErrorShake/SuccessBloom (U4b) |
| Typewriter / typed-text underline | native-control | SHIPPED | V3 TypewriterField (U4b) |
| Counter (value-driven) | display | SHIPPED | FlameCounter/GlitchCounter recipes |
| Radio group | composite | U7 | V2 -- re-home RadioOrbit |
| Tabs | composite | U7 | V2 -- re-home PillTabs |
| Number field / spinbutton / stepper | composite | U7 | V2 STEPPER = native `<input type=number>`; re-home Stepper |
| Rating | composite | U7 | V2 -- re-home BubbleRating |
| Segmented / toggle-group | composite | U7 | V2 new SegmentedSlide |
| Steps / wizard indicator | composite | E1 | V4 skin lite-headless steps |
| Pin / OTP input | composite | E1 | V4 skin (per-digit pop) |
| File upload | composite | E1 | V4 skin (progress burst) |
| Color picker | composite | E1 | V4 skin (canvas wheel -- visual IS a canvas job) |
| Toast | overlay-behavioral | E1 | V4 skin the entrance only; positioning/stack = lite-headless |
| Command palette | overlay-behavioral | E1 | V4 skin the frame/highlight only |
| Skeleton | display | E1 | V4 skin (shimmer) |
| Text-fx over live text | native-control | E2 | V3 shimmer/scramble/spotlight/underline |
| Card decorations | display | E2 | V3 border-beam/tilt-shine/spotlight |
| Cursor / pointer FX | -- | E2 | V3 magnetic/trail/proximity-glow |
| Spinner / loader family | display | E3 | 6 budget-aware loaders |

### GAPS -- paintable controls with no roadmap slot yet

| element | category | demand | recommended vehicle |
| --- | --- | --- | --- |
| **Dual-thumb / range slider** | composite | med (Aceternity Compare; RA/Radix/Ark all ship it; APG Slider Multi-Thumb) | **V1/V2** -- the clearest native-control gap; SLIDER is single-thumb. Two coordinated `<input type=range>` under one canvas |
| **Native `<select>` / dropdown trigger** | composite | high (every kit; uiverse) | **V4 or V1** -- decision needed: skin lite-headless combobox/listbox (open state) vs a SELECT hijack painting the closed trigger |
| **Date picker / calendar grid** | composite | med | **V4** -- add to E1; a canvas month-grid with day transitions is a strong canvas fit |
| **Time picker** | composite | med | **V4** -- add to E1 (lite-headless ships it; E1's list omits it) |
| **Accordion / disclosure** | composite | med | **V4** -- add to E1 (chevron rotate + height/reveal) |
| **Carousel / image slider** | composite | med-high (Aceternity Apple-Cards Carousel, Images Slider; React Bits) | **V4** -- add to E1 (slide + dots + parallax) |
| **Tag / token input** | composite | med | **V4/V3** -- skin lite-headless tag-input, or decorate a real input with token pops |
| **Dock / magnifying launcher** | composite | med (Magic UI, Aceternity Floating Dock, React Bits Dock) | **V3** -- add to E2 pointer family (proximity magnify) |
| **Marquee / ticker** | display | med (Ark, Magic UI, React Bits) | V3/recipe -- scrolling decoration; niche |
| **Number ticker / animated stat** | display | low-med (Magic UI Number Ticker, React Bits Counter) | recipe -- extend the counter family (E3); distinct from the slider-driven counters shipped |
| **Compare slider (before/after)** | composite | med (Aceternity Compare) | V1 SLIDER variant over two layers; niche but demand-verified |
| **Pagination** | composite | low | V4 skin; minor |

### Canvas-native white space (no kit unifies behaviour + visual; canvas IS the control)

These are where the package's canvas model is a genuine differentiator, but each
needs a little behaviour (capture/crop/scrub), so they sit between V1 and "a small
owned behaviour." Flagged as candidates, demand only partly verified.

| element | note | verified |
| --- | --- | --- |
| Signature pad | pointer capture -> stroke render; Ark ships it, no other kit does | Ark UI |
| Image cropper | draggable overlay over an `<img>`; Ark only | Ark UI |
| Media transport / scrubber | volume=KNOB + seek=SLIDER exist; a composite player is unserved by all four kits | absence verified; demand NOT quantified |

### OUT -- route elsewhere (this makes "missing" honest)

Most of a 59-primitive kit and most of the APG list are behaviour / overlay /
layout / data / pure display -- deliberately NOT lite-ui-fx's to own:

- **Overlay behaviour** (positioning + focus + dismiss): dialog, alert-dialog,
  popover, tooltip, hover-card, menu, menubar, context-menu, navigation-menu,
  drawer, tour, floating-panel, notification-center. -> lite-headless owns
  behaviour; lite-ui-fx may only skin the entrance/frame (E1), never the mechanics.
- **Layout / scroll util**: affix, anchor, back-top, split-panels (window
  splitter), toolbar, scroll-area, aspect-ratio, sidebar, breadcrumb, separator.
  -> lite-headless / CSS.
- **Drag-and-drop**: kanban, sortable, transfer-list. -> lite-dnd / lite-headless.
- **Data**: table, data-grid, treegrid, tree, feed / infinite-list, grid. ->
  lite-table / lite-headless.
- **Data-viz**: chart, sparkline, QR code. -> lite-charts / a data-viz sibling.
- **Static display**: badge, avatar (+ group), static card, descriptions,
  empty-state, result, banner, kbd, code-block, picture. -> CSS / lite-headless
  (a few gain flourishes via E2 card / the existing NotificationBell).

---

## 2. Recommended roadmap changes

Net finding: the roadmap already absorbs the bulk of the interactive vocabulary
(U7 groups + E1 skins + E2 decorations + E3 loaders). The concrete additions:

1. **U7 (grouped controls) -- add a dual-thumb / range slider.** It is the single
   clearest native-control gap (APG Slider Multi-Thumb; all four kits ship it;
   filters/price-ranges are ubiquitous). It is a two-thumb variant of the shipped
   SLIDER, so it fits the U7 group contract (N native elements, one canvas). Fold
   the before/after **compare slider** in as a second SLIDER variant if demand at
   build-time holds.

2. **E1 (headless-skin pack) -- enumerate the omitted skin targets.** E1 currently
   names ~11 skins; lite-headless ships ~59. Add to the E1 skin family, in demand
   order: **carousel, date-picker/calendar, accordion/disclosure, time-picker,
   tag-input**, then pagination. State plainly which lite-headless primitives are
   NON-targets (the OUT list above) so E1's scope is bounded, not open-ended.

3. **E2 (decorations) -- add the Dock (proximity-magnify) family and confirm
   textarea.** Dock is a distinct, demand-verified pointer decoration (Magic UI /
   Aceternity / React Bits) not covered by the current shimmer/trail/glow set. Note
   that the text-fx decorations must cover `<textarea>` (auto-resize / multiline),
   not only single-line inputs.

4. **E3 (catalog) -- scale the loader count and add the number-ticker.** uiverse
   lists ~718 loaders (the single largest category); E3's "6 new loaders" likely
   under-serves the strongest verified demand -- size it from the evidence at
   build-time. Add an animated **number-ticker / stat** recipe (distinct from the
   shipped slider-driven counters).

5. **New candidate (post-enrichment) -- canvas-native controls.** Signature pad +
   image cropper + a media-transport are the white space where NO kit unifies
   behaviour and visual and the canvas IS the control. They need a small owned
   behaviour (stroke capture / crop rect / scrub), so they do not fit V1-V4 cleanly
   -- worth their own decision record before any brief (does lite-ui-fx grow a
   fourth "owns a little behaviour" lane, or do these go to lite-headless first and
   get skinned via E1?).

6. **Decision to record -- `<select>` / dropdown.** Resolve whether the closed-state
   dropdown trigger is a SELECT hijack (V1, paints native `<select>`) or purely an
   E1 skin of lite-headless combobox/listbox. High demand; currently unslotted.

None of these are blockers; they extend the existing U7 / E1 / E2 / E3 sessions,
plus one new decision record and one post-enrichment candidate.

---

## 3. Demand snapshot (triangulated; caveats below)

Top visually-rich interactive controls by copy-paste ubiquity (proxied from
uiverse.io category counts + animated-gallery variant counts; ~Sept 2026):

| element | demand | source |
| --- | --- | --- |
| Button | high | uiverse ~1,000; Aceternity 7+ variants |
| Loader / spinner | high | uiverse ~718; Aceternity Multi-Step Loader |
| Toggle switch | high | uiverse ~260-456 (count disputed) |
| Card (3D / spotlight / expandable) | high | uiverse ~726; Aceternity 15+ |
| Text input (styled/animated) | med-high | uiverse ~226; Aceternity Gooey/Vanish Input |
| Checkbox | med | uiverse ~171 |
| Radio | med | uiverse ~102 |
| Carousel / image slider | med | Aceternity, React Bits |
| Tooltip / hover card | med | uiverse ~62; Aceternity Animated Tooltip |
| Slider (range/compare/elastic) | med | Aceternity Compare; React Bits Elastic Slider; Ark Angle Slider |
| Dock / floating bar | med | Magic UI, Aceternity, React Bits |
| Stepper / multi-step | med | Ark Steps; React Bits Stepper |

**Caveats (flagged by the research pass, carried honestly):** (a) the uiverse
toggle-switch count surfaced as both ~260 and ~456 and grows over time; (b) there
is no single citable "most-requested in design systems" ranking -- this table
triangulates category counts + gallery variant counts + cross-kit ubiquity, not
one authoritative source; (c) demand for the canvas-native white-space items
(signature/crop/transport/transfer-list/cascader/mentions) was NOT quantified --
only their absence from React Aria / Radix / Ark / shadcn was verified. Re-verify
before reprioritising, not before building (the enrichment-track rule).

---

## 4. Sources

- @zakkster/lite-headless 1.8.0 -- `LiteHeadless/llms.txt` (the 59-primitive catalog).
- W3C ARIA Authoring Practices Guide, Patterns index -- w3.org/WAI/ARIA/apg/patterns (30 patterns).
- React Aria Components -- github.com/adobe/react-spectrum (source surface).
- Radix Primitives -- radix-ui.com/primitives/docs/components (32 components).
- Ark UI / Zag -- ark-ui.com (53 components).
- shadcn/ui -- ui.shadcn.com (~65 components).
- Demand: uiverse.io category counts; Aceternity UI (~130 items); Magic UI (~90);
  React Bits (110+). All fetched ~Sept 2026.
