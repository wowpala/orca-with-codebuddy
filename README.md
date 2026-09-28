<h1 align="center">Orca + CodeBuddy <sub>(unofficial patch)</sub></h1>

<p align="center">
  <a href="https://github.com/wowpala/orca-with-codebuddy/releases">Releases</a> · <img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="License: MIT" /> · <img src="https://img.shields.io/badge/platform-Windows%20x64-4493F8?style=flat-square" alt="Windows x64" />
</p>

Drop-in [CodeBuddy CLI](https://www.codebuddy.ai/cli) agent support for [Orca](https://github.com/stablyai/orca), distributed as **prebuilt patches — no compilation needed**.

An independent implementation for [stablyai/orca#9354](https://github.com/stablyai/orca/issues/9354). Not affiliated with stablyai or CodeBuddy. If official support lands upstream, this project retires.

简体中文说明见[文末](#简体中文说明)。

## What you get

- **CodeBuddy as a built-in agent** — appears in the agent picker, launchable in any worktree, with the usual permission controls
- **AI Vault session history** — CodeBuddy sessions from `~/.codebuddy/projects` show up in Orca's right-side panel: searchable, resumable (`codebuddy --resume <id>`), deletable
- Dedicated transcript parsing (CodeBuddy's transcript format differs from Claude's; this ships its own parser)

## Install (Windows x64)

1. **Find your Orca version**: Orca → Settings → About.
2. **Download the matching release** from [Releases](https://github.com/wowpala/orca-with-codebuddy/releases): tag `codebuddy-vX.Y.Z` is built for Orca `X.Y.Z`. The versions **must match** — a mismatched build can break IPC between Orca and its helper processes.
3. (Optional) verify the zip against `SHA256SUMS.txt`.
4. **Quit Orca completely** (check the tray icon).
5. Back up, then overwrite two paths inside `%LOCALAPPDATA%\Programs\orca\resources\`:
   - `app.asar` ← the one from the zip
   - `app.asar.unpacked\` ← replace the **whole folder**
6. Start Orca. Verify: Settings lists CodeBuddy as an agent; the AI Vault lists your CodeBuddy sessions.

### Rollback

Restore the two paths from your backup, or reinstall Orca. Nothing here touches `~/.codebuddy`, so your session history survives patch removal, reinstalls, and updates.

## After an Orca update

The official updater replaces `resources\` wholesale and wipes the patch. Wait for a release here tagged with the new Orca version, then repeat the install steps. Releases are built automatically whenever a `codebuddy-v<version>` tag is pushed (see the Actions tab).

## Build from source

```bash
git clone -b wowpala/codebuddy https://github.com/wowpala/orca-with-codebuddy.git
cd orca-with-codebuddy
pnpm install
pnpm run build:unpack
# → dist/win-unpacked/resources/{app.asar, app.asar.unpacked/}
```

The two paths under `dist/win-unpacked/resources/` are the same artifacts the release zips contain.

## How releases are made

For maintainers: merge the upstream Orca release tag into `wowpala/codebuddy`, push, then tag `codebuddy-v<that version>` and push the tag — [GitHub Actions](.github/workflows/codebuddy-release.yml) builds `app.asar` + `app.asar.unpacked` on a Windows runner and publishes the zip to Releases.

## License

MIT, same as [Orca](https://github.com/stablyai/orca). CodeBuddy is a product of its respective owner; this project only integrates with its CLI.

---

## 简体中文说明

这是一个为 [Orca](https://github.com/stablyai/orca) 添加 [CodeBuddy CLI](https://www.codebuddy.ai/cli) 支持的**非官方补丁项目**，提供免编译的预构建补丁。

**功能**：CodeBuddy 出现在 Orca 的 agent 选择器中，可在任意 worktree 启动；右侧 AI Vault 会话历史可查看、搜索、恢复（`codebuddy --resume <id>`）、删除 CodeBuddy 会话。

**安装（Windows x64）**：

1. 查看你的 Orca 版本（设置 → 关于）
2. 到 [Releases](https://github.com/wowpala/orca-with-codebuddy/releases) 下载 **tag 版本号与 Orca 版本一致** 的 zip：`codebuddy-vX.Y.Z` 对应 Orca `X.Y.Z`。**版本必须匹配**，错配可能导致 Orca 与其子进程 IPC 不兼容
3. （可选）用 zip 旁的 `SHA256SUMS.txt` 校验文件完整性
4. 完全退出 Orca（注意托盘图标）
5. 备份后覆盖 `%LOCALAPPDATA%\Programs\orca\resources\` 下的两个路径：
   - `app.asar` —— 用 zip 里的同名文件替换
   - `app.asar.unpacked\` —— **整个文件夹**替换
6. 启动 Orca，验证：设置里有 CodeBuddy agent，右侧会话历史出现 CodeBuddy 记录

**回滚**：用备份还原那两个路径，或重装 Orca。补丁不会触碰 `~/.codebuddy`，会话记录始终安全。

**Orca 更新后**：官方更新会整体替换 `resources\` 并冲掉补丁。等本仓库发布对应该新版本的 Release，重新执行安装步骤即可（推送 `codebuddy-v<版本>` tag 后 CI 会自动构建发布）。
