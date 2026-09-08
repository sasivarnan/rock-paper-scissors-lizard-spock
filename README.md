# Show of Hands

A webcam game with two variants: Classic (rock, paper, scissors) and Lizard & Spock. Built with React, TypeScript, Tailwind CSS 4, MediaPipe, and `@xstate/store-react`.

## Run

Requires Node 22.18+ and pnpm.

```sh
pnpm install
pnpm dev
```

Click **Start match**, allow camera access, and hold your sign until the countdown reaches zero. Rounds continue automatically; **Pause** interrupts without scoring.

The settings icon opens the game variant, match length (1–20 points or rounds), and countdown (3 or 5 seconds). Applying resets the score. Cancel keeps the match paused. How to play contains the gesture guide and rules.

The final result stays visible for six seconds, then the camera turns off and scores and moves clear. Game settings stay selected. Play again skips the wait; opening a dialog pauses the reset.

Sound effects are on by default. Toggle Sounds in Game settings; the choice saves locally. Tones mark the countdown and results. A saved off preference stays muted. Actual speaker output has not been verified.

A round win earns one point. Draws earn none. In fixed-round matches, draws count as rounds, missed signs retry, and equal final scores produce a draw.

## GitHub Pages

In your GitHub repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. Push to `main` to publish. The **Deploy to GitHub Pages** workflow also supports manual runs from the Actions tab.

Each push to `main` installs the locked dependencies, checks formatting, runs lint and tests, builds, and deploys `dist`. The workflow reads the Pages base path automatically, supporting repository URLs and custom domains. Camera access works over the HTTPS Pages URL.

To check a repository-path build locally:

```sh
PAGES_BASE_PATH=/rock-paper-scissors-lizard-spock/ pnpm build
PAGES_BASE_PATH=/rock-paper-scissors-lizard-spock/ pnpm preview
```

Local development keeps `/` as its base path. MediaPipe assets follow the selected base path. No deployment secret is needed; the workflow uses GitHub's built-in token.

## Development

```sh
pnpm test # Vitest, one run
pnpm test:watch
pnpm lint
pnpm build
pnpm format:check
pnpm format
```

- `src/game/`: state, rules, match flow, notifications, appearance, audio.
- `src/vision/`: camera lifecycle, MediaPipe worker, gesture classification.
- `src/components/`: controls, dialogs, feedback.
- `src/hooks/`: shared React lifecycle hooks.
- `src/index.css`: theme tokens, global browser defaults, and animation keyframes. Component styling uses Tailwind classes directly in JSX, with shared Button, Dialog, and Toggle components.
- `tests/`: game behavior and synthetic gesture regression tests.

Tests use Vitest assertions, fake timers, and global stubs. Oxlint handles linting and Oxfmt handles formatting; Prettier has been removed.

## Camera and recognition

Camera access needs localhost or HTTPS, WebAssembly, OffscreenCanvas, and module workers. Model and runtime assets are bundled in `public/mediapipe`. Frames stay on the device; backgrounding stops the camera.

Classification checks whole-finger straightness and preserves finger order to reject curled tips and crossed fingers. This reduces sensitivity to an isolated noisy joint. All gestures share the same open-finger check. Scissors requires an open index and middle finger plus a folded ring and pinky, so relaxed Paper cannot pass as Scissors. It uses joint angles and palm-relative distances, with a stability filter requiring at least four matching frames, 80% agreement over the last 900 ms, and a 450 ms hold. An uncertain or conflicting current frame cannot score; a single misclassified frame does not erase the entire hold. Either hand is supported geometrically. Paper accepts slightly cupped hands, relaxed pinkies, and closed or spread fingers, with the thumb open or tucked; Spock requires paired fingers with a central split. Show lizard slightly sideways. Real-camera accuracy across hands, lighting, and mobile browsers remains unverified; the fixtures are synthetic, including articulated three-bone fingers for all five signs and tests for every gesture transition, covering palm/back rotations, both hands, size changes, and small landmark noise.

Mobile sessions process frames up to 480 pixels wide every 120 ms; desktop uses 640 pixels and 80 ms, with only one inference in flight.

## Appearance and integrations

The appearance switch follows the system until overridden, then saves the choice locally. The existing `hand-to-hand-appearance` storage key is retained so returning players keep their preference.

The optional WebMCP integration exposes visible game status and starting a match; its browser contract remains unverified. Multiplayer is not implemented; the computer's independent move source leaves room for a future remote opponent.

MediaPipe runtime: `@mediapipe/tasks-vision`, Apache-2.0. [Official hand model](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task).

By [Sasivarnan R](https://sasivarnan.com).
