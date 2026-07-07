// Typed shapes for every `logs.data` payload. The `logs.data` column is
// free-form jsonb — this file is the single registry of what each log
// `type` stores, so scoring, reward feedback and reviews all read the
// same shape instead of re-guessing it per page.

export type Pillar = "body" | "mind" | "build" | "money"

// type = 'mission' — the four pillar intentions for the day (one row/day)
export type MissionEntry = { text?: string; done?: boolean }
export type MissionData = Partial<Record<Pillar, MissionEntry>>

// type = 'one_move' — THE one thing that makes today a win (one row/day)
export type OneMoveData = { text?: string; done?: boolean }

// type = 'close_day' — the evening close (one row/day).
// `tomorrow_first_move` is surfaced next morning as the suggested One Move.
export type CloseDayData = {
  got_done?: string
  failed?: string
  avoided?: string
  lesson?: string
  tomorrow_first_move?: string
}

// type = 'daily' — the quick daily check-in
export type DailyData = {
  energy?: number
  mood?: number
  top_action?: string
  top_action_done?: boolean
  note?: string
}

// type = 'mind' (and legacy 'learning') — the mind journal
export type MindData = {
  lesson?: string
  avoided?: string
  distraction?: string
  focus?: number
  learning_minutes?: number
  tomorrow?: string
  note?: string
}
