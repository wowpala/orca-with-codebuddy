import { isAskUserQuestionTool } from '../../agent-question-answered-intent'
import {
  normalizeAgentStatusPayload,
  type ParsedAgentStatusPayload
} from '../../agent-status-types'
import type { HookListenerState } from '../listener-state'
import {
  resolvePrompt,
  resolveToolState,
  shouldIgnoreCompactContinuationUserPromptSubmit
} from '../prompt-fields'
import { extractToolFields, isNewTurnEvent } from '../provider-event-routing'
import { readString } from '../tool-input-preview'

// Why: CodeBuddy Code is a Claude Code-compatible CLI whose hooks deliver the
// Claude stdin shape (`hook_event_name`, `tool_name`, `tool_input`,
// `transcript_path`), so the Claude tool-field extractor applies verbatim;
// only the agent identity differs.
const CODEBUDDY_IDLE_SESSION_START_SOURCES: ReadonlySet<string> = new Set([
  'startup',
  'resume',
  'clear'
])

type CodeBuddyTurn = {
  stateName: 'working' | 'waiting' | 'done'
  /** Only SessionStart lands a boundary row, and only for an idle source. */
  sessionBoundary?: true
}

/** What one CodeBuddy lifecycle event says about the pane, or null when it says nothing. */
function readCodeBuddyTurn(
  eventName: unknown,
  hookPayload: Record<string, unknown>
): CodeBuddyTurn | null {
  switch (eventName) {
    case 'SessionStart': {
      // Why: land a resumed/started session as an idle boundary row, not a phantom spinner;
      // `compact` fires mid-turn, so anything outside the idle allowlist is dropped.
      const source = hookPayload['source']
      return typeof source === 'string' && CODEBUDDY_IDLE_SESSION_START_SOURCES.has(source)
        ? { stateName: 'done', sessionBoundary: true }
        : null
    }
    case 'UserPromptSubmit':
    case 'PostToolUse':
      return { stateName: 'working' }
    case 'PreToolUse':
      // Why: CodeBuddy's clarification tool is `AskUserQuestion` with Claude's
      // questions/options input shape, so Orca's question card renders it unchanged.
      return {
        stateName: isAskUserQuestionTool(readString(hookPayload, 'tool_name'))
          ? 'waiting'
          : 'working'
      }
    case 'Stop':
      return { stateName: 'done' }
    default:
      return null
  }
}

export function normalizeCodeBuddyEvent(
  state: HookListenerState,
  eventName: unknown,
  promptText: string,
  paneKey: string,
  hookPayload: Record<string, unknown>
): ParsedAgentStatusPayload | null {
  if (shouldIgnoreCompactContinuationUserPromptSubmit(eventName, promptText)) {
    return null
  }
  const turn = readCodeBuddyTurn(eventName, hookPayload)
  if (!turn) {
    return null
  }

  const resetOnNewTurn = isNewTurnEvent('codebuddy', eventName)
  const snapshot = resolveToolState(
    state,
    paneKey,
    extractToolFields('codebuddy', eventName, hookPayload),
    { resetOnNewTurn }
  )

  return normalizeAgentStatusPayload({
    state: turn.stateName,
    prompt: resolvePrompt(state, paneKey, promptText, { resetOnNewTurn }),
    agentType: 'codebuddy',
    toolName: snapshot.toolName,
    toolInput: snapshot.toolInput,
    interactivePrompt: snapshot.interactivePrompt,
    lastAssistantMessage: snapshot.lastAssistantMessage,
    lastAssistantMessageIsToolOutput: snapshot.lastAssistantMessageIsToolOutput,
    sessionBoundary: turn.sessionBoundary
  })
}
