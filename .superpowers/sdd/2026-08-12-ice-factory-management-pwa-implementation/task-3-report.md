# Task 3 report: Phone/PIN authentication and responsive app shell

Status: DONE_WITH_CONCERNS

## Changed files

- Added the phone/PIN schema, server login action, verified session/profile guards, and unit tests in `src/modules/auth/`.
- Added the current Supabase SSR session refresh and unauthenticated-route redirect proxy in `src/proxy.ts`.
- Added Vietnamese login UI, mobile navigation, desktop sidebar, user menu, protected application shell, and manager user-administration UI.
- Added manager-only create, PIN reset, and activation actions in `src/modules/admin/users/actions.ts`, with a compensating Auth-user deletion when profile creation fails.
- Added local-only deterministic E2E user/profile seed rows; the seed stores a bcrypt hash rather than plaintext (the Playwright fixture necessarily enters its fixed test PIN).
- Added Playwright authorization coverage and excluded Playwright specs from Vitest discovery.

## TDD evidence

1. RED: `pnpm vitest run src/modules/auth/auth.test.ts` failed because `./schema` did not exist.
2. GREEN: the same command passed with 2 tests after `loginSchema` was implemented.
3. RED: `pnpm vitest run src/modules/auth/auth.test.ts src/modules/admin/users/actions.test.ts` failed because the guard/action modules did not exist.
4. GREEN: focused test command passed with 4 tests after guards and rollback behavior were implemented.

## Auth and session decisions

- Phone input is normalized to Vietnamese E.164 (`0912 345 678` becomes `+84912345678`); PINs require at least six digits.
- Login uses `signInWithPassword({ phone, password: pin })`. After sign-in it reads the profile and signs the user out if the profile is missing or inactive.
- `proxy.ts` uses `getClaims()` to refresh/validate the session and routes unauthenticated traffic to `/login`. It clears query strings on redirects, so no open redirect target is accepted.
- `requireUser()` and `requireManager()` independently validate claims and then load the active `profiles` row. Authorization decisions do not trust a cookie session or user metadata.
- The administrative page redirects an employee to `/`; each mutation again calls `requireManager()` before using the server-only admin client.
- PINs are neither logged nor stored in `profiles`.

## Verification

| Command | Result |
| --- | --- |
| `pnpm vitest run src/modules/auth/auth.test.ts` | pass: 2 tests |
| `pnpm vitest run src/modules/auth/auth.test.ts src/modules/admin/users/actions.test.ts` | pass: 4 tests |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 8 tests, 1 pre-existing skipped test |
| `pnpm exec playwright test --list` | pass: discovered 1 authorization test |
| `pnpm build` (placeholder, non-secret environment values) | pass |
| `git diff --check` | pass |

## E2E status and concern

The live Playwright command was attempted:

`pnpm test:e2e --grep "employee cannot"`

It could not start because the local Playwright Chromium executable is not installed. `pnpm exec supabase status` also confirms the project local stack is absent (`supabase_db_ice-factory-mvp` does not exist). No remote Auth users were created or changed. The checked-in seed is prepared for a local reset once that stack and browser are available.

## Self-review

- Confirmed manager checks occur before each privileged action and that rollback handles a failed profile insert.
- Confirmed proxy redirects do not preserve attacker-supplied destinations.
- Confirmed no service-role key or PIN logging was added, and that profiles do not store PINs.
- Confirmed login fields have labels, numeric/tel input modes, error announcements, keyboard focus styles, and mobile/desktop navigation.
