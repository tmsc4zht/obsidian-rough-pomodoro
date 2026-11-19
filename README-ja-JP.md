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

## BRATでインストール

1. ObsidianのCommunity pluginsから**BRAT**をインストールします。
2. BRATで**Add a beta plugin for testing**を選び、`https://github.com/tmsc4zht/obsidian-rough-pomodoro`を登録します。
3. 最新リリースを追跡するか、`0.1.0-beta.1`のような特定のリリースタグに固定します。

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

ログファイル名の形式もタイマー設定から変更できます。既定のファイル名は`YYYY-MM-DD-rough-pomodoro-log.md`です。設定値には`YYYY-MM-DD-rough-pomodoro-log`を使用します。`YYYY`（年）、`MM`/`M`（月）、`DD`/`D`（日）、`HH`（時）、`mm`（分）、`ss`（秒）などを使用できます。拡張子`.md`は自動で付きます。

安定版をリリースするときは、`manifest.json`と`versions.json`のバージョンを更新してコミットし、`v`を付けずに同じSemantic Versioningタグをpushします。ベータ版では既定ブランチのmanifestを変更せず、`0.1.0-beta.1`のようなプレリリースタグをpushします。GitHub ActionsがタグからRelease用の`manifest.json`を生成し、タグと一致するバージョンでReleaseを公開します。ベータ版ReleaseはPre-releaseとして作成されます。

英語のドキュメントは[README.md](./README.md)を参照してください。
