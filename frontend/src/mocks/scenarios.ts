export interface MockScenario {
  delayMs: number

  emptyLists: boolean

  serverError: boolean

  unauthorized: boolean

  offline: boolean

  mediaUnavailable: boolean
}

const SCENARIOS: Record<string, MockScenario> = {
  ok: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  slow: {
    delayMs: 3000,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  empty: {
    delayMs: 0,
    emptyLists: true,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  "server-error": {
    delayMs: 0,
    emptyLists: false,
    serverError: true,
    unauthorized: false,
    offline: false,
    mediaUnavailable: false,
  },
  unauthorized: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: true,
    offline: false,
    mediaUnavailable: false,
  },
  offline: {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: true,
    mediaUnavailable: false,
  },

  "media-unavailable": {
    delayMs: 0,
    emptyLists: false,
    serverError: false,
    unauthorized: false,
    offline: false,
    mediaUnavailable: true,
  },
}

export function resolveScenario(name: string): MockScenario {
  return SCENARIOS[name] ?? SCENARIOS.ok
}
