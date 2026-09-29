import type { SFTPWrapper } from 'ssh2'
import type { AgentHookInstallStatus } from '../../shared/agent-hook-types'
import {
  buildManagedCommandHook,
  readHooksJson,
  writeHooksJson,
  writeManagedScript
} from '../agent-hooks/installer-utils'
import { refreshManagedScriptIfPresent } from '../agent-hooks/managed-hook-script-refresh'
import {
  readHooksJsonRemote,
  writeHooksJsonRemote,
  writeManagedScriptRemote
} from '../agent-hooks/installer-utils-remote'
import {
  applyCodeBuddyManagedHooks,
  getCodeBuddyConfigPath,
  getCodeBuddyManagedCommand,
  getCodeBuddyManagedScriptPath,
  getCodeBuddyPosixManagedScriptFileName,
  getCodeBuddyRemoteConfigPath,
  getCodeBuddyRemoteManagedCommand,
  readManagedCodeBuddyHookEvents,
  removeCodeBuddyManagedHooks,
  CODEBUDDY_EVENTS
} from './hook-settings'
import { getCodeBuddyManagedScript } from './hook-script'

function codebuddyHookError(configPath: string, detail: string): AgentHookInstallStatus {
  return { agent: 'codebuddy', state: 'error', configPath, managedHooksPresent: false, detail }
}

export class CodeBuddyHookService {
  async refreshManagedScripts(): Promise<void> {
    await refreshManagedScriptIfPresent(
      getCodeBuddyManagedScriptPath(),
      getCodeBuddyManagedScript()
    )
  }

  getStatus(): AgentHookInstallStatus {
    const configPath = getCodeBuddyConfigPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return codebuddyHookError(configPath, 'Could not parse CodeBuddy settings.json')
    }

    // Why: report partial registration instead of a false installed state.
    const present = readManagedCodeBuddyHookEvents(config)
    const missing = CODEBUDDY_EVENTS.filter((event) => !present.has(event.eventName))
    if (missing.length === 0) {
      return {
        agent: 'codebuddy',
        state: 'installed',
        configPath,
        managedHooksPresent: true,
        detail: null
      }
    }
    if (present.size === 0) {
      return {
        agent: 'codebuddy',
        state: 'not_installed',
        configPath,
        managedHooksPresent: false,
        detail: null
      }
    }
    return {
      agent: 'codebuddy',
      state: 'partial',
      configPath,
      managedHooksPresent: true,
      detail: `Managed hook missing for events: ${missing.map((event) => event.eventName).join(', ')}`
    }
  }

  install(): AgentHookInstallStatus {
    const configPath = getCodeBuddyConfigPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return codebuddyHookError(configPath, 'Could not parse CodeBuddy settings.json')
    }

    const hook = buildManagedCommandHook(getCodeBuddyManagedCommand())
    const nextConfig = applyCodeBuddyManagedHooks(config, hook)
    // Why: write the script first so settings.json never points at a missing file.
    writeManagedScript(getCodeBuddyManagedScriptPath(), getCodeBuddyManagedScript())
    writeHooksJson(configPath, nextConfig)
    return this.getStatus()
  }

  // Install the CodeBuddy hook on an SSH execution host, where the shell contract is POSIX.
  async installRemote(sftp: SFTPWrapper, remoteHome: string): Promise<AgentHookInstallStatus> {
    const remoteConfigPath = getCodeBuddyRemoteConfigPath(remoteHome)
    // Why: remote-Windows is out of scope; process.platform describes the local box, not the host.
    const remoteScriptFileName = getCodeBuddyPosixManagedScriptFileName()
    const remoteScriptPath = `${remoteHome.replace(/\/$/, '')}/.orca/agent-hooks/${remoteScriptFileName}`
    try {
      // Why: a missing remote settings file is a fresh install ({}); an unreadable one
      // (parse failure) returns null and must not be overwritten; I/O errors rethrow.
      const config = await readHooksJsonRemote(sftp, remoteConfigPath)
      if (!config) {
        return codebuddyHookError(
          remoteConfigPath,
          'Could not parse remote CodeBuddy settings.json'
        )
      }

      const hook = buildManagedCommandHook(getCodeBuddyRemoteManagedCommand())
      const nextConfig = applyCodeBuddyManagedHooks(config, hook)
      await writeManagedScriptRemote(sftp, remoteScriptPath, getCodeBuddyManagedScript('posix'))
      await writeHooksJsonRemote(sftp, remoteConfigPath, nextConfig)

      return {
        agent: 'codebuddy',
        state: 'installed',
        configPath: remoteConfigPath,
        managedHooksPresent: true,
        detail: null
      }
    } catch (err) {
      return codebuddyHookError(remoteConfigPath, err instanceof Error ? err.message : String(err))
    }
  }

  remove(): AgentHookInstallStatus {
    const configPath = getCodeBuddyConfigPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return codebuddyHookError(configPath, 'Could not parse CodeBuddy settings.json')
    }
    const { config: nextConfig, changed } = removeCodeBuddyManagedHooks(config)
    if (changed) {
      writeHooksJson(configPath, nextConfig)
    }
    return this.getStatus()
  }
}

export const codebuddyHookService = new CodeBuddyHookService()
