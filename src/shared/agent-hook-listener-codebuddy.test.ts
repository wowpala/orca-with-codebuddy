import { beforeEach, describe, expect, it } from 'vitest'
import {
  createHookListenerState,
  type HookListenerState
} from './agent-hook-listener/listener-state'
import { normalizeAndAccept } from './agent-hook-listener-test-harness'

/**
 * CodeBuddy Code delivers Claude Code's stdin shape verbatim
 * (`hook_event_name`, `prompt`, `tool_name`, `tool_input`), so the fixtures
 * below are the Claude payloads CodeBuddy's hook runner puts on the wire.
 */
function codebuddyEvent(
  hookEventName: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: 'sess-1',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: '/tmp/ws',
    hook_event_name: hookEventName,
    ...extra
  }
}

let state: HookListenerState
beforeEach(() => {
  state = createHookListenerState()
})

describe('normalizeCodeBuddyEvent', () => {
  it('lands a startup SessionStart as an idle session boundary, not a spinner', () => {
    const event = normalizeAndAccept(
      state,
      'codebuddy',
      codebuddyEvent('SessionStart', { source: 'startup' })
    )
    expect(event?.payload).toMatchObject({
      state: 'done',
      agentType: 'codebuddy',
      sessionBoundary: true
    })
  })

  it('drops a compact SessionStart, which fires mid-turn', () => {
    expect(
      normalizeAndAccept(state, 'codebuddy', codebuddyEvent('SessionStart', { source: 'compact' }))
    ).toBeNull()
  })

  it('reports working from UserPromptSubmit and carries the prompt', () => {
    const event = normalizeAndAccept(
      state,
      'codebuddy',
      codebuddyEvent('UserPromptSubmit', { prompt: 'refactor the parser' })
    )
    expect(event?.payload).toMatchObject({
      state: 'working',
      agentType: 'codebuddy',
      prompt: 'refactor the parser'
    })
  })

  it('reports working with tool fields from PreToolUse and PostToolUse', () => {
    const pre = normalizeAndAccept(
      state,
      'codebuddy',
      codebuddyEvent('PreToolUse', {
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/a.ts' }
      })
    )
    expect(pre?.payload).toMatchObject({
      state: 'working',
      agentType: 'codebuddy',
      toolName: 'Read'
    })
    const post = normalizeAndAccept(state, 'codebuddy', codebuddyEvent('PostToolUse'))
    expect(post?.payload).toMatchObject({ state: 'working', agentType: 'codebuddy' })
  })

  it('maps an AskUserQuestion PreToolUse to waiting, then Stop to done', () => {
    const waiting = normalizeAndAccept(
      state,
      'codebuddy',
      codebuddyEvent('PreToolUse', {
        tool_name: 'AskUserQuestion',
        tool_input: { questions: [{ question: 'Which approach?' }] }
      })
    )
    expect(waiting?.payload).toMatchObject({ state: 'waiting', agentType: 'codebuddy' })
    const done = normalizeAndAccept(state, 'codebuddy', codebuddyEvent('Stop'))
    expect(done?.payload).toMatchObject({ state: 'done', agentType: 'codebuddy' })
  })

  it('drops events that carry no pane state', () => {
    expect(
      normalizeAndAccept(state, 'codebuddy', codebuddyEvent('Notification', { message: 'hi' }))
    ).toBeNull()
    expect(normalizeAndAccept(state, 'codebuddy', codebuddyEvent('PreCompact'))).toBeNull()
    expect(normalizeAndAccept(state, 'codebuddy', codebuddyEvent('SubagentStop'))).toBeNull()
  })
})
