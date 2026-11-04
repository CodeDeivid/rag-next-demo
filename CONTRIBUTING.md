# Contributing

```bash
pnpm install        # also installs the git hooks
pnpm db:up && pnpm db:migrate
pnpm dev
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org), checked by commitlint on `commit-msg` and in CI:

```
<type>(<scope>)!: <imperative, lowercase description, no period>

<optional body explaining why>

BREAKING CHANGE: <what broke, when it applies>
```

- Types: `feat` `fix` `refactor` `perf` `docs` `style` `test` `build` `ci` `chore` `revert`.
- Header up to 72 characters. English.
- Commits to `main` must be signed (SSH or GPG).

## Hooks

| Hook       | Runs                                              |
| ---------- | ------------------------------------------------- |
| pre-commit | ESLint and Prettier on staged files (lint-staged) |
| commit-msg | commitlint                                        |
| pre-push   | `pnpm typecheck && pnpm test`                     |

## Database changes

Edit `src/db/schema.ts`, then `pnpm db:generate` and commit the new file in `drizzle/`.
CI fails if the schema and the migrations drift apart.
