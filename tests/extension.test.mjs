import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
const contentScript = readFileSync(`dist/${manifest.content_scripts[0].js[0]}`, "utf8");

function createContentScript(entries) {
  const values = new Map(entries);
  let listener;
  runInNewContext(contentScript, {
    chrome: { runtime: { onMessage: { addListener(callback) { listener = callback; } } } },
    window: { location: { href: "https://sudokupad.app/test" } },
    localStorage: {
      get length() { return values.size; },
      key(index) { return [...values.keys()][index]; },
      getItem(key) { return values.get(key); },
    },
    sessionStorage: { length: 0 },
  });
  return listener;
}

test("built extension includes the popup and a standalone content script", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(existsSync(`dist/${manifest.action.default_popup}`));
  assert.deepEqual(manifest.host_permissions, ["https://sudokupad.app/*"]);
  assert.ok(!/\bimport\s/.test(contentScript));
});

test("content script reads real SudokuPad keys and ignores invalid entries", () => {
  const listener = createContentScript([
    ["progress_easy", JSON.stringify({ shortid: "nyt/20261014easy", time: 42 })],
    ["progress_invalid", "broken"],
    ["progress_unrelated", JSON.stringify({ shortid: "other-puzzle" })],
    ["svencodes_puzzlecounterincremented", JSON.stringify({
      "newyorktimes-october14,2026hard": "c",
      "newyorktimes-october14,2026medium": "pending",
    })],
  ]);
  let response;
  assert.equal(listener({ type: "READ_SUDOKUPAD_STORAGE" }, {}, (value) => { response = value; }), false);
  assert.equal(response.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(response.snapshot.progress)), [{
    date: "2026-10-14", difficulty: "easy", puzzleId: "nyt/20261014easy", shortid: "nyt/20261014easy", updatedAt: 42,
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(response.snapshot.completions)), [{ date: "2026-10-14", difficulty: "hard" }]);
  assert.equal(response.snapshot.href, "https://sudokupad.app/test");
});

test("content script does not respond to unrelated messages", () => {
  const listener = createContentScript([]);
  let responded = false;
  assert.equal(listener({ type: "unrelated" }, {}, () => { responded = true; }), false);
  assert.equal(responded, false);
});
