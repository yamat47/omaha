/**
 * What a page's body may not hold. The page's title is the heading of level one, so the body's
 * own headings start at level two, and no picture enters the wiki: a figure of a source is not
 * copied, and the site shows no image.
 */
export function findBodyProblems(body: string): string[] {
  const problems: string[] = [];
  let fence: string | null = null;

  const lines = body.split("\n");
  lines.forEach((line, index) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker !== undefined) {
      // A fence closes with the same character, at least as long as it opened.
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return;
    }
    if (fence !== null) return;

    const number = index + 1;
    const underlinesText = /^ {0,3}=+[ \t]*$/.test(line) && (lines[index - 1] ?? "").trim() !== "";
    if (/^ {0,3}#(?:\s|$)/.test(line) || underlinesText) {
      problems.push(`body line ${number}: a heading of level one; the body's headings start at ##`);
    }
    if (/!\[[^\]]*\][([]|<img[\s>]/i.test(line)) {
      problems.push(`body line ${number}: an image; pages hold none`);
    }
  });

  return problems;
}
