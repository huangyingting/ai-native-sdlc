import Link from "next/link";
import { getTicketStore } from "@/lib/ticket-store";
import {
  formatTicketStatus,
  ticketPriorities,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStatus = firstQueryValue(params.status);
  const requestedPriority = firstQueryValue(params.priority);
  const status = ticketStatuses.includes(requestedStatus as TicketStatus)
    ? requestedStatus as TicketStatus
    : undefined;
  const priority = ticketPriorities.includes(requestedPriority as TicketPriority)
    ? requestedPriority as TicketPriority
    : undefined;
  const query = firstQueryValue(params.q)?.trim() || undefined;
  const store = getTicketStore();
  const tickets = store.list({ status, priority, query });
  const summary = store.summary();

  return (
    <main>
      <div className="shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Service operations</p>
            <h1>IT support tickets</h1>
            <p className="lead">
              Track employee incidents and service requests from intake through resolution.
            </p>
          </div>
          <Link className="button button-primary" href="/tickets/new">Create ticket</Link>
        </div>

        <section className="metrics" aria-label="Ticket overview">
          <article className="metric"><span>Open</span><strong>{summary.open}</strong></article>
          <article className="metric"><span>In progress</span><strong>{summary.inProgress}</strong></article>
          <article className="metric"><span>Resolved</span><strong>{summary.resolved}</strong></article>
          <article className="metric"><span>High priority active</span><strong>{summary.urgent}</strong></article>
        </section>

        <form className="panel filters">
          <div className="field field-grow">
            <label htmlFor="q">Search</label>
            <input id="q" name="q" placeholder="Ticket title or requester" defaultValue={query} />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {ticketStatuses.map((item) => (
                <option key={item} value={item}>{formatTicketStatus(item)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue={priority ?? ""}>
              <option value="">All priorities</option>
              {ticketPriorities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <button className="button" type="submit">Apply</button>
        </form>

        <section className="panel ticket-list" aria-label="Tickets">
          <div className="ticket-list-header">
            <span>Ticket</span><span>Status</span><span>Priority</span><span>Updated</span>
          </div>
          {tickets.length ? tickets.map((ticket) => (
            <Link className="ticket-row" href={`/tickets/${ticket.id}`} key={ticket.id}>
              <span className="ticket-title">
                <strong>{ticket.title}</strong>
                <small>{ticket.reference} · {ticket.requesterName} · {ticket.category}</small>
              </span>
              <span className={`badge badge-status-${ticket.status}`}>{formatTicketStatus(ticket.status)}</span>
              <span className={`badge badge-priority-${ticket.priority}`}>{ticket.priority}</span>
              <span className="muted">{formatDate(ticket.updatedAt)}</span>
            </Link>
          )) : (
            <div className="empty-state">
              <h2>No tickets found</h2>
              <p>Try changing the filters or create a new ticket.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
