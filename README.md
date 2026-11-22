# omaha

A wiki of American football: schemes, techniques and drills across the whole game, written from
what coaches publish about their own systems.

Nothing is published yet. The site will be built with Astro and served by GitHub Pages.

Every page is written in its own words and links the sources it draws on. No text, figure or
video of a source is copied here.

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
