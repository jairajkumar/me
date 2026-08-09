---
title: 'Load Balancing: L4 vs L7, Algorithms, and Health Checks'
date: '2026-05-10T18:20:36+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "Design"]
tags: ["system-design", "hld", "load-balancing", "nginx", "availability", "scalability"]
description: 'The difference between Layer 4 and Layer 7 load balancing, which algorithm to pick and how it fails, why health checks are what actually buy you availability, and how not to relocate your single point of failure.'
summary: 'A load balancer is usually the first box you draw after the clients, and the depth you can give on it is a fast proxy for how senior you sound. This covers L4 vs L7, the algorithms and their failure modes, health checks, and the mistake of moving your single point of failure instead of removing it.'
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'load-balancing-l4-l7'
---

A load balancer is usually the first box you draw after the clients, and how much depth you can give on it is a quick proxy for how senior you sound.

"I'll add a load balancer" is the junior version. "L7 for content routing, least-connections, health-checked every five seconds, deployed active-active so it isn't a single point of failure" is the same sentence with everything the interviewer was actually listening for. This post is about getting from the first to the second.

## Why a load balancer exists at all

The moment you scale from one server to many, an awkward question appears: the client only knows one address, so *which* server does it actually talk to?

A **load balancer** answers that. It sits between clients and a pool of backends, exposes a single stable address, and spreads incoming requests across the pool so no one server drowns.

{{< mermaid >}}
flowchart LR
    C["Clients"] --> LB["Load Balancer<br/>one address · active-active"]
    LB -->|health-checked| S1["Server 1"]
    LB -->|health-checked| S2["Server 2"]
    LB -. failed check .-> S3["Server 3 ❌"]
{{< /mermaid >}}

It delivers three [non-functional requirements]({{< ref "2026-06-27-non-functional-requirements.md" >}}) directly:

| NFR | How the LB delivers it |
|---|---|
| **Availability** | If a server dies, traffic reroutes to healthy ones — no single point of failure in the app tier |
| **Latency** | Spreading load keeps queues short, which holds down p99; it can also route to the closest or fastest server |
| **Scalability** | Add or remove servers with no client-visible change — this is the basis of horizontal scaling |

One precondition makes all of it clean: keep the app servers **stateless**. Push session state into a shared cache or database rather than onto the box. Then any request can go to any server and the balancer is free to route however it likes.

## The big axis: Layer 4 vs Layer 7

The defining question for any load balancer is which OSI layer it makes its decision at.

A **Layer 4** balancer works at the transport layer. It sees only the envelope — source and destination IP and port — and never opens the payload. It forwards connections extremely fast, typically via NAT, and it's **protocol-agnostic**: it can balance any TCP or UDP traffic, not just HTTP. Databases, SMTP, game servers, DNS, and QUIC all live here.

A **Layer 7** balancer works at the application layer. It terminates the connection, decrypts TLS, and reads the actual request — URL path, headers, cookies, gRPC method. That visibility buys **content-aware routing**: send `/api/*` to one fleet and `/static/*` to another, route logged-in users by cookie, cache responses, enforce auth and rate limits. The price is real, though: it has to decrypt and parse every request, and it holds two TCP connections instead of one.

| Dimension | **L4 (transport)** | **L7 (application)** |
|---|---|---|
| Sees | IP + port only | URL, headers, cookies, body |
| Protocols | any TCP/UDP | HTTP(S), gRPC, WebSocket |
| Routing | by connection / IP:port | content-based (path, header, cookie) |
| Speed | very fast, minimal overhead | slower — decrypt and parse per request |
| TLS | passes through | terminates |
| Connections | single client↔server | separate client↔LB and LB↔server |
| Features | minimal | content routing, caching, sticky sessions, WAF |
| Cost | cheaper | more expensive |

Reach for **L4** when you need raw throughput, are balancing non-HTTP traffic, or just want simple even distribution. Reach for **L7** when you need content-based routing, run microservices, want TLS terminated in one place, or want response caching.

In practice you often layer both — an L4 balancer absorbs the firehose at the edge and forwards to L7 balancers that do the smart routing. Kubernetes is the canonical example: L4 for pod-to-pod traffic, an L7 ingress controller for anything arriving from outside.

{{< mermaid >}}
flowchart TD
    Pkt["Incoming request"] --> Q{"Need to read<br/>URL / headers / cookies?"}
    Q -->|"No — just spread<br/>TCP/UDP"| L4["L4 LB — fast, by IP:port"]
    Q -->|"Yes — content routing,<br/>TLS term, caching"| L7["L7 LB — app-aware"]
{{< /mermaid >}}

## Algorithms: which healthy server gets the next request?

Among the servers that are up, how does the balancer choose? Algorithms split into **static** (a fixed rule) and **dynamic** (informed by live server state).

**Static**

- **Round robin** — cycle through servers in order. Dead simple and perfectly even, but blind to the fact that requests and servers differ in cost.
- **Weighted round robin** — give bigger servers proportionally more traffic. Handles mixed hardware; a single heavy request can still choke a low-weight box.
- **IP hash** — hash the client IP to a fixed server. Cheap session stickiness, but distribution gets lumpy when client IPs cluster, and naive hashing reshuffles everything the moment the server count changes. That last problem is exactly what **consistent hashing** exists to solve, and it deserves its own post.

**Dynamic**

- **Least connections** — send to whoever has the fewest active connections. Adapts to real load and shines when request durations vary wildly, like uploads or websockets. The caveat: connection count isn't the same thing as load.
- **Least response time** — send to the lowest-latency server. Optimizes the metric users actually feel, at the cost of constant measurement.
- **Resource-based** — route by live CPU and memory. The most accurate and the most operationally involved.

A reasonable default: round robin for identical stateless servers, least connections when request durations vary a lot, weighted when the hardware is mixed. Naming the *failure mode* of your choice — "least-connections, though connection count isn't load, so I'd watch p99" — is the part that reads as senior.

## Health checks: where the availability actually comes from

A balancer only improves availability if it knows which backends are alive. It runs **health checks**, typically a `GET /healthz` every few seconds, and removes a server after N consecutive failures, re-adding it after M consecutive successes. That hysteresis is what stops a marginal server from flapping in and out of rotation. Detection to reroute is usually 10–30 seconds, often before anyone notices.

{{< mermaid >}}
sequenceDiagram
    participant LB as Load Balancer
    participant S as Server 3
    loop every ~5s
        LB->>S: GET /healthz
    end
    S--xLB: timeout / 503 (×3)
    Note over LB: mark DOWN, stop routing
    S->>LB: 200 OK (×2)
    Note over LB: mark UP, resume routing
{{< /mermaid >}}

A good health endpoint checks the server's own readiness — can it reach its database and cache? — not merely whether the process is running. A server that's alive but can't serve anything should be pulled out, and a naive health check that returns 200 as long as the web framework booted will happily keep it in rotation.

## Don't just relocate the single point of failure

If every request funnels through one load balancer and that balancer dies, you haven't removed the single point of failure. You've moved it, and made it harder to see. Two standard answers:

- **Active–passive** — a standby takes over the virtual IP when the primary fails. Simple, but half your capacity sits idle.
- **Active–active** — several balancers serve at once, fronted by DNS round-robin or anycast, sharing load and surviving the loss of any one.

For global scale, put GSLB or DNS-based balancing in front of all of it to steer users toward the nearest healthy region.

## Sticky sessions, and why you usually shouldn't need them

**Sticky sessions** pin a client to one backend, via a cookie at L7 or a source-IP hash at L4. It's convenient when a server holds in-memory session state.

It's also a trap. Stickiness undermines even distribution, and it breaks badly when that specific server dies — the user doesn't just get rerouted, they lose their session. The better design is to keep servers stateless by externalizing session state to something like Redis, so any server can serve any request and stickiness becomes unnecessary. Use it only when you genuinely can't externalize the state.

## Conclusion

Layer, then algorithm, then health check, then redundancy. Say it in that order and you've covered everything the question was really asking:

> A load balancer in front of stateless app servers. L7 for content routing, or L4 when you need raw throughput. Least-connections. Health-checked every five seconds. Deployed active-active so it isn't a SPOF.

What makes load balancing worth this much attention isn't the component — it's that it's the first place where availability stops being an adjective and becomes a mechanism. Every one of those four choices is a lever you pulled deliberately, and each one has a failure mode you can describe.

That's also the trap. A load balancer looks like it solves availability, and it mostly does — right up until the health check is too shallow to notice a broken backend, or the balancer itself is the only one you deployed. The component is easy. Knowing what it doesn't protect you from is the part worth learning.

---

*Part of an ongoing system design series. Previous: [non-functional requirements]({{< ref "2026-06-27-non-functional-requirements.md" >}}). Next: caching — cache-aside, write-through, write-back*