// Checks what can be checked about the prose of a page without judgment: banned expressions,
// dashes, sentence length, quotations. `node scripts/prose-check.ts [--json] [paths...]`.
// Exit status 0 for no finding, 1 for findings, 2 for a usage or read error.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { BannedSyntaxError, parseBanned } from "../src/lib/prose/banned.ts";
import { checkDocument } from "../src/lib/prose/check.ts";
import { parseLimits } from "../src/lib/prose/limits.ts";
import type { Finding } from "../src/lib/prose/types.ts";

const USAGE = `usage: node scripts/prose-check.ts [--json] [--profile page|note] [--style DIR] [path ...]
  With no path, checks content and sources/notes (each skipped if it does not exist).`;

const DEFAULT_PATHS = ["content", "sources/notes"];

class UsageError extends Error {}

function read(path: string, what: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new UsageError(`cannot read ${what} ${path}: ${reason}`);
  }
}

function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

// Sorted by name, so the order of the output does not depend on the file system.
function markdownFiles(path: string): string[] {
  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(path);
  } catch {
    throw new UsageError(`no such file or directory: ${path}`);
  }
  if (!stats.isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const child = join(path, entry.name);
      if (entry.isDirectory()) return markdownFiles(child);
      return entry.name.endsWith(".md") ? [child] : [];
    });
}

function loadStyle(directory: string) {
  const bannedPath = join(directory, "banned.txt");
  const limitsPath = join(directory, "limits.json");
  let banned: ReturnType<typeof parseBanned>;
  try {
    banned = parseBanned(read(bannedPath, "the banned list"));
  } catch (error) {
    if (error instanceof BannedSyntaxError) {
      throw new UsageError(
        `${bannedPath}:${error.line}: ${error.message.replace(/^banned\.txt:\d+: /, "")}`,
      );
    }
    throw error;
  }
  let limits: ReturnType<typeof parseLimits>;
  try {
    limits = parseLimits(JSON.parse(read(limitsPath, "the limits")));
  } catch (error) {
    if (error instanceof UsageError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw new UsageError(`${limitsPath}: ${reason}`);
  }
  return { banned, limits };
}

function compare(a: Finding, b: Finding): number {
  const byFile = a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
  return (
    byFile ||
    a.line - b.line ||
    a.column - b.column ||
    (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0)
  );
}

const OPTIONS = {
  json: { type: "boolean" },
  profile: { type: "string" },
  style: { type: "string" },
  help: { type: "boolean", short: "h" },
} as const;

function parseCommandLine(argv: string[]) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

function run(argv: string[]): number {
  const { values, positionals } = parseCommandLine(argv);
  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const profile = values.profile;
  if (profile !== undefined && profile !== "page" && profile !== "note") {
    throw new UsageError(`--profile takes page or note, not ${profile}`);
  }

  const { banned, limits } = loadStyle(values.style ?? "style");
  const roots = positionals.length > 0 ? positionals : DEFAULT_PATHS.filter(exists);
  const files = roots.flatMap(markdownFiles);

  const findings: Finding[] = [];
  for (const file of files) {
    const input = { file, content: read(file, "file"), banned, limits };
    findings.push(...checkDocument(profile === undefined ? input : { ...input, profile }));
  }
  findings.sort(compare);

  if (values.json) {
    process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
  } else {
    for (const finding of findings) {
      process.stdout.write(
        `${finding.file}:${finding.line}:${finding.column} ${finding.rule} ${finding.message}\n`,
      );
    }
    process.stdout.write(`${findings.length} ${findings.length === 1 ? "finding" : "findings"}\n`);
  }
  return findings.length === 0 ? 0 : 1;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof UsageError)) throw error;
  process.stderr.write(`prose-check: ${error.message}\n${USAGE}\n`);
  process.exitCode = 2;
}
