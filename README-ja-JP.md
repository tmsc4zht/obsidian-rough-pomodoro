# Rough Pomodoro

[obsidian-gentlepomodoro](https://github.com/jamiestudio-lab/obsidian-gentlepomodoro)を参考にした、Obsidian用の軽量なポモドーロタイマーです。

作業セッションは、Dataviewのインラインフィールドを使った日次Markdownログとして保存されます。例えば、次のような形式です。

```text
- 🍅 Focus [Task:: ドキュメントを書く] [Start:: 2026-11-19 10:00:00] [Total:: 1500] [Type:: focus]
```

これにより、作業内容・開始時刻・作業時間などをDataviewで検索・集計できます。例えば、`Pomodoro`フォルダに保存された集中セッションを一覧表示するには、次のクエリを使えます。

```dataview
TABLE item.Task AS 作業内容, item.Start AS 開始, item.Total AS 秒数
FROM "Pomodoro"
FLATTEN file.lists AS item
WHERE item.Type = "focus"
SORT item.Start DESC
```

ログのフィールドとファイル名は本プラグイン独自の仕様です。`obsidian-gentlepomodoro`のログをそのまま読み込むための互換形式ではありません。

画面表示はObsidianの言語設定に合わせて、日本語と英語を自動で切り替えます。

## Web版

インストールしてオフラインでも使えるPWAです。データはブラウザー内に保存され、通知には許可とアプリの起動が必要です。

```bash
npm run dev:web
npm run deploy:web
```

## 開発

Obsidianプラグインのエントリーポイントは[main.ts](./main.ts)、Web版は[web/main.ts](./web/main.ts)です。Pomodoroの状態遷移とログ生成は[pomodoro.ts](./pomodoro.ts)で共有します。依存関係をインストールして、次のコマンドを実行します。

```bash
npm ci
npm run format
npm run lint
npm run typecheck
npm run build
```

`npm run build`で、Obsidianが読み込む`main.js`を生成します。生成された`main.js`と`manifest.json`、`styles.css`をVaultの`.obsidian/plugins/rough-pomodoro/`へコピーして、プラグインを有効化してください。

コマンドパレットの**ポモドーロを開く**（英語環境では**Open Pomodoro**）またはリボンアイコンからタイマーを起動できます。

ログの既定保存先は、Vault直下の`Pomodoro`フォルダです。タイマー設定から変更できます。保存先はVault内の相対パスに限られ、空欄の場合はVault直下に保存します。`..`は使用できません。

リリース時は、`manifest.json`と`versions.json`のバージョンを更新し、`v`を付けずに同じバージョンのタグを作成します。GitHub Actionsがタグとmanifestの一致を検証し、ビルド後にObsidianの必要アセットを添付したDraft Releaseを作成します。

英語のドキュメントは[README.md](./README.md)を参照してください。
