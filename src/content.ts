import type { CompletionEntry, ProgressEntry, StorageSnapshot } from "./types";

const READ_MESSAGE = "READ_SUDOKUPAD_STORAGE";
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

function parseProgressEntry(value: string): ProgressEntry | null {
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
      difficulty: match[4] as ProgressEntry["difficulty"],
      puzzleId:
        typeof parsed.puzzleId === "string" ? parsed.puzzleId : parsed.shortid,
      shortid: parsed.shortid,
      updatedAt: typeof parsed.time === "number" ? parsed.time : undefined,
    };
  } catch {
    return null;
  }
}

function parseCompletionKey(key: string): CompletionEntry | null {
  const match =
    /^newyorktimes-([a-z]+)(\d{1,2}),(\d{4})(easy|medium|hard)$/.exec(key);
  if (!match) return null;

  const month = monthByName[match[1]];
  if (!month) return null;

  return {
    date: `${match[3]}-${month}-${match[2].padStart(2, "0")}`,
    difficulty: match[4] as CompletionEntry["difficulty"],
  };
}

function readSnapshot(): StorageSnapshot {
  const progress: ProgressEntry[] = [];
  const completions: CompletionEntry[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (key.startsWith("progress_")) {
      const value = localStorage.getItem(key);
      if (!value) continue;
      const entry = parseProgressEntry(value);
      if (entry) progress.push(entry);
      continue;
    }

    if (key === "svencodes_puzzlecounterincremented") {
      const value = localStorage.getItem(key);
      if (!value) continue;

      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        for (const [completionKey, status] of Object.entries(parsed)) {
          if (status !== "c") continue;
          const completion = parseCompletionKey(completionKey);
          if (completion) completions.push(completion);
        }
      } catch {
        continue;
      }
    }
  }

  return {
    href: window.location.href,
    readAt: Date.now(),
    progress,
    completions,
    localStorageKeyCount: localStorage.length,
    sessionStorageKeyCount: sessionStorage.length,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== READ_MESSAGE) return false;

  try {
    sendResponse({ ok: true, snapshot: readSnapshot() });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to read storage",
    });
  }

  return false;
});
