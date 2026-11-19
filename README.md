# Rough Pomodoro

A lightweight Pomodoro timer for Obsidian, inspired by [obsidian-gentlepomodoro](https://github.com/jamiestudio-lab/obsidian-gentlepomodoro).

Work sessions are saved as daily Markdown logs using Dataview inline fields. For example:

```text
- 🍅 Focus [Task:: Write documentation] [Start:: 2026-11-19 10:00:00] [Total:: 1500] [Type:: focus]
```

This makes task names, start times, durations, and other session data available for Dataview queries. For example, this query lists focus sessions saved in the `Pomodoro` folder:

```dataview
TABLE item.Task AS Task, item.Start AS Start, item.Total AS Seconds
FROM "Pomodoro"
FLATTEN file.lists AS item
WHERE item.Type = "focus"
SORT item.Start DESC
```

The log fields and file names are specific to this plugin. They are not intended to be a drop-in compatible format for `obsidian-gentlepomodoro` logs.

The interface automatically switches between Japanese and English based on Obsidian's language setting.

## Web version

An installable, offline-capable PWA. Data stays in the browser; notifications require permission and the app to remain open.

```bash
npm run dev:web
npm run deploy:web
```

## Development

The Obsidian plugin entry point is [main.ts](./main.ts), and the web app entry point is [web/main.ts](./web/main.ts). Pomodoro state transitions and log generation are shared through [pomodoro.ts](./pomodoro.ts). Install dependencies and run the following commands:

```bash
npm ci
npm run format
npm run lint
npm run typecheck
npm run build
```

`npm run build` generates the `main.js` file loaded by Obsidian. Copy `manifest.json`, the generated `main.js`, and `styles.css` to your vault's `.obsidian/plugins/rough-pomodoro/` directory, then enable the plugin.

Open the timer from the command palette using **Open Pomodoro** (or its Japanese equivalent) or from the ribbon icon.

The default log folder is `Pomodoro` at the root of your vault. You can change it in the timer settings. The folder must stay inside the vault; leave it blank to save logs at the vault root. `..` path segments are not allowed.

For a release, update the version in `manifest.json` and `versions.json`, commit the changes, and create a tag with the exact same version (without a `v` prefix). GitHub Actions verifies the tag, builds the plugin, and creates a draft Release with the required Obsidian assets.

For Japanese documentation, see [README-ja-JP.md](./README-ja-JP.md).
