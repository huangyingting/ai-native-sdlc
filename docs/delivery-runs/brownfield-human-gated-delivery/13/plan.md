# Implementation plan

## Acceptance mapping

| Acceptance scenario | Tasks |
| --- | --- |
| AC-1: View assigned and unassigned ticket ownership | TASK-2, TASK-4, TASK-5 |
| AC-2: Assign, reassign, and clear ownership | TASK-1, TASK-2, TASK-3, TASK-5 |
| AC-3: Find tickets by owner or lack of owner | TASK-1, TASK-2, TASK-4, TASK-5 |
| AC-4: Reject an invalid ownership update | TASK-1, TASK-3, TASK-5 |
| AC-5: Preserve existing tickets and workflows | TASK-1, TASK-2, TASK-3, TASK-4, TASK-5 |

## Tasks

### TASK-1: Record the Human ownership policy decisions

Depends on: none  
Acceptance: AC-2, AC-3, AC-4, AC-5  
Surfaces: approved delivery artifacts and the implementation/test contract  
Validation: Obtain a Human decision on the owner source (predefined local list or bounded normalized free text) and whether creation offers optional assignment; confirm that the choice preserves existing tickets as unassigned and does not alter requester data.

Capture the selected policy before implementation. For a local list, define the list in the ticket domain and use it for assignment and filtering. For free text, define the maximum length and normalization consistently in the schema, persistence, UI, and filters. Preserve default-unassigned creation unless the Human selects optional-creation assignment.

### TASK-2: Extend ticket persistence and domain ownership data

Depends on: TASK-1  
Acceptance: AC-1, AC-2, AC-3, AC-5  
Surfaces: `demos/it-service-desk/src/lib/ticket.ts`, `demos/it-service-desk/src/lib/ticket-store.ts`  
Validation: Add persistence tests proving pre-existing SQLite records remain readable with an unassigned owner, assigned and cleared owner values round-trip, owner filtering composes with status, priority, and query filters, ordering remains unchanged, and status-only updates retain the owner.

Add a nullable ownership column using a backward-compatible SQLite migration for databases whose `tickets` table already exists, then map it into the application `Ticket` type. Extend the store list filter with an explicit unassigned option and an owner option selected under TASK-1. Add a narrow ownership update that changes only the owner and `updated_at`; retain the existing create and status-update behavior, including the selected creation policy.

### TASK-3: Validate and perform ownership updates from ticket detail

Depends on: TASK-1, TASK-2  
Acceptance: AC-2, AC-4, AC-5  
Surfaces: `demos/it-service-desk/src/lib/ticket.ts`, `demos/it-service-desk/src/app/actions.ts`, `demos/it-service-desk/src/app/tickets/[id]/page.tsx`  
Validation: Add action and/or rendered-detail coverage for valid assignment, reassignment, and clearing; invalid identifiers and invalid owners must fail without changing the stored owner or unrelated fields; successful updates must refresh both `/` and the ticket path.

Define a server-side ownership-update schema that validates the ticket identifier and the policy selected in TASK-1. Add a dedicated detail workflow that displays the current owner or an explicit unassigned state, submits assignment, reassignment, or clear-owner requests, and on success revalidates the dashboard and detail paths before returning to the ticket. Keep requester, description, category, priority, status, reference, and creation time out of the ownership update.

### TASK-4: Show and filter ownership in the dashboard queue

Depends on: TASK-1, TASK-2  
Acceptance: AC-1, AC-3, AC-5  
Surfaces: `demos/it-service-desk/src/app/page.tsx`, `demos/it-service-desk/src/app/globals.css`, `demos/it-service-desk/src/app/custom-select.tsx`  
Validation: Add dashboard coverage for owner and unassigned labels plus an owner/unassigned filter combined independently with status, priority, and text search; manually verify the selected filter remains represented in the rendered control and the existing narrow-layout queue remains usable.

Parse and validate an ownership query parameter alongside the existing filters, pass it to `TicketStore.list`, and provide an owner filter with an explicit unassigned selection. Render each queue row’s owner and retain the existing status, priority, search behavior, queue ordering, links, and empty state. Use the owner choices selected in TASK-1 without exposing owners that the server would reject.

### TASK-5: Verify compatibility and ownership workflows end to end

Depends on: TASK-2, TASK-3, TASK-4  
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5  
Surfaces: `demos/it-service-desk/src/lib/ticket-store.test.ts`, `demos/it-service-desk/src/app/page.test.tsx`, new focused action or detail tests where needed  
Validation: Run `npm test`, `npm run lint`, and `npm run build` in `demos/it-service-desk`; manually exercise creating a ticket, assigning/reassigning/clearing it, filtering assigned and unassigned tickets with the other filters, and updating its status after ownership changes.

Consolidate focused regression coverage for the accepted owner policy, existing-data migration, invalid updates, and unchanged legacy workflows. Verify an ownership-only update advances the modification time while preserving every unrelated persisted field, and verify failed requests leave the full record unchanged.

## Risks and migrations

- SQLite `CREATE TABLE IF NOT EXISTS` does not add a new column to existing databases. Detect the existing schema and add the nullable owner column safely and idempotently; do not reseed, recreate, or discard existing ticket data.
- A `NULL` owner is the persisted unassigned state. Translate it to an explicit UI label and query value without conflating it with an empty or malformed owner submission.
- The Human must select the owner-source policy before tests or implementation define accepted owners. A predefined list restricts coordination choices but is deterministic; bounded normalized free text is flexible but needs a clear length, trimming, and case-handling policy to keep filtering predictable.
- Optional creation assignment changes the create-ticket form and its validation surface. Default-unassigned has lower compatibility risk and remains the plan’s baseline unless the Human selects the optional alternative.
- Keep owner updates separate from status updates so concurrent or normal status workflows preserve ownership and malformed owner requests cannot partially update a ticket.

## Validation

After the Human resolves TASK-1, first add focused persistence, action/detail, and dashboard tests that cover AC-1 through AC-5. During implementation, run the smallest affected test files. Before delivery, run from `demos/it-service-desk`:

```sh
npm test
npm run lint
npm run build
```

Then manually verify a migrated existing database, an unassigned ticket, assigned/reassigned/cleared ownership, composed dashboard filters, rejected invalid updates, a normal ticket creation, and a normal status update after ownership is set. The plan-stage PR itself runs document and scope validation only; it does not start TDD, application builds, or container tests.
