import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as NodeOs from 'node:os'

const hoisted = vi.hoisted(() => ({ home: '' }))
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeOs>()
  return { ...actual, homedir: () => hoisted.home }
})
vi.mock('electron', () => ({ app: { getPath: () => hoisted.home } }))

import { codebuddyHookService } from './hook-service'
import { getCodeBuddyConfigPath, CODEBUDDY_EVENTS } from './hook-settings'

type ManagedHookEntry = { type: string; command: string; timeout?: number }
type CodeBuddySettingsFile = {
  hooks?: Record<string, { matcher?: string; hooks: ManagedHookEntry[] }[]>
  [key: string]: unknown
}

// Why no assertion: `JSON.parse` is already `any`, so the annotation narrows without a cast.
function readConfig(): CodeBuddySettingsFile {
  return JSON.parse(readFileSync(getCodeBuddyConfigPath(), 'utf-8'))
}

beforeEach(() => {
  hoisted.home = mkdtempSync(join(tmpdir(), 'orca-codebuddy-'))
})
afterEach(() => {
  rmSync(hoisted.home, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('CodeBuddyHookService', () => {
  it('reports not_installed before any install', () => {
    expect(codebuddyHookService.getStatus()).toMatchObject({
      agent: 'codebuddy',
      state: 'not_installed',
      managedHooksPresent: false
    })
  })

  it('creates settings.json with every lifecycle event', () => {
    const status = codebuddyHookService.install()
    expect(status).toMatchObject({
      agent: 'codebuddy',
      state: 'installed',
      managedHooksPresent: true
    })
    const config = readConfig()
    expect(Object.keys(config.hooks ?? {}).sort()).toEqual(
      CODEBUDDY_EVENTS.map((event) => event.eventName).sort()
    )
    for (const event of CODEBUDDY_EVENTS) {
      expect(config.hooks?.[event.eventName]?.[0]?.hooks?.[0]?.command).toContain('codebuddy-hook')
    }
  })

  it('writes the managed launcher script into ~/.orca/agent-hooks', () => {
    codebuddyHookService.install()
    const extension = process.platform === 'win32' ? 'cmd' : 'sh'
    const scriptPath = join(hoisted.home, '.orca', 'agent-hooks', `codebuddy-hook.${extension}`)
    expect(existsSync(scriptPath)).toBe(true)
    const script = readFileSync(scriptPath, 'utf-8')
    expect(script).toContain('/hook/codebuddy')
  })

  it('is idempotent — a second install adds no duplicate entries', () => {
    codebuddyHookService.install()
    const first = readFileSync(getCodeBuddyConfigPath(), 'utf-8')
    codebuddyHookService.install()
    expect(readFileSync(getCodeBuddyConfigPath(), 'utf-8')).toBe(first)
    const config = readConfig()
    expect(config.hooks?.Stop).toHaveLength(1)
  })

  it("preserves the user's own hooks and unrelated config", () => {
    const configPath = getCodeBuddyConfigPath()
    mkdirSync(join(hoisted.home, '.codebuddy'), { recursive: true })
    writeFileSync(
      configPath,
      `{
  "model": "deepseek-v4.1-flash",
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "my-own-hook.sh" }] }]
  }
}
`
    )
    codebuddyHookService.install()
    const text = readFileSync(configPath, 'utf-8')
    expect(text).toContain('my-own-hook.sh')
    expect(text).toContain('"model": "deepseek-v4.1-flash"')
    const config = readConfig()
    expect(config.hooks?.Stop).toHaveLength(2)
    // The managed entry is appended, so the user's own hook still runs first.
    expect(config.hooks?.Stop?.[0]?.hooks?.[0]?.command).toBe('my-own-hook.sh')
  })

  it('removes only Orca-managed entries and leaves the user their hooks', () => {
    const configPath = getCodeBuddyConfigPath()
    mkdirSync(join(hoisted.home, '.codebuddy'), { recursive: true })
    writeFileSync(
      configPath,
      JSON.stringify({
        hooks: { Stop: [{ hooks: [{ type: 'command', command: 'my-own-hook.sh' }] }] }
      })
    )
    codebuddyHookService.install()
    codebuddyHookService.remove()
    const config = readConfig()
    expect(config.hooks?.Stop).toHaveLength(1)
    expect(config.hooks?.Stop?.[0]?.hooks?.[0]?.command).toBe('my-own-hook.sh')
    expect(codebuddyHookService.getStatus()).toMatchObject({
      state: 'not_installed',
      managedHooksPresent: false
    })
  })
})
