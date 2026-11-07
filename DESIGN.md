---
name: Sinking Funds
description: A personal, paycheck-by-paycheck money planner.
colors:
  sage: "#3f5c3a"
  sage-deep: "#344d30"
  sage-field: "#d8e2c8"
  sage-shape: "#cfdabd"
  sage-frame: "#8c9e78"
  sage-ink: "#1d2a1e"
  sage-ink-muted: "#43533f"
  sage-input: "#f4f6f0"
  sage-input-line: "#7f9070"
  sage-error: "#a3261f"
  accent-purple: "#6f42c1"
  accent-purple-soft: "#f3eefb"
  accent-blue: "#007bff"
  accent-blue-deep: "#0056b3"
  over-red: "#c92a2a"
  over-red-soft: "#fff5f5"
  debt-red: "#dc3545"
  debt-red-soft: "#ffe6e6"
  nav-charcoal: "#333333"
  nav-active-green: "#04aa6d"
  test-amber: "#b45309"
  ink: "#212529"
  ink-secondary: "#495057"
  ink-muted: "#6c757d"
  line: "#e9ecef"
  line-strong: "#dee2e6"
  surface: "#ffffff"
  surface-muted: "#f8f9fa"
  page: "#f2f2f2"
typography:
  display:
    fontFamily: "Castoro, Georgia, serif"
    fontSize: "clamp(2.75rem, 5.6vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Arial, sans-serif"
    fontSize: "2em"
    fontWeight: 700
  title:
    fontFamily: "Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
  body:
    fontFamily: "Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.35
  label:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
  figure:
    fontFamily: "Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  money-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "38px"
    width: "132px"
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "52px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  nav-bar:
    backgroundColor: "{colors.nav-charcoal}"
    textColor: "#f2f2f2"
    padding: "14px 16px"
  nav-bar-test:
    backgroundColor: "{colors.test-amber}"
    textColor: "#ffffff"
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-sage:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.surface}"
    rounded: "10px"
    height: "50px"
  balance-chip:
    backgroundColor: "{colors.debt-red-soft}"
    textColor: "{colors.debt-red}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Sinking Funds

## Overview

**Creative North Star: "The Kitchen-Table Planner"**

The app should feel like sitting down at your own kitchen table on payday with a notepad and a calculator: personal, unhurried and approachable, never corporate or bank-like. It's your money in your words ("bucket", "leftover", "covered"), laid out so you can see the whole paycheck at a glance and trust the arithmetic without checking it twice.

**Direction decided (2026-11-06): the app is moving to muted sage green.** The **Login** page (`components/whole-view/Login/`) is the first surface built in it: a sage field with soft organic shapes, Castoro serif display type, and a deep-sage primary button. Other pages move to green gradually; purple and blue are now legacy accents.

The visual system is **mid-redesign**. The **Budget Categories** page (`components/whole-view/BudgetCategories/`) is the reference for the new direction:
- one calm list per job, on white panels over a light gray page
- the running math pinned beside the work
- numbers in tabular figures
- a single large "result" figure

The other pages still use the older, more decorative style: gradient buttons, hover glows, uppercase micro-labels, each page with its own card treatment. New work follows the Budget Categories direction, and older pages move toward it as they're touched.

The North Star is the target. The current neutrals are cool Bootstrap grays, and nothing warmer has been chosen yet. Don't invent warm colors, illustrations or handwriting fonts to fake the feeling. The warmth comes from plain language, generous spacing, and copy that talks to you ("Every dollar is assigned.").

**Key Characteristics:**
- Light gray page (`page`) with white panels; one accent at a time on any given page
- Lists of rows (name on the left, money input on the right), not one card per item
- Money always in tabular figures, right-aligned, with a muted `$` sign
- The result of every calculation is visible without scrolling (a pinned panel, or a bottom bar on narrow screens)
- Plain-language states for good and bad outcomes ("Over budget by", "Every dollar is assigned")

## Colors

A neutral base moving to **muted sage green** as the one app-wide color. Purple and blue remain on pages that haven't been redesigned yet.

### Primary: Sage (the direction)
- **Sage** (`sage`, hover `sage-deep`): primary buttons, focus rings (as a 28% wash), links. White text on it is 7.5:1.
- **Sage Field** (`sage-field`) with **Sage Shape** (`sage-shape`): the soft ground and its organic-shape pattern. These two stay close in tone so the pattern never competes with text.
- **Sage Frame** (`sage-frame`): the outer page color around an inset field.
- **Sage Ink** (`sage-ink`) and **Muted Sage Ink** (`sage-ink-muted`): text on sage grounds (11:1 and 6.1:1 on the field).
- **Sage Input** (`sage-input`, border `sage-input-line`): input fills on sage-themed surfaces. The border clears the 3:1 non-text minimum.
- **Sage Error** (`sage-error`): error text and invalid-field borders on sage surfaces.

### Legacy accents
- **Ledger Purple** (`accent-purple`): retired. Credit Cards and Budget Categories are now sage.
- **Savings Blue** (`accent-blue`, deeper `accent-blue-deep`): retired. Every page is now sage.

> **Decided:** muted sage green replaces both purple and blue. Redesign a page into sage as a whole. Until a page is redesigned it keeps its existing accent; never mix accents on one page.

### Semantic
- **Over-Budget Red** (`over-red`, tint `over-red-soft`): only for a negative result (Leftover below zero) and destructive hover states such as the delete button. Always paired with words, never color alone.
- **Debt Red** (`debt-red`, tint `debt-red-soft`): the older Credit Cards balance chip. It's legacy; prefer Over-Budget Red in new work.
- **Nav Active Green** (`nav-active-green`): the active-link state in the navbar and on the login button.
- **Test Amber** (`test-amber`): reserved for the test instance's navbar and "TEST DATA" badge. Never use it for anything else, so it can't be mistaken for real data.

### Neutral
- **Ink** (`ink`): primary text, row names, totals.
- **Slate** (`ink-secondary`): secondary text, labels in the math panel.
- **Muted Slate** (`ink-muted`): hints, the `$` sign, units ("per paycheck"), notes under results.
- **Hairline** (`line`): row dividers and panel borders.
- **Firm Hairline** (`line-strong`): input borders and subtotal rules.
- **Paper** (`surface`): panels, lists, inputs.
- **Soft Paper** (`surface-muted`): the older card fill on Credit Cards and some summary boxes.
- **Table Gray** (`page`): the page background.
- **Charcoal** (`nav-charcoal`): the navbar.

**The One Accent Rule.** Each page uses exactly one accent color. Red appears only when something is actually wrong.

**The Words-Not-Just-Red Rule.** A bad state always changes the label too ("Over budget by $42.10"), not just the color.

## Typography

**Display Font:** Castoro (with Georgia, serif fallback), self-hosted from `src/assets/fonts/` under the SIL Open Font License. Used only for display: headlines, the wordmark, and card titles. Never for body text, labels or numbers.
**Body Font:** Arial (with sans-serif fallback), set on `body` in `src/index.css`. That file also holds the Castoro `@font-face` and the global sage tokens (`--sage`, `--sage-ink`, `--line`, `--serif`, and so on), the only intentionally global styles.

**Character:** one plain, familiar sans for everything. Hierarchy comes from size and weight, not from mixing typefaces.

### Hierarchy
- **Display** (Castoro 400, fluid up to 4.75rem, line-height 1.04): the welcome headline on sage surfaces. One per page at most.
- **Headline** (700, 2em): the centered page title (`h1`), one per page.
- **Title** (700, 1.25rem): section headings such as "Categories" and "Paycheck setup", left-aligned, with the section's total on the right of the same line.
- **Body** (500, 1rem, line-height 1.35): row names and input values.
- **Label** (600, 0.8–0.95rem): small labels above values, like "Leftover" or "Available" in the bottom bar. Sentence case.
- **Figure** (700, 2.25rem, tabular): the one result number on a page, such as Leftover.

**The Tabular Money Rule.** Every money value uses tabular figures (`font-variant-numeric: tabular-nums`) and lines up on the right, so columns of amounts can be scanned.

**The Serif Heading Rule.** Every page title and section heading, including collapsible section headers, is Castoro, regular weight (page titles about 2.6rem, section headings 1.35–1.6rem): Sinking Funds, Budget Categories ("Categories", "Paycheck setup", "This paycheck"), Credit Cards, Dashboard. Buttons stay in the sans.

**The One Edge Rule.** In a list, a section's total and its rows' amounts share one right edge, and the heading and row names share one left edge (Budget Categories uses a 16px inset for both).

**The Sentence Case Rule.** Labels are sentence case ("Pre-tax benefits"). The older uppercase, letter-spaced micro-labels ("POSTED", "AMOUNT PER PAYCHECK") are legacy and shouldn't be copied into new work.

## Layout

- **Width:** content is centered with a max width of about 1100–1200px and 24px side padding (16px on narrow screens).
- **Work page pattern:** a two-column grid, with the working list in a flexible main column and a 320px results panel on the right that stays pinned 72px from the top (clearing the sticky navbar). Columns are 32px apart.
- **Spacing rhythm:** 4 / 8 / 16 / 24 / 32 / 48px. 48px separates major sections; 12–20px separates a heading from its list or from collapsible sub-sections.
- **Rows:** at least 52px tall, with a 1px hairline between them and no gap. A list reads as one object.
- **Narrow or zoomed in (below 900px):** a single column. The results panel turns into a bar pinned to the bottom of the screen that expands when tapped, and the page gets extra bottom padding so the bar never covers the last row.
- **Navbar:** sticky (never `position: fixed` with a hardcoded offset) and wraps onto two lines when the window is narrow.

**The Zoom-Proof Rule.** No layout styles (flex centering, `height: 100vh`) on `body` or `#root`, and no hardcoded navbar offsets. Every page must stay fully reachable at 200% zoom.

## Elevation & Depth

A mostly flat system: depth comes from white panels on the light gray page, plus very soft, low shadows. Stronger shadows are for things that genuinely float.

- **Resting** (`0 1px 2px rgba(33,37,41,0.04)`): lists and panels at rest. Barely there; the border does most of the work.
- **Pinned** (`0 6px 20px rgba(33,37,41,0.06)`): the pinned results panel.
- **Floating** (`0 -6px 24px rgba(33,37,41,0.12)` upward, `0 12px 28px rgba(33,37,41,0.18)` downward): the bottom bar on narrow screens, and a row being dragged.

**The Earned Shadow Rule.** A shadow means the thing is above the page: pinned, dragged or open. Shadows don't signal hover. The older zero-offset blue hover glow (`0 0 8px rgb(0,140,255)`) is legacy and shouldn't spread.

## Shapes

Gently rounded, never pill-shaped except for circular icon buttons.
- **Inputs:** 6px corners.
- **Older cards and buttons:** 8px.
- **Lists:** 10px.
- **Panels:** 12px.
- **Icon buttons:** circles (50%).

Borders are 1px hairlines. The 2px colored borders on older inputs and chips are legacy.

## Components

### Money input
Quiet until you touch it.
- **Shape:** 6px corners, 38px tall, 132px wide (116px on narrow screens).
- **Style:** white with a 1px firm-hairline border. The value is right-aligned in tabular figures, with a muted `$` on the left inside the box.
- **States:** the border tints sage on hover. On focus it turns accent sage with a 3px soft sage ring, and the whole value is selected. Enter saves, the same as leaving the field.
- **Behavior:** totals update as you type; the value is saved once, when you leave the field, and only if it changed.

### List rows
- **Structure:** drag handle (a grip icon, gray until hovered), name, money input, then a delete button.
- **Delete:** hidden until the row is hovered or has keyboard focus (intentional), then a circular icon button that turns red on hover.
- **Container:** rows sit inside one white, 10px-rounded list with hairline dividers. Adding happens in a borderless last row ("Add a category…"); press Enter to add.

### Lock / unlock (Budget Categories)
A pill button in the page header. **Locked is the default** (remembered per browser): amounts show as right-aligned tabular text in the same column the inputs use, and drag handles, delete, and the "Add…" rows are hidden, giving a clean read-only view. **Unlock to edit** restores the inputs; the button turns solid sage and reads **Lock**.

### Tools dock (every page after login)
Two quiet round buttons pinned bottom-left (calculator, notes); each turns solid sage while its panel is open. Panels are white, 12px corners, floating shadow, Castoro titles, and open above the dock, side by side when both are open (stacking on narrow screens). The dock lifts above bottom-pinned bars (the Sinking Funds reconcile bar; the Budget Categories phone bar).
- **Calculator:** immediate-execution keypad (C, backspace, %, ÷ × − +, ±, ., =) with keyboard input while focused, a tape of the last 8 lines, and Copy result. Money-like results keep cents ("192.98 + 86.12 = 279.10"). Never `eval`; nothing saved.
- **Notes:** one autosaving notepad stored in the database (`notes` table), with "Saved 9:40 PM" / retry status.

### Credit Cards
Sage, Budget Categories structure: Castoro title with the Lock / Unlock pill (locked by default), one card list with column heads (Posted · Pending · Covered · Balance) on shared edges, balances in ink (red plus "over-covered" only when negative). Pending and Covered are toggles that expand the row inline to their transactions (description, amount, source tag: Venmo / Future / Actual / custom, words always shown in sage tints); editable with Save / Cancel when unlocked. Pinned "Cards vs bucket" panel: Total owed − Allocated = big Net change with words ("Move into the bucket" in red when short, "Bucket covers your cards" in sage when ahead); bottom bar below 900px.

### Dashboard (home)
- **Needs doing:** a short action list, one row per item (icon tile, one sentence with the key figure bolded, an outlined pill button with an arrow): log the paycheck whose plan start has passed (opens Sinking Funds with the log panel via `?log=1`), move $X into the bucket, N goals need recalculating, goals due within 30 days or past due (up to 3, then "and N more"). Nothing pending: a sage "All caught up ✓ · Next paycheck: Fri, Nov 13" strip.
- **At a glance:** two panels. *Sinking funds*: total saved (Figure style) of total goals, progress bar, Per paycheck / Funded / Progress, then **Where the next paycheck goes**, a thin segmented bar (2px surface gaps, 4px end radius) with a swatch list of name, amount and share, hover linking the two; max 6 parts, the tail folds into "Other". *Cards vs bucket*: the same net-change readout as Credit Cards.
- **Finishing next paycheck:** a third panel under Cards vs bucket listing unfunded goals whose next planned contribution covers what's left (icon tile that jiggles on hover, name with the payday, "+$20.00 of $240.00" in sage); links to each goal. Empty: "No goals finish with the next paycheck."
- **Chart colors (categorical, fixed order, validated with the dataviz checks: lightness band, chroma, CVD and normal-vision separation, ≥3:1 on white):** `#2e7d4f` green, `#2d6cb5` blue, `#cf6b25` orange, `#7b59c9` violet, `#b8407f` rose, `#6f7f12` olive; "Other" `#8b9586`. Color follows the goal (list order), not its rank. Text stays in ink, never the series color.

### Results panel ("This paycheck")
The signature component.
- **Content:** a label/amount list with muted minus signs for deductions, a bold subtotal between firm hairlines, and a 2px ink rule above the final figure.
- **Final figure:** in the accent color when healthy, red with an "Over budget by" label when negative, and "—" with a prompt when there's nothing to calculate yet.

### Collapsible section
A full-width text button: chevron (rotates 90° when open), title-weight label, and the section's total on the right. The total stays visible while the section is collapsed. Open/closed state is remembered between visits.

### Navigation
- **Style:** a floating white capsule (30px corners, 1px hairline, soft shadow) on a page-colored band, sticky at the top (never `position: fixed`). Left: the jar mark in a solid sage circle + "Sinking Funds" in Castoro. Middle: page links in the sans (**Overview · Sinking Funds · CC Payment · Paycheck**; page titles match the tab names); the current page is a soft sage pill (`sage-tint`, sage text, 600), and a goal's detail page counts as Sinking Funds. Right: an icon-only **Log out** button (round, outlined; labelled for screen readers and on hover).
- **Tab motion (user-requested):** the current tab sits on a single **glass pill** (translucent sage over a white sheen, `backdrop-filter: blur(10px) saturate(160%)`, bright inset top edge, faint sage rim). Changing tabs, it glides straight to the new tab in one smooth move (320ms, expo-out; a stretch-across variant was tried and dropped as too much); it jumps without animating on first paint, resize, or a wrapped second row. The page itself changes through a View Transition: content fades out with a 14px slide and the new page fades in from the other side, in the direction of travel, while the nav, tools dock and TEST badge stay still. Both are off under `prefers-reduced-motion`, and browsers without View Transitions just navigate.
- **Test instance:** amber (`test-amber`) 2px outline and a small uppercase TEST tag beside the wordmark (plus the TEST DATA corner badge).
- **Narrow / zoomed:** links drop to their own row inside the capsule; the wordmark hides under 420px. `--nav-height` (index.css) is what pinned panels offset from.

### Sinking Funds (overview and goal detail)
The second sage surface: working-page structure from Budget Categories, color and serif from Login.
- **Header:** Castoro page title, then the per-paycheck total in the Figure style (2.25rem, 700, tabular), then the primary **Log this paycheck** button.
- **Status pill:** one line on a sage wash naming the earliest plan start across goals: "Earliest plan starts with the Fri, Oct 30 paycheck" (each row shows its own "starts Nov 13" in the detailed view, or in either view when goals differ). It's backed by `plan_start` (the first payday on or after `calculated_from`) from the API. Hovering the pill (or keyboard focus; always shown on touch) reveals **Recalculate: Oct 29 · last / Nov 12 · next** in the same line, taking no space until then. Each option starts the day before its payday, so that payday is counted. Out-of-date goals are counted in words. No amber.
- **One plan model:** a goal's first planned paycheck is the one every "Log" action fills ("Log the Oct 30 paycheck"). Logging then moves the plan to start the day after it, so the schedule drops that row and paychecks left decrements. Hand edits (amount, due date, saved, name, icon) keep the plan start; only logging or Recalculate move it. The detail schedule always starts at the plan start, with its first row tagged **Log next**.
- **Goal row:** drag grip, a 40px icon tile (lucide line icon on `sage-tile`, 12px corners), name, 6px sage progress bar, "$X of $Y · N%", per-paycheck amount, due date with "N paychecks left", and a pill **+ $amount** button for a one-off log. Funded goals show a Funded chip and drop the button; past-due goals show "$X still needed" with a red **Past due** label and offer the remainder. Delete appears on hover, top-right, and always below 900px. Rows reflow into a two- or three-line grid on narrow screens.
- **View switch:** an on/off **More detail** switch above the list (role="switch", sage track when On, "On"/"Off" text beside it); **On is the default** (remembered per browser). On shows each goal's "starts <date>" under its per-paycheck amount and each goal as "$192.98 + **$86.12** = **$279.12**", with the paycheck's part as a lighter sage extension of the progress bar.
- **Update saved amounts (edit mode):** a quiet button beside "Log this paycheck" turns every row's saved amount into a money input in place ("$[ 192.98 ] of $537.45 · 35%"). Changed rows get a faint sage wash and "was $X". Log buttons, drag, delete, the view toggle and the Add row hide while editing. A pinned reconcile bar shows **Total saved · Bucket · Difference** live ("Matches your bucket ✓" or "$13.70 less than the bucket"), with Cancel and **Save changes (N)**. Saving writes only changed goals, each keeping its plan start, then shows "Updated N goals · Undo". Enter moves to the next goal; Esc asks before discarding.
- **Log panel:** an inline card (not a modal) titled with the payday ("Log the Nov 13 paycheck"), with a checkbox and an editable amount per goal and a running total. Confirming shows a dark toast, "Logged $X to N goals · Undo". Undo lasts until you leave the page.
- **Goal icons:** a curated set of about 30 lucide icons (`SinkingFunds/goalIcons.js`); old emoji codes map to the nearest icon. Pick from a 6-column popover grid.
- **Funded celebration:** a short confetti burst (canvas, ~2s, sage + chart colors, never blocks clicks) only when an action pushes a goal from below its goal to funded (logging, bulk saved-amount edits, detail-page edits), never for top-ups of an already-funded goal and never on undo. The toast adds "X is fully funded!". Skipped under `prefers-reduced-motion`.
- **Signature motion, user-pinned:** the old card "jiggle" is kept on purpose. The icon tile rocks (0.5s, scale 1.08, -7°) while its row or the Add row is hovered. It's disabled under `prefers-reduced-motion`. The detector flags it as bounce easing; that flag is overridden by the owner's preference.
- **Detail page:** back link, large icon tile with an editable Castoro name, a 10px progress bar, Saved/Goal/Due inputs that save on blur, a Per-paycheck readout with "calculated from <date>", **Log one paycheck** plus Undo, and a "Plan by paycheck" table in whole cents (Next row highlighted, "Goal reached" on the row that reaches it). **Delete goal** is muted and turns red only on hover or focus.

### Login and brand mark
The first sage surface, and the reference for the new direction.
- **Composition:** a frame-colored page with a 24px-rounded inset field carrying the organic pattern (`src/assets/login-pattern.svg`: soft, closed, rounded forms at two scales and two close greens, with no hooks or points). Welcome on the left (mark, Castoro wordmark, display headline, one muted line), and a white 20px-radius card on the right. It stacks below 900px and uses a minimum height, never a fixed one.
- **Card:** a Castoro title, labels above the fields (no placeholder-only fields), 48px inputs with 10px corners and a sage focus ring, a show-password eye button, and a full-width sage button that reads "Logging in…" on a deeper sage while submitting.
- **Errors:** plain-language text under the fields. Only a credential mismatch marks the fields invalid; a server error doesn't.
- **Brand mark** (`JarMark` in `Login.js`): an open jar with three edge-on coins stacked inside and one coin above the mouth. Single color (`currentColor`), 2px stroke on a 32 grid. Reads at 16–96px; intended to become the favicon.

### Buttons (legacy)
- **Primary:** the Recalculate button, a blue gradient with a lift-on-hover shadow. It predates the redesign. New primary buttons should be a flat accent color with an 8px radius and no gradient.

## Do's and Don'ts

### Do:
- **Do** say when numbers were calculated and which paycheck they start from, and offer the fix right there (the Sinking Funds status pill).
- **Do** take color, display type, and the field-and-card treatment from the Login page, and working-page structure from Budget Categories.
- **Do** follow the Budget Categories page for new or redesigned pages: rows inside one list, money inputs, results pinned beside the work.
- **Do** use tabular figures and right-alignment for every money value.
- **Do** say the state in words ("Over budget by $42.10", "Every dollar is assigned") as well as with color.
- **Do** prefix page-specific CSS classes (for example `bc-`). Create React App loads every stylesheet on every page, so unprefixed names like `.drag-handle` leak between pages.
- **Do** check every page at 200% zoom and below 900px wide.
- **Do** use inline SVG icons (grip, close, chevron) in one consistent stroke.

### Don't:
- **Don't** introduce new purple or blue. New and redesigned surfaces use sage. Don't mix sage with a legacy accent on one page.
- **Don't** put layout styles on `body`/`#root`, or offset content by a hardcoded navbar height.
- **Don't** add gradients, zero-offset glow shadows, or uppercase letter-spaced micro-labels to new work. They're legacy.
- **Don't** use one card per item for lists of amounts. Use rows in a single list.
- **Don't** use test amber anywhere except the test instance's indicators.
- **Don't** put real financial figures in screenshots, fixtures or examples. Use mock numbers.
