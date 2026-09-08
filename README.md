# Fivefold

A webcam rock–paper–scissors–lizard–Spock game built with React, TypeScript, Vite, MediaPipe Tasks Vision, and `@xstate/store-react`.

## Run

```sh
pnpm install
pnpm dev
```

Open the localhost URL, enable your camera, and hold one of the illustrated poses. Click **Start round**, keep your pose through the countdown, and play first to five. A draw adds no points; an unclear capture retries without scoring. The camera stops when the page becomes hidden or you turn it off.

Camera access requires localhost or HTTPS. Use a current Chrome or Edge browser with camera access, WebAssembly, OffscreenCanvas, and module workers. The official MediaPipe model and WASM runtime are included in `public/mediapipe`; webcam frames remain on the device. Google Fonts is the only external presentation request.

## Checks

```sh
pnpm test
pnpm lint
pnpm build
```

Node 22.18+ is recommended for the built-in TypeScript test runner. Tests cover all 25 outcomes, scoring and match completion, early/invalid/stale captures, reset and camera interruption, and gesture stabilization. No recorded real-hand fixture dataset is bundled; recognition thresholds still require real-webcam validation across hands and lighting.

## Structure

- `src/game/rules.ts`: pure round resolution and independent computer opponent.
- `src/game/store.ts`: typed event-driven camera/game state and participant records.
- `src/vision/classifier.ts`: geometric pose classification and 450 ms stability filter.
- `src/vision/hand.worker.ts`: MediaPipe inference off the UI thread.
- `src/vision/useCamera.ts`: camera, bounded frame transfer, and lifecycle cleanup.
- `src/App.tsx`: responsive two-player arena.

The opponent move is chosen before capture. Video and workers stay outside the store. Multiplayer is not implemented; future work can replace the computer move source and render a remote stream in the existing opponent panel. A real P2P mode also needs its own signaling, round synchronization, and fair move exchange protocol.

## Recognition

Rock is a closed fist; paper is an open palm with fingers together; scissors extends index and middle fingers; Spock splits the middle and ring fingers; lizard curves all four fingers toward an open thumb like a puppet mouth. Show lizard at a slight side angle. Ambiguous poses are intentionally not accepted. These are deterministic geometric heuristics over MediaPipe's world landmarks, not a custom trained five-class model.

The optional `document.modelContext` integration exposes visible game status and starting a round in supporting browsers. Its browser contract has not been validated in a supported WebMCP context.

MediaPipe model source: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
Runtime assets: `@mediapipe/tasks-vision` 1.0.1, Apache-2.0.
