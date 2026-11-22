import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Finding } from "../../src/lib/prose/types.ts";
import { CLEAN_PAGE, COPIED_NOTE, GOOD_NOTE, LONG_PAGE, TRIP_PAGE } from "./fixtures.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const script = join(root, "scripts", "prose-check.ts");
const work = mkdtempSync(join(tmpdir(), "prose-check-"));

function write(base: string, path: string, text: string): void {
  const target = join(base, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}

// The style files are copied next to the pages, as they sit next to them in the repository, so
// that each test can break its own copy.
function project(name: string, files: Record<string, string>): string {
  const dir = join(work, name);
  cpSync(join(root, "style"), join(dir, "style"), { recursive: true });
  for (const [path, text] of Object.entries(files)) write(dir, path, text);
  return dir;
}

function run(cwd: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

let everything: string;

beforeAll(() => {
  everything = project("everything", {
    [CLEAN_PAGE.path]: CLEAN_PAGE.text,
    [LONG_PAGE.path]: LONG_PAGE.text,
    [TRIP_PAGE.path]: TRIP_PAGE.text,
    [GOOD_NOTE.path]: GOOD_NOTE.text,
    [COPIED_NOTE.path]: COPIED_NOTE.text,
    "content/notes.txt": "very — really\n",
  });
});

afterAll(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("prose-check: output and status", () => {
  it("exits 0 and prints a count of none when nothing is found", () => {
    const result = run(everything, CLEAN_PAGE.path, LONG_PAGE.path, GOOD_NOTE.path);

    expect(result).toEqual({ status: 0, stdout: "0 findings\n", stderr: "" });
  });

  it("exits 1 and prints one finding per line, then a count", () => {
    const result = run(everything, TRIP_PAGE.path);

    expect(result.status).toBe(1);
    const output = result.stdout.trimEnd().split("\n");
    expect(output).toHaveLength(13);
    expect(output[0]).toBe(
      `${TRIP_PAGE.path}:6:4 stock-heading Name the heading after what the section says, not after its place in the page.`,
    );
    expect(output.slice(0, 12).every((row) => /^\S+:\d+:\d+ [a-z-]+ \S.*\.$/.test(row))).toBe(true);
    expect(output[12]).toBe("12 findings");
  });

  it("says finding in the singular for one", () => {
    const dir = project("one", { "content/techniques/a.md": "A very odd line.\n" });
    const result = run(dir, "content/techniques/a.md");

    expect(result.stdout.endsWith(" 1 finding\n")).toBe(false);
    expect(result.stdout.split("\n").at(-2)).toBe("1 finding");
  });

  it("prints the findings as an array with --json", () => {
    const result = run(everything, "--json", TRIP_PAGE.path);
    const findings = JSON.parse(result.stdout) as Finding[];

    expect(result.status).toBe(1);
    expect(findings).toHaveLength(12);
    expect(Object.keys(findings[0] ?? {}).sort()).toEqual([
      "column",
      "excerpt",
      "file",
      "line",
      "message",
      "rule",
    ]);
    expect(findings[0]).toMatchObject({
      file: TRIP_PAGE.path,
      line: 6,
      column: 4,
      rule: "stock-heading",
    });
  });

  it("prints an empty array with --json when nothing is found", () => {
    const result = run(everything, "--json", CLEAN_PAGE.path);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([]);
  });

  it("sorts by path, then line, column and rule, whatever order the paths come in", () => {
    const forward = run(everything, "content", "sources/notes");
    const backward = run(everything, "sources/notes", "content");

    expect(forward.stdout).toBe(backward.stdout);
    const rows = forward.stdout.trimEnd().split("\n").slice(0, -1);
    const keys = rows.map((row) => {
      const [location = "", rule = ""] = row.split(" ");
      const [file = "", line = "0", column = "0"] = location.split(":");
      return { file, line: Number(line), column: Number(column), rule };
    });
    const sorted = [...keys].sort(
      (a, b) =>
        (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
        a.line - b.line ||
        a.column - b.column ||
        (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0),
    );
    expect(keys).toEqual(sorted);
  });

  it("prints the same output on each run", () => {
    expect(run(everything).stdout).toBe(run(everything).stdout);
  });
});

describe("prose-check: which files", () => {
  it("checks content and sources/notes when given no path, each with its profile", () => {
    const result = run(everything, "--json");
    const files = new Set((JSON.parse(result.stdout) as Finding[]).map((f) => f.file));

    expect([...files].sort()).toEqual([TRIP_PAGE.path, COPIED_NOTE.path]);
    expect(
      (JSON.parse(result.stdout) as Finding[])
        .filter((f) => f.file === COPIED_NOTE.path)
        .map((f) => f.rule),
    ).toEqual(["block-quote", "image", "quote-length"]);
  });

  it("skips a default directory that does not exist, silently", () => {
    const onlyContent = project("only-content", { [CLEAN_PAGE.path]: CLEAN_PAGE.text });
    const nothing = project("nothing", {});

    expect(run(onlyContent)).toEqual({ status: 0, stdout: "0 findings\n", stderr: "" });
    expect(run(nothing)).toEqual({ status: 0, stdout: "0 findings\n", stderr: "" });
  });

  it("searches a directory recursively for .md files and no others", () => {
    const result = run(everything, "--json", "content");
    const files = new Set((JSON.parse(result.stdout) as Finding[]).map((f) => f.file));

    expect([...files]).toEqual([TRIP_PAGE.path]);
  });

  it("reads a file named on the command line whatever its extension", () => {
    const result = run(everything, "content/notes.txt");

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("content/notes.txt:1:1 banned");
  });

  it("takes the profile from the path and lets --profile override it", () => {
    const asPage = run(everything, "--json", "--profile", "page", COPIED_NOTE.path);
    const asNote = run(everything, "--json", "--profile", "note", TRIP_PAGE.path);

    expect((JSON.parse(asPage.stdout) as Finding[]).length).toBeGreaterThanOrEqual(3);
    expect((JSON.parse(asNote.stdout) as Finding[]).map((f) => f.rule)).toEqual([
      "block-quote",
      "quote-length",
      "image",
    ]);
  });

  it("reads rules from the directory given with --style", () => {
    const other = join(work, "other-style");
    mkdirSync(other);
    writeFileSync(join(other, "banned.txt"), "Cover 3\n");
    writeFileSync(
      join(other, "limits.json"),
      JSON.stringify({ sentenceWords: 5, quoteWords: 30, boldPerParagraph: 1, pageWords: {} }),
    );
    const result = run(everything, "--style", other, "--json", CLEAN_PAGE.path);
    const rules = new Set((JSON.parse(result.stdout) as Finding[]).map((f) => f.rule));

    expect(result.status).toBe(1);
    expect([...rules].sort()).toEqual(["banned", "sentence-length"]);
  });
});

describe("prose-check: errors", () => {
  function broken(name: string, banned: string | null, limits: string | null): string {
    const dir = project(name, { [CLEAN_PAGE.path]: CLEAN_PAGE.text });
    if (banned !== null) writeFileSync(join(dir, "style", "banned.txt"), banned);
    else rmSync(join(dir, "style", "banned.txt"));
    if (limits !== null) writeFileSync(join(dir, "style", "limits.json"), limits);
    else rmSync(join(dir, "style", "limits.json"));
    return dir;
  }

  it("exits 2 when the limits file is missing", () => {
    const result = run(broken("no-limits", "very\n", null), CLEAN_PAGE.path);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/cannot read the limits style[/\\]limits\.json/);
  });

  it("exits 2 when the banned list is missing", () => {
    const result = run(broken("no-banned", null, "{}"), CLEAN_PAGE.path);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/cannot read the banned list/);
  });

  it("exits 2 and names the line of a regular expression that cannot be read", () => {
    const limits = JSON.stringify({
      sentenceWords: 35,
      quoteWords: 30,
      boldPerParagraph: 1,
      pageWords: {},
    });
    const result = run(broken("bad-regex", "# header\nvery\n/(open/\n", limits), CLEAN_PAGE.path);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/style[/\\]banned\.txt:3: invalid regular expression/);
  });

  it("exits 2 when the limits are not valid JSON or miss a value", () => {
    const notJson = run(broken("limits-text", "very\n", "{"), CLEAN_PAGE.path);
    const missing = run(
      broken("limits-missing", "very\n", '{"sentenceWords": 35}'),
      CLEAN_PAGE.path,
    );

    expect(notJson.status).toBe(2);
    expect(notJson.stderr).toMatch(/limits\.json/);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toMatch(/quoteWords|pageWords/);
  });

  it("exits 2 for a path that does not exist, and checks nothing", () => {
    const result = run(everything, CLEAN_PAGE.path, "content/missing.md");

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/no such file or directory: content[/\\]missing\.md/);
  });

  it("exits 2 for an unknown option, a bad profile and a style directory that is not there", () => {
    expect(run(everything, "--nope").status).toBe(2);
    expect(run(everything, "--profile", "other", CLEAN_PAGE.path).status).toBe(2);
    expect(run(everything, "--style", "no-such-dir", CLEAN_PAGE.path).status).toBe(2);
  });

  it("prints the usage for --help", () => {
    const result = run(everything, "--help");

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^usage: node scripts\/prose-check\.ts/);
  });
});
