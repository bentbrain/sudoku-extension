import type {
  CompletionEntry,
  DayProgress,
  Difficulty,
  GameStatus,
  ProgressEntry,
} from "./types";

const difficulties = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

const monthByName: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function parseProgressEntry(value: string): ProgressEntry | null {
  try {
    const parsed = JSON.parse(value) as {
      puzzleId?: unknown;
      shortid?: unknown;
      time?: unknown;
    };
    if (typeof parsed.shortid !== "string") return null;

    const match = /^nyt\/(\d{4})(\d{2})(\d{2})(easy|medium|hard)$/.exec(
      parsed.shortid,
    );
    if (!match) return null;

    return {
      date: `${match[1]}-${match[2]}-${match[3]}`,
      difficulty: match[4] as Difficulty,
      puzzleId:
        typeof parsed.puzzleId === "string" ? parsed.puzzleId : parsed.shortid,
      shortid: parsed.shortid,
      updatedAt: typeof parsed.time === "number" ? parsed.time : undefined,
    };
  } catch {
    return null;
  }
}

export function parseCompletionKey(key: string): CompletionEntry | null {
  const match =
    /^newyorktimes-([a-z]+)(\d{1,2}),(\d{4})(easy|medium|hard)$/.exec(key);
  if (!match) return null;

  const month = monthByName[match[1]];
  if (!month) return null;

  return {
    date: `${match[3]}-${month}-${match[2].padStart(2, "0")}`,
    difficulty: match[4] as Difficulty,
  };
}

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
