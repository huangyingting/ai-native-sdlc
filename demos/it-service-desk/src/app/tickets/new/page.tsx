import Link from "next/link";
import { TicketForm } from "@/app/ticket-form";

export default function NewTicketPage() {
  return (
    <main>
      <div className="shell">
        <Link className="back-link" href="/">← Back to tickets</Link>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Employee support</p>
            <h1>Create a ticket</h1>
            <p className="lead">
              Tell the IT team what is affected and how urgently you need help.
            </p>
          </div>
        </div>
        <section className="panel form-card">
          <TicketForm />
        </section>
      </div>
    </main>
  );
}
