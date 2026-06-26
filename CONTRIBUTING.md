# Contributing to Muse · Catch

Thanks for your interest in improving Muse! This doc captures the conventions
this repo follows so history stays readable and the codebase stays shippable.
It reflects the patterns already in use — no surprises.

## Git workflow

### Branching

- `main` is always deployable. Small fixes can go straight to `main`, but
  anything risky (a redesign, a new subsystem, a large refactor) should land
  on a feature branch first (`feat/<topic>`, `redesign/<topic>`) and be merged
  after a self-review.
- The v2.0.0 cockpit redesign was reverted twice on `main` in the early
  history — ~4000 lines of net-zero churn. Prototyping on a branch avoids that.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes so
the log is greppable and a changelog can be derived later:

```
<type>(<scope>): <imperative summary>

<optional body explaining why, not what>
```

- `type`: `feat`, `fix`, `refactor`, `chore`, `docs`, `i18n`, `perf`, `revert`
- `scope` (optional): the area, e.g. `server`, `i18n`, `extension`, `dashboard`
- Summary in the imperative ("add", not "added" / "adds"). ≤72 chars ideal.

Good: `fix(server): repair init_db() NameError and llm_extract() undefined-db bug`
Avoid: `修复视频` / `触发重新部署` / `asdf` — these were noise in early history.

### Atomic commits

One logical change per commit. If you fixed a bug AND added a feature AND
bumped a dep, that's three commits. A commit titled `fixes + model config`
that bundles four unrelated fixes is hard to review and hard to revert.

### Deploy-trigger commits

Don't push empty "trigger redeploy" commits. If a redeploy is genuinely
needed, use the platform's redeploy button or an explicit empty commit with a
clear message (`chore: trigger redeploy for env var rotation`), and avoid
letting them accumulate.

## Versioning

- Tag real release points: `git tag v1.4.4`. Don't reuse a version number
  across multiple commits — `v1.6` currently labels four unrelated commits,
  which makes "what shipped in v1.6" unanswerable.
- Consider a `CHANGELOG.md` generated from tags once releases stabilize.

## Secrets

- `.env` is in `.gitignore` for a reason. **Never** `git add -f .env`.
- A live API key was force-added to this repo's early history and had to be
  rotated + purged with `git filter-repo`. To prevent recurrence:
  - Install a pre-commit hook ([`gitleaks`](https://github.com/gitleaks/gitleaks)
    or [`detect-secrets`](https://github.com/Yelp/detect-secrets)).
  - If you ever commit a secret by accident, **rotate it immediately** —
    assume a public repo's history is already crawled.

## i18n

This project ships four locales (`zh-CN`, `en`, `zh-TW`, `ja`).

- All user-facing strings live in `i18n/<lang>.json` under a flat dotted-key
  namespace (`toast.deleted`, `hero.title`, …). **Never hardcode UI text** in
  HTML or JS — mark static text with `data-i18n` (or `data-i18n-html` for
  markup) and call `t('key')` for dynamic strings.
- After editing any `i18n/*.json`, regenerate the inlined copy:
  ```bash
  python3 scripts/build-i18n.py
  ```
  This rewrites the `window.__MUSE_I18N__` block in `app.html` and
  `index.html`. The four locale files must keep identical key sets (the build
  script validates this).
- When you add a key, add it to **all four** locales. zh-CN is the source;
  translate to the others. A missing key degrades gracefully (falls back to
  zh-CN, then to the key string itself) but should still be filled in.

## Code style (server.py)

- Single-file Flask app by design (conservative scope). Prefer extracting a
  shared helper over copy-pasting a block — see `_upsert_creator_dna`,
  `_build_model_config_response`, `_build_profile_ctx`.
- Never use a bare `except:` — catch `Exception` (or a more specific type like
  `sqlite3.OperationalError`). Bare excepts swallow `KeyboardInterrupt`.
- Don't leak tracebacks to API clients: log server-side, return a generic 500.
- Parameterize SQL values with `?`. Column names interpolated via f-string
  must come from a hardcoded allowlist, never user input.
