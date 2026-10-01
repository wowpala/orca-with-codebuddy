> [!IMPORTANT]
> **This project is retired (2026-10-01).** Official [Orca](https://github.com/stablyai/orca) **v1.4.218+** now ships built-in [CodeBuddy CLI](https://www.codebuddy.ai/cli) support — agent picker, status hooks, and AI Vault session history. Install a current Orca instead; this patch is no longer maintained and its release workflow is disabled.
>
> 本项目已停止维护。官方 Orca v1.4.218 起已内置 CodeBuddy 支持，请直接使用官方版本。

<h1 align="center">Orca + CodeBuddy <sub>(unofficial patch — retired)</sub></h1>

<p align="center">
  <a href="https://github.com/wowpala/orca-with-codebuddy/releases">Releases</a> · <img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="License: MIT" /> · <img src="https://img.shields.io/badge/platform-Windows%20x64-4493F8?style=flat-square" alt="Windows x64" />
</p>

Drop-in [CodeBuddy CLI](https://www.codebuddy.ai/cli) agent support for [Orca](https://github.com/stablyai/orca), distributed as **prebuilt patches — no compilation needed**.

An independent implementation for [stablyai/orca#9354](https://github.com/stablyai/orca/issues/9354). Not affiliated with stablyai or CodeBuddy. **Official support landed in Orca v1.4.218 — this project is now retired (see banner above).**

简体中文说明见[文末](#简体中文说明)。

## What you get

- **CodeBuddy as a built-in agent** — appears in the agent picker, launchable in any worktree, with the usual permission controls
- **Agent status hooks** — Orca tracks CodeBuddy's live state (working / waiting for permission / done) in the sidebar, with an in-flight tool preview. Hooks are installed automatically into `~/.codebuddy/settings.json` on first launch when the CLI is detected (your own hooks are preserved), and on SSH execution hosts as well
- **AI Vault session history** — CodeBuddy sessions from `~/.codebuddy/projects` show up in Orca's right-side panel: searchable, resumable (`codebuddy --resume <id>`), deletable
- Dedicated transcript parsing (CodeBuddy's transcript format differs from Claude's; this ships its own parser)

## Install (Windows x64)

1. **Find your Orca version**: Orca → Settings → About.
2. **Download the matching release** from [Releases](https://github.com/wowpala/orca-with-codebuddy/releases): tag `codebuddy-vX.Y.Z` is built for Orca `X.Y.Z`. The versions **must match** — a mismatched build can break IPC between Orca and its helper processes.
3. (Optional) verify the zip against `SHA256SUMS.txt`.
4. Extract the zip anywhere — no need to quit Orca first.
5. **One-click**: double-click `CodeBuddy-Patch.bat` and choose **[1] Install**. It kills any running Orca processes first (unsaved agent output may be lost), backs up the official files on first run (`app.asar.orca-official.bak`), and copies the patch into place.
   *Manual alternative*: overwrite `app.asar` and replace the whole `app.asar.unpacked\` folder inside `%LOCALAPPDATA%\Programs\orca\resources\` with the ones from the zip.
6. Start Orca. Verify: Settings lists CodeBuddy as an agent; the AI Vault lists your CodeBuddy sessions.

### Rollback

Double-click `CodeBuddy-Patch.bat` and choose **[2] Restore official Orca** (running Orca processes are killed automatically). Or restore the two paths from your backup, or reinstall Orca. Nothing here touches `~/.codebuddy`, so your session history survives patch removal, reinstalls, and updates.

## After an Orca update

The official updater replaces `resources\` wholesale and wipes the patch. Wait for a release here tagged with the new Orca version, then repeat the install steps. Releases are built automatically whenever a `codebuddy-v<version>` tag is pushed (see the Actions tab).

## Build from source (optional)

You never need to build to install or update the patch — releases are built automatically by CI. Build locally only when developing or debugging the patch itself:

```bash
git clone -b wowpala/codebuddy https://github.com/wowpala/orca-with-codebuddy.git
cd orca-with-codebuddy
pnpm install
pnpm run build:unpack
# → dist/win-unpacked/resources/{app.asar, app.asar.unpacked/}
```

The two paths under `dist/win-unpacked/resources/` are the same build artifacts the release zips contain (zips additionally bundle `CodeBuddy-Patch.bat` and `INSTALL.md`).

## How releases are made

For maintainers. Remotes: `origin` = upstream [stablyai/orca](https://github.com/stablyai/orca), `fork` = this repo.

```bash
# Bash / Git Bash:
git fetch origin --tags                      # pick up the new upstream release tag
TAG=$(git tag -l 'v*' --sort=-v:refname | head -n 1)
git merge "$TAG"                             # on wowpala/codebuddy; resolve conflicts if any
git push fork wowpala/codebuddy
git tag "codebuddy-$TAG"                     # MUST equal the installed Orca version
git push fork "codebuddy-$TAG"               # CI builds and publishes the zip
```

```powershell
# PowerShell:
git fetch origin --tags                      # pick up the new upstream release tag
$TAG = (git tag -l 'v*' --sort=-v:refname)[0]
git merge $TAG                               # on wowpala/codebuddy; resolve conflicts if any
git push fork wowpala/codebuddy
git tag "codebuddy-$TAG"                     # MUST equal the installed Orca version
git push fork "codebuddy-$TAG"               # CI builds and publishes the zip
```

[GitHub Actions](.github/workflows/codebuddy-release.yml) builds `app.asar` + `app.asar.unpacked` on a Windows runner and publishes the zip to Releases — no local build involved.

Re-releasing the same Orca version (patch-script fixes, no upstream change): move the existing `codebuddy-vX.Y.Z` tag to the new commit and force-push it — CI rebuilds and replaces the release assets.

## License

MIT, same as [Orca](https://github.com/stablyai/orca). CodeBuddy is a product of its respective owner; this project only integrates with its CLI.

---

## 简体中文说明

这是一个为 [Orca](https://github.com/stablyai/orca) 添加 [CodeBuddy CLI](https://www.codebuddy.ai/cli) 支持的**非官方补丁项目**，提供免编译的预构建补丁。

**功能**：CodeBuddy 出现在 Orca 的 agent 选择器中，可在任意 worktree 启动；**Agent 状态 hooks** —— Orca 在侧边栏实时显示 CodeBuddy 状态（工作中 / 等待权限 / 完成）和当前执行的工具，检测到 CLI 后首次启动会自动把 hooks 写入 `~/.codebuddy/settings.json`（保留你自己的 hooks），SSH 执行主机同样支持；右侧 AI Vault 会话历史可查看、搜索、恢复（`codebuddy --resume <id>`）、删除 CodeBuddy 会话。

**安装（Windows x64）**：

1. 查看你的 Orca 版本（设置 → 关于）
2. 到 [Releases](https://github.com/wowpala/orca-with-codebuddy/releases) 下载 **tag 版本号与 Orca 版本一致** 的 zip：`codebuddy-vX.Y.Z` 对应 Orca `X.Y.Z`。**版本必须匹配**，错配可能导致 Orca 与其子进程 IPC 不兼容
3. （可选）用 zip 旁的 `SHA256SUMS.txt` 校验文件完整性
4. 把 zip 解压到任意目录（无需提前退出 Orca）
5. **一键安装**：双击 `CodeBuddy-Patch.bat` 选 **[1] Install** —— 脚本会自动 kill 残留的 Orca 进程（未保存的 agent 输出可能丢失）、首次自动备份官方原版（`app.asar.orca-official.bak`），然后完成替换
   （手动方式：把 zip 里的 `app.asar` 和 `app.asar.unpacked\` 覆盖到 `%LOCALAPPDATA%\Programs\orca\resources\`，unpacked 是**整个文件夹**替换）
6. 启动 Orca，验证：设置里有 CodeBuddy agent，右侧会话历史出现 CodeBuddy 记录

**回滚**：双击 `CodeBuddy-Patch.bat` 选 **[2] Restore official Orca**（脚本会自动 kill 运行中的 Orca），或用备份手动还原，或重装 Orca。补丁不会触碰 `~/.codebuddy`，会话记录始终安全。

**Orca 更新后**：官方更新会整体替换 `resources\` 并冲掉补丁。等本仓库发布对应该新版本的 Release，重新执行安装步骤即可（推送 `codebuddy-v<版本>` tag 后 CI 会自动构建发布）。
