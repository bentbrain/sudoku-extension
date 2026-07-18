import type { StorageSnapshot } from "./types";

type ReadResponse =
  | { ok: true; snapshot: StorageSnapshot }
  | { ok: false; error: string };

const READ_MESSAGE = "READ_SUDOKUPAD_STORAGE";

export async function readSudokuPadStorage(): Promise<StorageSnapshot> {
  const tabs = await chrome.tabs.query({
    url: ["https://sudokupad.app/*"],
  });

  const tab = tabs.find((item) => item.active) ?? tabs[0];
  if (!tab?.id) {
    throw new Error("Open a SudokuPad tab, then reopen this popup.");
  }

  const response = await chrome.tabs.sendMessage<unknown, ReadResponse>(tab.id, {
    type: READ_MESSAGE,
  });

  if (!response?.ok) {
    throw new Error(response?.error ?? "Unable to read SudokuPad storage.");
  }

  return response.snapshot;
}
