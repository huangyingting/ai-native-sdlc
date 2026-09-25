# Northstar IT Service Desk

A small, realistic enterprise IT application for demonstrating an
Issue-to-PR workflow with GitHub Copilot.

## Included workflow

- View and filter IT incidents and service requests.
- Create a ticket with server-side validation.
- View ticket details.
- Move a ticket through open, in-progress, resolved, and closed states.
- Persist data in a local SQLite database.

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
npm run build
```

## Suggested first Copilot demo Issue

Add an assignee to each ticket:

- unassigned tickets remain valid;
- the dashboard can filter by assignee;
- assignment changes are visible on the ticket detail page;
- assignment is validated and persisted;
- tests cover assigned and unassigned tickets.

This is large enough to demonstrate repository exploration, planning,
implementation, tests, and pull-request review, while remaining small enough
for a short live session.
