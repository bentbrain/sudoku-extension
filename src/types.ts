export type Difficulty = "easy" | "medium" | "hard";
export type GameStatus = "not-started" | "started" | "completed";

export type ProgressEntry = {
  date: string;
  difficulty: Difficulty;
  puzzleId: string;
  shortid: string;
  updatedAt?: number;
};

export type CompletionEntry = {
  date: string;
  difficulty: Difficulty;
};

export type StorageSnapshot = {
  href: string;
  readAt: number;
  progress: ProgressEntry[];
  completions: CompletionEntry[];
  localStorageKeyCount: number;
  sessionStorageKeyCount: number;
};

export type DayProgress = {
  date: string;
  games: Record<Difficulty, GameStatus>;
  updatedAt?: number;
};
