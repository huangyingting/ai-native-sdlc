# Specification

## Intent

Extend the existing Next.js IT service desk so support agents and team leads can
see and maintain responsibility for each ticket, including tickets that do not
yet have an owner. Requesters benefit indirectly from clearer handoffs without
changes to their existing ticket-submission workflow.

## Scope

- Add an optional owner value to the ticket domain model and the SQLite-backed
  `tickets` persistence used by `demos/it-service-desk`.
- Show a ticket's owner, or an explicit unassigned state, in the ticket detail
  view and in the queue where agents coordinate work.
- Let a support agent or team lead assign, reassign, or clear a ticket owner
  from the existing ticket-management experience.
- Preserve the existing create, search, status-update, summary, and ticket
  reference behaviors while adding ownership.

## Non-goals

- Authentication, authorization, external identity-provider integration, or
  synchronization with a staff directory.
- Notifications, SLA policy, automatic routing, escalation, or workload
  balancing.
- Replacing the existing service desk, its server-side validation, or its
  SQLite storage.
- Deciding the source of valid owner names or whether owner filtering is part
  of this increment; these remain open questions for Human review.

## Actors

- **Support agent:** assigns, reassigns, or clears ownership while processing a
  ticket and uses displayed ownership to coordinate a handoff.
- **Team lead:** has the same ownership visibility and management needs when
  coordinating the queue.
- **Requester:** continues to submit and view the same ticket information; the
  ownership feature must not require requester identity changes.

## Constraints

- Implement ownership within the current TypeScript/Next.js application using
  the existing server-action, Zod-validation, and `node:sqlite` persistence
  patterns; do not introduce an external identity service.
- Existing database rows must remain readable after the schema change. Tickets
  created before ownership is introduced have no owner and are shown as
  unassigned rather than failing to load.
- The owner field is optional so tickets may remain unassigned. Clearing an
  existing assignment restores that same unassigned state.
- Invalid ticket identifiers, missing tickets, and invalid ownership updates
  must retain the application's existing failure behavior and must not modify
  ticket data.
- An ownership update must not alter the ticket's requester, title,
  description, category, priority, reference, or status; it must refresh the
  ticket's last-updated timestamp consistently with other ticket updates.
- Human review must resolve these questions before implementation:
  - **Owner source:** use a predefined local list, or accept freely entered
    owner names. The selected option determines the validation rule and
    control used to set an owner.
  - **Queue filtering:** show ownership only, or add an owner filter alongside
    the existing status, priority, and text search filters. If selected, an
    owner filter must compose with those existing filters.

## Acceptance scenarios

### AC-1: Existing tickets remain usable when ownership is introduced

**Given** a persisted ticket created before the ownership feature has no owner value  
**When** an agent opens the queue or that ticket's detail page  
**Then** the ticket loads with all existing data intact and ownership is presented as unassigned.

### AC-2: Ownership is visible for coordination

**Given** a ticket is unassigned or assigned to an owner  
**When** a support agent or team lead views the queue or ticket detail page  
**Then** the current owner is shown when one exists, and the unassigned state is shown otherwise.

### AC-3: An agent can assign and hand off a ticket

**Given** a support agent or team lead is viewing an existing ticket  
**When** they submit a valid owner selected by the Human-approved owner-source
option  
**Then** the ticket stores and displays that owner, retains all unrelated ticket
fields, and records the update time.

### AC-4: An agent can clear an assignment

**Given** an existing ticket is assigned to an owner  
**When** a support agent or team lead clears the owner through the ownership
control  
**Then** the ticket is stored and displayed as unassigned without changing its
other data.

### AC-5: Invalid ownership updates do not corrupt tickets

**Given** an ownership update targets a missing or invalid ticket, or contains
an owner value that fails the Human-approved validation rule  
**When** the update is submitted  
**Then** the update is rejected using the application's existing error behavior
and no ticket fields are changed.

### AC-6: Existing workflows remain compatible

**Given** tickets with and without owners exist  
**When** users create tickets, search the queue, filter by status or priority,
or update ticket status  
**Then** those existing workflows continue to work without requiring an owner
or changing their prior results, except for an explicitly Human-approved owner
filter.
