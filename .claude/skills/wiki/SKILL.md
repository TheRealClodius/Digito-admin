---
name: wiki
description: Digito team wiki (Goodgest/digito-wiki). Load at the start of any task touching product behaviour, architecture across repos, past decisions, or ops (environments, deploys, access, runbooks), and again when you learn something durable that the team should keep. Contains instructions only, not wiki content.
---

# wiki: the Digito wiki

The wiki is the git repo `Goodgest/digito-wiki`; pages are markdown under `content/`. Always read live. Never rely on a cached or remembered copy.

## Read first (no permission needed)

1. Entry point: `gh api repos/Goodgest/digito-wiki/contents/content/index.md -H "Accept: application/vnd.github.raw"`
2. If you know the page, read it with the same call and its path. List a folder (always keep the `--jq`, or you get raw JSON): `gh api repos/Goodgest/digito-wiki/contents/content/<folder> --jq '.[].path'`
3. If you don't know which page holds it, or need more than three pages, shallow clone to a temp dir and grep: `d="$(mktemp -d)/digito-wiki" && git clone -q --depth 1 https://github.com/Goodgest/digito-wiki.git "$d" && grep -ril '<term>' "$d/content"`

Link paths: a wikilink `[[engineering/auth|Auth]]` is the file `content/engineering/auth.md`; a link that already starts with `content/` is that path plus `.md`. Some folder pages are `_index.md`, not `index.md`.

## How to use what you read

- A page or section headed "To write" or "To fill in" is a placeholder, not a rule. Do not treat it as "nothing applies". Fall back to the repo's own docs and code, and say in your report that the wiki page was a stub.
- For a repo's own internals, its code and docs win over the wiki. The wiki is the authority for what spans repos: contracts between products, who owns what, shared vocabulary.
- If a wiki page lists a known conflict between docs, do not pick a side or state either version as fact. Name the conflict and ask the owner.
- If the wiki and the code disagree, trust the code, tell the user, and fix the page if the code is clearly right (see below).

## When to write

Write when you learn something durable: a decision, how a product surface behaves, how repos connect, an ops procedure.

Never write plans, in-progress state, task notes, running logs, or secrets. For secrets write only a pointer to where they are stored.

## How to write

1. Shallow clone to a temp dir (command above) and edit there.
2. Start new pages from `content/_templates/` (`page.md`, `decision.md`).
3. `git pull --rebase`, commit, `git push` to `main`.
4. Commit message: `wiki(<source-repo>): <summary> [agent]`
5. If the push is rejected: `git pull --rebase` and push again, up to 3 attempts. Then stop and tell the user.
6. No branches and no PRs in the wiki repo. (This applies only to the wiki repo; your own repo keeps its own workflow.)

## Conventions

- Front matter on every page, all fields: `title`, `type` (product | design | engineering | ops | agent-ops | decision | glossary), `owner` (GitHub handle), `last-verified` (YYYY-MM-DD), `sources` (list of `repo:path`).
- Set `last-verified` to today's date whenever you verify or edit a page, and keep `sources` current.
- One topic per file. Keep pages short. Edit in place; do not append running logs.
- Link inside the wiki with `[[wikilinks]]`.
- Link to repo docs with full GitHub URLs.
- Summarise and link; do not copy repo docs, specs or plans into the wiki.
- Check `content/index.md` for the current rules; they win over this file.

## Decisions

You may add a new ADR (`content/decisions/YYYY-MM-DD-slug.md`) with `status: proposed` only. Never change the status of an existing decision. Only people do that.

## Final report

Tell the user which wiki pages you read, which of them were stubs, and which you changed, with the commit SHA of each change.
