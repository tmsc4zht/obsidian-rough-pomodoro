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

## Install with BRAT

1. Install **BRAT** from Obsidian's Community plugins.
2. In BRAT, choose **Add a beta plugin for testing** and enter `https://github.com/tmsc4zht/obsidian-rough-pomodoro`.
3. Track the latest release or pin a specific release tag, such as `0.1.0-beta.1`.

## Web version

Try the [Rough Pomodoro Web version](https://rough-pomodoro-web.tmsc4zht.workers.dev/), an installable, offline-capable PWA. Data stays in the browser; notifications require permission and the app to remain open.

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

You can also change the log file name format in the timer settings. The default file name is `YYYY-MM-DD-rough-pomodoro-log.md`; the setting value is `YYYY-MM-DD-rough-pomodoro-log`. Available tokens include `YYYY` (year), `MM`/`M` (month), `DD`/`D` (day), `HH` (hour), `mm` (minute), and `ss` (second). The `.md` extension is added automatically.

For a stable release, update the version in `manifest.json` and `versions.json`, commit the changes, and push a matching semantic-version tag without a `v` prefix. For a beta, push a pre-release tag such as `0.1.0-beta.1` without changing the default-branch manifest. GitHub Actions builds from the tag, creates a release `manifest.json` whose version matches the tag, and publishes the Release; beta tags are marked as pre-releases.

For Japanese documentation, see [README-ja-JP.md](./README-ja-JP.md).
