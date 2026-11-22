// Checks every file under content/: each against the schema, then all of them against each other.
// CI runs it on every pull request, so a pull request with an inconsistent page cannot be merged.
import { contentDir, loadContent } from "../src/lib/load-content.ts";

const dir = contentDir(new URL("../", import.meta.url), process.env);
const { pages, problems } = await loadContent(dir, new Date());

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`content is consistent: ${pages.length} pages`);
}
