# Separating the WIM plugin when the repo goes public

[Tiếng Việt](../PLUGIN-WIM.md) | **English**

`packages/plugin-wim` is closed source (`"license": "UNLICENSED"`, `"private": true`, no LICENSE file). In the PoC it lives in the same monorepo for convenience.

When you make the repository public:

1. Move the `packages/plugin-wim` folder to a separate private repository (keep its history with `git subtree split -P packages/plugin-wim`).
2. Remove the folder from the public repository together with its history (`git filter-repo --path packages/plugin-wim --invert-paths`).
3. Remove the plugin's import and declaration from `apps/studio/hosso.config.ts` and `apps/studio/package.json`; Studio keeps running because the core does not depend on the plugin.
4. `pnpm check:boundaries` must pass before you push.
