# Publishing `@duocvo/react-native-zoomable-image` to npm

This project uses **Yarn** workspaces, **react-native-builder-bob** (`yarn prepare` → `bob build`), and **release-it** for releases.

## Prerequisites

1. **npm account** with permission to publish the scoped package `@duocvo/react-native-zoomable-image` (you must be logged in as a user who owns the `@duocvo` scope, or create that scope on first publish).
2. **Two-factor authentication (2FA)** enabled on npm if your account policy requires it for publishing.
3. **Clean git state** on the branch you release from (commit or stash local changes).

## One-time: log in to npm

```sh
npm login
```

Verify:

```sh
npm whoami
```

## Before every release

From the repository root:

```sh
yarn
yarn typecheck
yarn lint
yarn test
```

Ensure `lib/` is buildable (happens automatically on `yarn publish` via `prepare`, but you can verify locally):

```sh
yarn prepare
```

Check that `package.json` `files` and `exports` include what you intend (see root `package.json`).

## Version bump and publish with release-it

The `package.json` `release-it` section is set to:

- Create a git tag like `v1.2.3`
- Run `npm publish` (respects `publishConfig.registry`)
- Optionally create a **GitHub Release** if `GITHUB_TOKEN` is available (see below)

Run interactively:

```sh
yarn release
```

Follow the prompts to choose **patch** / **minor** / **major**, confirm changelog, and publish.

### If `yarn release` fails on GitHub release

Publishing to **npm** can still succeed while GitHub release fails (e.g. missing token). To enable GitHub releases from your machine:

1. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` or at least `public_repo` for public repos.
2. Export before running release:

   ```sh
   export GITHUB_TOKEN=ghp_xxxxxxxx
   ```

Or run `yarn release` with only npm steps by adjusting `release-it` config temporarily—prefer fixing the token for a smooth flow.

### Dry run (optional)

To see what would be packed without publishing:

```sh
npm pack --dry-run
```

## First-time publish notes

- **Name availability**: if `npm publish` fails (name taken or scope permission), change `"name"` in `package.json` and update README links. Scoped packages need `publishConfig.access: "public"` so they are visible on npm (already set in this repo).
- **OTP**: npm may ask for a one-time password from your authenticator app when publishing.

## After publishing

- Confirm the package on [https://www.npmjs.com/package/@duocvo/react-native-zoomable-image](https://www.npmjs.com/package/@duocvo/react-native-zoomable-image).
- Tag should appear on GitHub; verify **Releases** if you use GitHub integration.

## Related docs

- [CONTRIBUTING.md](../CONTRIBUTING.md) — development workflow
- [DEMO_VIDEO.md](./DEMO_VIDEO.md) — add a demo link in the README

