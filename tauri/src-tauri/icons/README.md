# Icons (placeholder)

The PNG files in this folder are **placeholders** — copies of `assets/clipforge_icon4.png` at the wrong dimensions. They build, but renders look fuzzy at small sizes.

To regenerate clean icons from the source artwork (after `pnpm install`):

```bash
cd tauri
pnpm tauri icon ../assets/clipforge_icon4.png
```

This rewrites every file in this folder at the correct size (32×32, 128×128, 128×128@2×, plus `icon.ico` and `icon.icns`). Tracked as a follow-up to the skeleton PR.
