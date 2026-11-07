---
version: 1
slug: "src-components-whole-view-login-login-js-7ef704da"
primary_target: "web-app/app/src/components/whole-view/Login/Login.js"
related_targets: []
---

# Login

- **Scope:** the login screen (`Login.js`/`Login.css`), plus the new mark and self-hosted serif. Mode: Operate, with one brand moment.
- **Audience/job:** the owner, on a laptop and often zoomed in, needs to get in within seconds. It's also the first preview of the app's move to muted green.
- **Constraints:** single-user login, no Remember me or Forgot password, no marketing buttons, no copied reference branding or shapes.

## Direction contract

seed: none (direction pinned by user reference: "pretty much that look", in our own muted green)

THESIS: The login is the kitchen table before the work starts: a calm sage field and a warm serif welcome beside a plain, solid form. It refuses both the bare centered box and a marketing splash.

OWN-WORLD: A muted sage ground covered in an authored pattern of soft organic shapes in two close greens, inside a gently rounded inset frame. Deep green-black ink, a warm text serif (Castoro) for display, the existing sans for UI. A white 20px-radius card, a deep-sage solid button, and sage focus rings.

STORY: You see your own app greet you ("Welcome back.", "Let's sort out this paycheck."), type two fields, and you're in. A wrong password tells you plainly and keeps your username.

FIRST VIEWPORT: Two columns inside the frame. Left: jar mark + "Sinking Funds" wordmark, then a ~4.5rem serif headline and one line. Right: the card with a serif "Log in" heading, labelled fields, an eye toggle, and a full-width button. Below 900px it stacks, with the page using a minimum height, never a fixed one.

SIGNATURE: The pattern field itself, drawn as SVG and not a raster. The show-password eye is the only interaction beyond typing.

RISK: Contrast on sage. Button and text must clear 4.5:1, and the pattern must stay low-contrast enough not to fight the headline.

## Open
- Exact sage values are chosen in the build, against contrast.
