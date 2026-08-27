# Contributing to GhostFrame

Thanks for your interest in contributing! GhostFrame is open source and welcomes contributions from everyone.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/a-ramirezzz/ghostframe/issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected behavior, and screenshots if possible.

### Suggesting Features

1. Open an issue using the **Feature Request** template.
2. Describe the problem you're solving and your proposed solution.
3. Be as specific as possible.

### Submitting Code

1. Fork the repository.
2. Create a branch from `main`:
```bash
   git checkout -b feat/your-feature
```
3. Make your changes following the project conventions.
4. Test your changes locally with `npm run dev`.
5. Commit with a descriptive message:
```bash
   git commit -m "feat: add your feature description"
```
6. Push and open a Pull Request against `main`.

## Commit Convention

Use prefixes for clarity:

| Prefix    | Use                          |
|-----------|------------------------------|
| `feat:`   | New feature                  |
| `fix:`    | Bug fix                      |
| `style:`  | Visual/CSS changes only      |
| `refactor:` | Code restructure (no new feature) |
| `docs:`   | Documentation changes        |
| `chore:`  | Maintenance (deps, config)   |

## Development Setup

```bash
git clone https://github.com/a-ramirezzz/ghostframe.git
cd ghostframe
npm install
npm run dev
```

## Guidelines

- Keep it client-side — no server dependencies.
- Follow the existing code style and project structure.
- Test with different image sizes and formats before submitting.
- UI changes should respect the warm dark theme and amber accent palette.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
