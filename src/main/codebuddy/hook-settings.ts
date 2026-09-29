import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  createManagedCommandMatcher,
  getSharedManagedScriptPath,
  removeManagedCommands,
  type HookCommandConfig,
  type HookDefinition,
  type HooksConfig
} from '../agent-hooks/installer-utils'
import { wrapRuntimeHomeHookCommand } from '../agent-hooks/runtime-home-hook-command'

const CODEBUDDY_SCRIPT_BASE = 'codebuddy-hook'

/**
 * Lifecycle events CodeBuddy Code's hook runner can fire that carry agent-status
 * signal (see the Hooks Reference: `PreToolUse`, `PostToolUse`, `Stop`,
 * `UserPromptSubmit`, `SessionStart`). `Notification`, `PreCompact`,
 * `SubagentStop` and `SessionEnd` map to no pane state, so Orca does not
 * register them.
 */
export const CODEBUDDY_EVENTS = [
  {
    // Why: SessionStart is the only signal a resumed/idle session emits before
    // the first prompt; without it the sidebar row can't exist until the user types.
    eventName: 'SessionStart',
    definition: { hooks: [{ type: 'command', command: '' }] }
  },
  { eventName: 'UserPromptSubmit', definition: { hooks: [{ type: 'command', command: '' }] } },
  { eventName: 'Stop', definition: { hooks: [{ type: 'command', command: '' }] } },
  // Why: PreToolUse gives the dashboard a live readout of the in-flight tool.
  {
    eventName: 'PreToolUse',
    definition: { matcher: '*', hooks: [{ type: 'command', command: '' }] }
  },
  {
    eventName: 'PostToolUse',
    definition: { matcher: '*', hooks: [{ type: 'command', command: '' }] }
  }
] as const

export function getCodeBuddyConfigPath(): string {
  // Why: CodeBuddy resolves its user settings from `homedir()` on every
  // platform (user scope: `~/.codebuddy/settings.json`) — no APPDATA/XDG branch.
  return join(homedir(), '.codebuddy', 'settings.json')
}

export function getCodeBuddyRemoteConfigPath(remoteHome: string): string {
  return `${remoteHome.replace(/\/$/, '')}/.codebuddy/settings.json`
}

export function getCodeBuddyManagedScriptFileName(): string {
  return process.platform === 'win32'
    ? `${CODEBUDDY_SCRIPT_BASE}.cmd`
    : `${CODEBUDDY_SCRIPT_BASE}.sh`
}

export function getCodeBuddyPosixManagedScriptFileName(): string {
  return `${CODEBUDDY_SCRIPT_BASE}.sh`
}

export function getCodeBuddyManagedScriptPath(): string {
  return getSharedManagedScriptPath(getCodeBuddyManagedScriptFileName())
}

// Why: self-contained launcher like Claude's — CodeBuddy runs hook commands
// through Git Bash on Windows (msys OSTYPE) and /bin/sh elsewhere, so one
// POSIX-syntax command covers both and resolves the .cmd/.sh by platform.
export function getCodeBuddyManagedCommand(): string {
  return wrapRuntimeHomeHookCommand(CODEBUDDY_SCRIPT_BASE, { neutralJsonWhenMissing: true })
}

export function getCodeBuddyRemoteManagedCommand(): string {
  return wrapRuntimeHomeHookCommand(CODEBUDDY_SCRIPT_BASE, { neutralJsonWhenMissing: true })
}

function getCodeBuddyManagedCommandMatcher(
  scriptFileName = getCodeBuddyManagedScriptFileName()
): (command: string | undefined) => boolean {
  return createManagedCommandMatcher(scriptFileName)
}

export function applyCodeBuddyManagedHooks(
  config: HooksConfig,
  hook: HookCommandConfig
): HooksConfig {
  const nextHooks = { ...config.hooks }
  const isManagedCommand = getCodeBuddyManagedCommandMatcher()

  for (const event of CODEBUDDY_EVENTS) {
    const current = Array.isArray(nextHooks[event.eventName]) ? nextHooks[event.eventName] : []
    const cleaned = removeManagedCommands(current, isManagedCommand)
    const definition: HookDefinition = {
      ...event.definition,
      hooks: [hook]
    }
    nextHooks[event.eventName] = [...cleaned, definition]
  }

  return { ...config, hooks: nextHooks }
}

export function removeCodeBuddyManagedHooks(config: HooksConfig): {
  config: HooksConfig
  changed: boolean
} {
  const nextHooks = { ...config.hooks }
  const isManagedCommand = getCodeBuddyManagedCommandMatcher()
  let changed = false

  for (const [eventName, definitions] of Object.entries(nextHooks)) {
    if (!Array.isArray(definitions)) {
      continue
    }
    const cleaned = removeManagedCommands(definitions, isManagedCommand)
    if (JSON.stringify(cleaned) !== JSON.stringify(definitions)) {
      changed = true
    }
    if (cleaned.length === 0) {
      delete nextHooks[eventName]
    } else {
      nextHooks[eventName] = cleaned
    }
  }

  return {
    config: { ...config, hooks: nextHooks },
    changed
  }
}

/** Events whose managed command is currently registered in the user's settings. */
export function readManagedCodeBuddyHookEvents(config: HooksConfig): Set<string> {
  const isManagedCommand = getCodeBuddyManagedCommandMatcher()
  return new Set(
    CODEBUDDY_EVENTS.filter((event) =>
      (config.hooks?.[event.eventName] ?? []).some(
        (definition) =>
          (Array.isArray(definition.hooks) &&
            definition.hooks.some((hook) => isManagedCommand(hook.command))) ||
          isManagedCommand(definition.command)
      )
    ).map((event) => event.eventName)
  )
}
