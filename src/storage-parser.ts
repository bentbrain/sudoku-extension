import type {
  CompletionEntry,
  DayProgress,
  Difficulty,
  GameStatus,
  ProgressEntry,
} from "./types";

const difficulties = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export function buildDayProgress(
  progress: ProgressEntry[],
  completions: CompletionEntry[],
  options: { includeDaysBack?: number; today?: Date } = {},
): DayProgress[] {
  const byDate = new Map<string, DayProgress>();

  const ensureDay = (date: string) => {
    const existing = byDate.get(date);
    if (existing) return existing;

    const created: DayProgress = {
      date,
      games: {
        easy: "not-started",
        medium: "not-started",
        hard: "not-started",
      },
    };
    byDate.set(date, created);
    return created;
  };

  for (const item of progress) {
    const day = ensureDay(item.date);
    day.games[item.difficulty] = "started";
    day.updatedAt = Math.max(day.updatedAt ?? 0, item.updatedAt ?? 0);
  }

  for (const item of completions) {
    const day = ensureDay(item.date);
    day.games[item.difficulty] = "completed";
  }

  const includeDaysBack = options.includeDaysBack ?? 90;
  const today = options.today ?? new Date();
  const cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  for (let offset = 0; offset < includeDaysBack; offset += 1) {
    ensureDay(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function statusLabel(status: GameStatus) {
  switch (status) {
    case "completed":
      return "Completed";
    case "started":
      return "Started";
    case "not-started":
      return "Not started";
  }
}

export { difficulties };
