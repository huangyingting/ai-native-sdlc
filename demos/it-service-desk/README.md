# Northstar IT Service Desk

A small, realistic enterprise IT application for demonstrating an
Issue-to-PR workflow with GitHub Copilot.

## Included workflow

- View and filter IT incidents and service requests.
- Create a ticket with server-side validation.
- View ticket details.
- Move a ticket through open, in-progress, resolved, and closed states.
- Persist data in a local SQLite database.

Search matches titles, requester names, and ticket references such as `INC-0001`
(case-insensitive). Numeric IDs and shortened references such as `1`, `0001`,
and `inc-1` also work; surrounding whitespace is ignored. Status and priority
filters still apply to search results.

The custom dropdowns keep keyboard focus on a labeled combobox. Open with
Enter, Space, or an arrow key; navigate with arrow keys, Home/End, or
typeahead. Enter/Space commits, Escape cancels uncommitted navigation, and
Tab/Shift+Tab commits and moves focus normally. Clicking outside or moving
focus away also commits and closes the popup. Menus remain visible above
short or empty ticket queues.

The application intentionally stops at a practical first release. Assignment,
SLA policies, comments, audit history, access control, notifications, and
reporting are suitable follow-up GitHub Issues for live Copilot demos.

## Run locally

Node.js 24 or newer is required because the demo uses the built-in
`node:sqlite` module.

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

The database is created and seeded automatically at `data/service-desk.db`.
Delete that file to reset the demo data.

## Validate

```powershell
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Unit tests use in-memory databases and a jsdom environment for dropdown and
dashboard regressions; they do not modify `data/service-desk.db`. The
container smoke check targets the stable dashboard HTML marker
`data-testid="service-desk-dashboard"`, not the visible heading text.

Pull-request CI runs for all changed paths, including documentation, so the
required `validate` and `container-smoke` checks cannot remain missing. This
small demo favors reliable required checks over PR path-filter optimization;
push CI remains path-scoped. Controlled-Red Tests PRs retain their separate
TDD validation instead of running the normal Green checks on lifecycle branches.
PRs targeting the default branch always run the Green checks, regardless of
stage text in the PR body.
After installing demo dependencies, CI also exercises the lifecycle reporter
against real Vitest setup/teardown failures and legitimate Red/Green tests.

## Suggested Brownfield Delivery Intent

Use the repository Intent form with this outcome: add optional assignees to
service-desk tickets so support agents can understand and update ownership.
Useful success signals include:

- unassigned tickets remain valid;
- the dashboard can filter by assignee;
- assignment changes are visible on the ticket detail page;
- assignment is validated and persisted;
- tests cover assigned and unassigned tickets.

This is large enough to demonstrate repository exploration, planning,
implementation, tests, and pull-request review, while remaining small enough
for a short live session.

See the
[Brownfield Human-Gated Delivery demo](../../docs/brownfield-human-gated-delivery.md)
for the complete Intent, Spec, Plan, TDD, implementation, and delivery loop.
