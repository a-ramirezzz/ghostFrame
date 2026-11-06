# Contributing to GhostFrame

Thanks for your interest in contributing. GhostFrame welcomes bug fixes, focused features, tests, documentation, and interface improvements.

## Before submitting a change

1. Check [existing issues](https://github.com/a-ramirezzz/ghostframe/issues) before reporting a duplicate.
2. Fork the repository and create a branch from `master`.
3. Keep changes focused and include regression coverage for meaningful behavior changes.
4. Open a pull request that explains the problem, the approach, and how the result was validated.

Use clear commit prefixes such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, or `chore:` where helpful.

## Development setup

GhostFrame uses Node.js 24 and npm; Node 24 is also used in continuous integration.

```bash
git clone https://github.com/a-ramirezzz/ghostframe.git
cd ghostframe
npm ci
npm run dev
```

No API keys or backend service are required.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Run the strict TypeScript project build without the Vite bundle. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run the Vitest unit and integration suite once. |
| `npm run test:watch` | Run Vitest in watch mode during development. |
| `npm run build` | Type-check and create the production Vite build. |
| `npm run test:e2e` | Run the Playwright suite in Chromium. |
| `npm run check` | Run type checking, linting, Vitest, and the production build in sequence. It does not include Playwright. |
| `npm run preview` | Serve an existing production build for manual review. |

Install Playwright's Chromium browser once before running the E2E suite locally:

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration builds the current checkout and starts its own Vite production preview at `http://127.0.0.1:4173` with strict-port behavior. It does not reuse an already running server, so the command fails if that port is occupied.

Vitest uses deterministic canvas and font-measurement doubles for focused orchestration and geometry tests. Playwright exercises the application in Chromium with the bundled fonts, browser Canvas implementation, image decoders, and encoders.

## Continuous integration

The `Validate` GitHub Actions workflow runs on pushes to `master` and on pull requests. Both jobs use Ubuntu and Node.js 24 with the npm cache:

- **checks** runs `npm ci`, type checking, linting, Vitest, and the production build.
- **chromium** runs `npm ci`, installs Chromium and its system dependencies, then runs Playwright. On failure, the Playwright report and test results are uploaded as diagnostics for seven days.

Concurrent runs for the same pull request or ref cancel older in-progress runs.

## Implementation guidelines

- Keep image processing browser-local and avoid adding a server dependency without an explicit project decision.
- Preserve preview/export composition consistency by routing geometry and drawing changes through the shared composition modules and stable `src/utils/composition.ts` facade. Test both paths when changing layout behavior.
- Keep original decoded assets and source `File`/`Blob` data separate from bounded preview bitmaps and caches. Export must render independently from the original image at its calculated output size.
- Treat preview background filtering and composition layout as independent cache concerns. Invalidate only the cache affected by a state change.
- Own asynchronous work explicitly: ignore or cancel stale image/render/project operations, keep the existing editor intact on failure, and revoke object URLs only when their owning asset is replaced, cancelled, or disposed.
- Maintain strict typing. Validate persisted or otherwise external data at its boundary instead of asserting it into an application type.
- Add focused regression tests for meaningful behavior changes, including error and cancellation paths where relevant. Use Vitest for isolated logic and integration behavior, and Chromium E2E coverage for browser-specific workflows or accessibility interactions.
- UI changes should preserve the responsive layout, visible keyboard focus, usable touch targets, warm dark palette, and amber accent.
- Do not hardcode test totals, timing claims, or historical audit results in documentation.

## Reporting bugs and suggesting features

For bugs, include reproduction steps, expected and actual behavior, browser/OS details, and screenshots when useful. For feature requests, describe the user problem, the proposed behavior, and alternatives considered.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
