import { afterEach, describe, expect, it } from "vitest";
import { TicketStore } from "./ticket-store";

const stores: TicketStore[] = [];

function store() {
  const instance = new TicketStore(":memory:", false);
  stores.push(instance);
  return instance;
}

afterEach(() => {
  while (stores.length) stores.pop()?.close();
});

describe("TicketStore", () => {
  it("creates and retrieves a ticket", () => {
    const tickets = store();
    const created = tickets.create({
      title: "Cannot reset my password",
      description: "The password reset link reports that it has expired.",
      category: "Access and identity",
      priority: "high",
      requesterName: "Jordan Lee",
      requesterEmail: "jordan.lee@example.com",
    });

    expect(created.reference).toBe("INC-0001");
    expect(created.status).toBe("open");
    expect(tickets.find(created.id)).toEqual(created);
  });

  it("filters tickets by status, priority, and query", () => {
    const tickets = store();
    const vpn = tickets.create({
      title: "VPN is unavailable",
      description: "The VPN connection fails before authentication completes.",
      category: "Network and connectivity",
      priority: "critical",
      requesterName: "Taylor Kim",
      requesterEmail: "taylor.kim@example.com",
    });
    tickets.create({
      title: "Install design software",
      description: "Please install the approved design package on my laptop.",
      category: "Business applications",
      priority: "low",
      requesterName: "Morgan Bell",
      requesterEmail: "morgan.bell@example.com",
    });
    tickets.updateStatus(vpn.id, "in_progress");

    expect(tickets.list({ status: "in_progress" })).toHaveLength(1);
    expect(tickets.list({ priority: "critical" })[0].id).toBe(vpn.id);
    expect(tickets.list({ query: "taylor" })[0].id).toBe(vpn.id);
  });

  it("updates summary counts when ticket status changes", () => {
    const tickets = store();
    const created = tickets.create({
      title: "Laptop display flickers",
      description: "The display flickers whenever the laptop is connected to a dock.",
      category: "Device and hardware",
      priority: "high",
      requesterName: "Sam Rivera",
      requesterEmail: "sam.rivera@example.com",
    });

    expect(tickets.summary()).toEqual({ open: 1, inProgress: 0, resolved: 0, urgent: 1 });
    tickets.updateStatus(created.id, "resolved");
    expect(tickets.summary()).toEqual({ open: 0, inProgress: 0, resolved: 1, urgent: 0 });
  });
});
