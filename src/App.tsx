import * as React from "react";
import { Loader2, RotateCw } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import { readSudokuPadStorage } from "./chrome";
import { buildDayProgress, difficulties, statusLabel } from "./storage-parser";
import type { DayProgress, Difficulty, GameStatus, StorageSnapshot } from "./types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const dotClass: Record<GameStatus, string> = {
  "not-started": "bg-zinc-300",
  started: "bg-amber-500",
  completed: "bg-emerald-600",
};

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
}

function gameUrl(date: string, difficulty: Difficulty) {
  return `https://sudokupad.app/nyt/${date.replaceAll("-", "")}${difficulty}`;
}

function isDone(day: DayProgress) {
  return difficulties.every((difficulty) => day.games[difficulty] === "completed");
}

function hasIncomplete(day: DayProgress, filters: readonly Difficulty[]) {
  return filters.some((difficulty) => day.games[difficulty] !== "completed");
}

function DifficultyLink({
  date,
  difficulty,
  status,
}: {
  date: string;
  difficulty: Difficulty;
  status: GameStatus;
}) {
  const label = `${difficultyLabel[difficulty]}: ${statusLabel(status)}`;

  return (
    <a
      aria-label={label}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        status === "completed" && "text-zinc-400",
        status === "started" && "text-amber-700",
        status === "not-started" && "text-zinc-950",
      )}
      href={gameUrl(date, difficulty)}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass[status])} />
      {difficultyLabel[difficulty]}
    </a>
  );
}

function DayRow({ day }: { day: DayProgress }) {
  return (
    <div className="border-b border-zinc-100 px-3 py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-24 text-sm font-medium text-zinc-950">
          {formatDate(day.date)}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {difficulties.map((difficulty) => (
            <DifficultyLink
              date={day.date}
              difficulty={difficulty}
              key={difficulty}
              status={day.games[difficulty]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [snapshot, setSnapshot] = React.useState<StorageSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [difficultyFilters, setDifficultyFilters] =
    React.useState<readonly Difficulty[]>(difficulties);

  const toggleDifficulty = (difficulty: Difficulty) => {
    setDifficultyFilters((current) => {
      const next = current.includes(difficulty)
        ? current.filter((item) => item !== difficulty)
        : [...current, difficulty];

      return next.length > 0 ? next : difficulties;
    });
  };

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSnapshot(await readSudokuPadStorage());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to read storage.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const days = React.useMemo(() => {
    if (!snapshot) return [];

    const normalizedQuery = query.trim();
    return buildDayProgress(snapshot.progress, snapshot.completions)
      .filter((day) => !isDone(day))
      .filter((day) => hasIncomplete(day, difficultyFilters))
      .filter((day) => !normalizedQuery || day.date.includes(normalizedQuery));
  }, [difficultyFilters, query, snapshot]);

  const openGames = React.useMemo(
    () =>
      days.reduce(
        (total, day) =>
          total +
          difficulties.filter((difficulty) => day.games[difficulty] !== "completed")
            .length,
        0,
      ),
    [days],
  );

  return (
    <main className="flex h-[500px] flex-col bg-white text-zinc-950">
      <header className="border-b border-zinc-100 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">NYT Sudoku</h1>
            <p className="text-xs text-zinc-500">
              {isLoading && !snapshot ? "Reading SudokuPad" : `${openGames} open games`}
            </p>
          </div>
          <Button
            aria-label="Refresh"
            className="h-8 w-8 border-zinc-200"
            disabled={isLoading}
            onClick={() => void load()}
            size="icon"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <input
          className="mt-3 h-8 w-full rounded border border-zinc-200 px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter date"
          value={query}
        />
        <div className="mt-2 flex gap-1">
          {difficulties.map((difficulty) => {
            const isSelected = difficultyFilters.includes(difficulty);

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "h-7 rounded px-2 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-zinc-950 text-white"
                    : "bg-transparent text-zinc-500 hover:bg-zinc-100",
                )}
                key={difficulty}
                onClick={() => toggleDifficulty(difficulty)}
                type="button"
              >
                {difficultyLabel[difficulty]}
              </button>
            );
          })}
        </div>
      </header>

      {error ? (
        <section className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm font-medium">{error}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Open or reload a SudokuPad tab, then refresh this popup.
            </p>
          </div>
        </section>
      ) : null}

      {!error && snapshot ? (
        <section className="min-h-0 flex-1 overflow-y-auto">
          {days.length > 0 ? (
            days.map((day) => <DayRow day={day} key={day.date} />)
          ) : (
            <div className="p-6 text-center text-sm text-zinc-500">
              No unfinished games found.
            </div>
          )}
        </section>
      ) : null}

      {!error && isLoading && !snapshot ? (
        <section className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Reading
        </section>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
