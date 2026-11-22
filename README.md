# omaha

A wiki of American football: schemes, techniques and drills across the whole game, written from
what coaches publish about their own systems.

The site is at <https://omaha.yamat47.me/>, built with Astro from the design system
[`@yamat47/pylon`](https://github.com/yamat47/pylon) and served by GitHub Pages. A merge into
`main` publishes it.

Every page is written in its own words and links the sources it draws on. No text, figure or
video of a source is copied here.

## Pages

A page is a Markdown file at `content/<type>/<slug>.md`, where the type is `schemes`,
`situations`, `techniques` or `terms`. Its frontmatter is described by
[`src/lib/schema.ts`](src/lib/schema.ts), and `make validate` checks every page against it and
against the other pages.

## Development

Everything runs in Docker; only Docker and `make` are needed on the host.

```sh
make setup   # build the image and install the dependencies
make up      # dev server at http://localhost:4321 (make down stops it)
make check   # typecheck, lint, test, validate the pages, and build
make help    # list the targets
```

`OMAHA_CONTENT_DIR=tests/fixtures/content make up` shows the site with four fixture pages, one of
each type.

## Layout

- `content/`: the pages
- `src/`: the site and the rules that check the pages
- `scripts/validate.ts`: the validation `make validate` and CI run
- `tests/`: Vitest tests, and the fixture pages
- `docker/`, `Makefile`: the development environment
- `.github/workflows/`: CI and the deploy to GitHub Pages

## Skills

The skills under `.claude/skills/` are not written here. They are installed from
[yamat47/github-toolkit](https://github.com/yamat47/github-toolkit) and committed, so do not edit
them in place: change them upstream and wait for the release.

```sh
gh skill install yamat47/github-toolkit <skill-name> --agent claude-code --scope project
```

| Skill | Used for |
| --- | --- |
| `create-pr` | from uncommitted changes to a draft pull request |
| `review-pr` | local review of a diff before it is pushed |
| `writing-conventions` | house style for comments, commits, pull requests and docs |
| `github-actions-workflows` | rules for editing `.github/workflows/` |
| `review-dependency-bump` | reviewing Dependabot's dependency bumps |
| `review-skill-update` | reviewing the pull requests `update-skills` opens |

`update-skills.yml` runs `gh skill update --all` monthly and opens a pull request with
`github.token`, which the `omaha` entry in yamat47/infra-github allows
(`actions_can_create_pull_requests`).
