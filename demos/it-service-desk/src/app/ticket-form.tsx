"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTicketAction, type TicketFormState } from "./actions";
import { ticketCategories, ticketPriorities } from "@/lib/tickets";

const initialState: TicketFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="field-error">{errors[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Submitting..." : "Submit ticket"}
    </button>
  );
}

export function TicketForm() {
  const [state, formAction] = useActionState(createTicketAction, initialState);

  return (
    <form action={formAction}>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="title">Short summary</label>
          <input id="title" name="title" maxLength={120} required />
          <FieldError errors={state.errors?.title} />
        </div>
        <div className="field">
          <label htmlFor="requesterName">Requester name</label>
          <input id="requesterName" name="requesterName" maxLength={100} required />
          <FieldError errors={state.errors?.requesterName} />
        </div>
        <div className="field">
          <label htmlFor="requesterEmail">Requester email</label>
          <input id="requesterEmail" name="requesterEmail" type="email" maxLength={200} required />
          <FieldError errors={state.errors?.requesterEmail} />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={ticketCategories[0]} required>
            {ticketCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <FieldError errors={state.errors?.category} />
        </div>
        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select id="priority" name="priority" defaultValue="medium" required>
            {ticketPriorities.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          <FieldError errors={state.errors?.priority} />
        </div>
        <div className="field field-full">
          <label htmlFor="description">Describe the issue or request</label>
          <textarea id="description" name="description" maxLength={4000} required />
          <FieldError errors={state.errors?.description} />
        </div>
      </div>
      {state.message ? <p className="form-error" role="alert">{state.message}</p> : null}
      <div className="form-actions">
        <Link className="button" href="/">Cancel</Link>
        <SubmitButton />
      </div>
    </form>
  );
}
