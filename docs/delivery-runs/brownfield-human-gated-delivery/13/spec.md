# Specification

## Intent

Extend the existing Next.js IT service desk in `demos/it-service-desk` so support agents and team leads can see responsibility for each ticket, identify unowned work, and coordinate handoffs while preserving existing ticket workflows and data.

## Scope

- Add an ownership value to the persisted SQLite ticket record and its application-level ticket representation.
- Display each ticket's ownership in the dashboard queue and ticket detail view, including an explicit unassigned state.
- Allow a support agent or team lead to assign, reassign, and clear a ticket owner from the ticket detail workflow without changing the ticket's requester, description, category, priority, status, reference, or creation time.
- Make ownership available as a dashboard filter that composes with the existing status, priority, and text-search filters. The filter includes unassigned tickets.
- Validate ownership changes in the server action before persisting them and refresh the dashboard and changed ticket view after a successful update.

## Non-goals

- External identity-provider integrations, authentication or authorization changes, notifications, SLA policies, and escalation workflows.
- Replacing the existing SQLite-backed ticket store, Next.js application, ticket reference format, queue ordering, or status workflow.
- Requiring a requester to choose an owner at submission time. The existing create-ticket fields change only if the Human selects optional-creation assignment.

## Actors

- **Support agent:** views ticket responsibility and assigns, reassigns, or clears an owner while handling a ticket.
- **Team lead:** views ownership across the queue and uses the owner or unassigned filter to coordinate work.
- **Requester:** continues to submit and view requests through the existing workflows; ownership clarifies responsibility without changing requester data.

## Constraints

- Existing persisted tickets, including seeded or already-created records, must remain readable after the schema change and appear unassigned when no owner value exists.
- Ownership is ticket metadata; an ownership-only update must not alter unrelated ticket fields, and normal status updates must preserve ownership.
- Invalid ownership input or an unknown ticket must be rejected without persisting a partial update or changing the existing owner.
- The owner source remains a Human decision. The proposed **predefined local list** option limits assignment and filtering to server-validated local owners. The proposed **bounded free-text** option accepts a non-empty, normalized owner label and filters by the stored label. This specification does not select either option.
- Whether newly created tickets may remain unassigned is a Human decision. The proposed **default-unassigned** option preserves the current create-ticket form and requires assignment from the detail workflow. The proposed **optional-creation assignment** option adds an owner choice with an unassigned value to that form. Existing tickets must remain unassigned until someone assigns an owner under either option.

## Acceptance scenarios

### AC-1: View assigned and unassigned ticket ownership

**Given** a persisted ticket has an owner and another persisted ticket has no owner  
**When** a support agent or team lead views the dashboard or either ticket's detail page  
**Then** the assigned ticket shows its owner and the ticket without an owner shows an explicit unassigned state.

### AC-2: Assign, reassign, and clear ownership

**Given** a support agent or team lead is viewing an existing ticket  
**When** they submit a valid owner assignment, replacement owner, or clear-owner request  
**Then** the ticket persists the requested ownership state, updates its modification time, and the dashboard and detail view show that state without changing unrelated ticket data.

### AC-3: Find tickets by owner or lack of owner

**Given** tickets exist for multiple owners and at least one ticket is unassigned  
**When** a team lead applies an owner or unassigned filter together with any existing status, priority, or text-search filter  
**Then** the dashboard shows only tickets matching every selected filter and retains the existing queue ordering.

### AC-4: Reject an invalid ownership update

**Given** a ticket has an existing ownership state  
**When** an assignment request has an invalid ticket identifier or an owner value that fails the selected owner-source validation  
**Then** the application rejects the request and leaves the ticket's ownership and all other persisted fields unchanged.

### AC-5: Preserve existing tickets and workflows

**Given** tickets were persisted before ownership support and users continue to create, search, filter, and update ticket statuses  
**When** the application reads those tickets or performs an existing workflow  
**Then** the tickets remain readable as unassigned where no owner exists, and the existing reference, requester, category, priority, status, summary, search, filtering, and status-update behavior is preserved.
