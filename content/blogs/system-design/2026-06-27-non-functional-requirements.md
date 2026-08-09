---
title: "Non-Functional Requirements: How to Say 'Fast and Reliable' Like a Senior"
date: '2026-05-01T23:05:11+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "Design"]
tags: ["system-design", "hld", "non-functional-requirements", "availability", "consistency", "latency", "durability"]
description: 'Availability, consistency, latency, durability — how to define non-functional requirements sharply enough that they actually drive your architecture instead of decorating it.'
summary: 'Every system wants to be fast, scalable, and reliable, which is exactly why saying so is worthless. This post is about the sharper version: p99 under 200 ms, 99.99% availability, eventual consistency on the timeline — and the architectural lever each of those numbers forces you to pull.'
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'non-functional-requirements'
---

Most system design answers fail on the sentence before the boxes and arrows. A candidate says "the system should be fast, scalable, and reliable," nods, and starts drawing.

That sentence is worthless. *Every* system wants those things. The senior version of the same intent is "p99 feed render under 200 ms, 99.99% availability, eventual consistency on the timeline, and no acknowledged tweet ever lost." Identical goals, completely different signal — because the second version is made of numbers, and numbers force decisions.

This post is about closing that gap.

## Functional vs non-functional

After clarifying a prompt you should have two lists. **Functional requirements** are the "users should be able to…" list — post a tweet, follow someone, see a feed. **Non-functional requirements** are the "the system should be able to…" list — stay available, render feeds under 200 ms, handle 100M DAU.

Functional says **what**. Non-functional says **how well**.

{{< mermaid >}}
flowchart TD
    P["Vague prompt"] --> F["Functional reqs<br/>what it does"]
    P --> N["Non-functional reqs<br/>how well it does it"]
    N --> A["Availability"]
    N --> C["Consistency"]
    N --> L["Latency"]
    N --> D["Durability"]
    A & C & L & D --> X{"Architecture levers"}
    X --> R["redundancy · replication<br/>caching/CDN · quorums · WAL"]
{{< /mermaid >}}

NFRs matter because they encode the constraints reality imposes, they reveal whether you've actually operated systems at scale, and — most importantly — they drive every trade-off you'll make. You cannot maximize all of them at once. Which one you sacrifice, and why, *is* the interview.

## The four you'll almost always name

| NFR | Sharp definition | Quantify as | Lever |
|---|---|---|---|
| **Availability** | % of time serving requests successfully | nines (99.99% ≈ 52 min/yr) | redundancy, multi-AZ, health checks, failover |
| **Consistency** | Do replicas agree on the latest write? | strong vs eventual, **per operation** | sync/async replication, quorums, consensus |
| **Latency** | Request to response time | **p99** at a stated QPS | caching, CDN, indexes, geo-proximity |
| **Durability** | Acked data survives crashes | "no data loss"; object stores ~11 nines | replication ≥3, WAL, fsync, backups |

Pick the three to five that matter for *this* system and state them proactively. Reliability, scalability, security, and observability join the list when they're genuinely relevant — but reciting all ten dilutes the signal rather than adding to it.

### Availability: make the nines concrete

| Availability | Downtime/year | Downtime/day |
|---|---|---|
| 99% | ~3.65 days | ~14 min |
| 99.9% | ~8.77 hrs | ~1.4 min |
| 99.99% | ~52.6 min | ~8.6 s |
| 99.999% | ~5.26 min | ~0.86 s |

You buy nines with **redundancy** (no single point of failure — Netflix spans three availability zones), **health checks and failover** (reroute off a dead node in seconds), **geographic distribution** (shrink the blast radius), and **graceful degradation** (shed recommendations, keep checkout working).

And watch the arithmetic: availabilities in **series multiply**. A request that passes through five 99.9% components is not a 99.9% request. A long dependency chain quietly lowers your number, which is an argument for decoupling or adding redundancy — not for buying better components.

### Latency: percentiles, not averages

Measure **p99**, not the mean. The average hides the one request in a hundred that makes a user close the tab. Worse, as throughput approaches capacity, **tail latency explodes long before the average moves** — which is exactly why you size for peak and why an average-based SLO will look healthy right up until you're paged.

The levers: caching (RAM is roughly 1000× faster than SSD), CDNs (which take a distant user from ~200 ms to ~20 ms), indexes, and parallel fan-out.

### Consistency: a per-operation choice

Consistency isn't a global switch, and treating it like one is the most common mistake here.

**Strong** consistency always returns the latest write, and it costs you latency and availability. Use it for balances, inventory, payments. **Eventual** consistency lets replicas converge over milliseconds to seconds; it's cheap and highly available. Use it for likes, feeds, recommendations.

Real systems mix them freely. Amazon's shopping cart is eventually consistent; its payment path is not. This is the practical face of **CAP** — under a network partition you choose consistency or availability, because partition tolerance isn't something you get to opt out of.

### Durability: not the same as availability

Availability is "can I reach it." Durability is "once it told me yes, is the data still there." They come apart in both directions: an in-memory cache is available but not durable, and a database mid-failover is durable but briefly unavailable.

You buy durability with replication (three copies or more), a write-ahead log, `fsync` before acknowledging, and cross-region backups. The trade-off worth naming out loud: fsync-before-ack is safe but slow, ack-then-flush is fast but risks losing writes that you already told the client succeeded.

## A checklist to elicit them fast

{{< mermaid >}}
flowchart LR
    V["Vague prompt"] --> CK{"7-point checklist"}
    CK --> T["Top 3-5 NFRs"]
    T --> Q["Quantify each"]
    Q --> DD["Harden for them<br/>in the deep-dive"]
{{< /mermaid >}}

Run through seven questions: CAP (consistency or availability first?), scale (read-heavy, write-heavy, bursty?), latency (which path, what target?), durability (how bad is loss?), environment (mobile, constrained bandwidth?), security and compliance, and fault tolerance. Keep the three to five that actually shape the design and drop the rest.

## The one sentence to practise

> *"This system should be **\<adjective\>**, quantified as **\<number\>**, which is why we need **\<lever\>**."*

For example: "highly available — 99.99%, prioritizing availability over consistency — which is why the feed uses async replication and a read cache."

Adjective, number, lever. Say it once for each NFR and you've out-structured most candidates before drawing a single box.

## Conclusion

Non-functional requirements are the part of the interview where you decide what the system is allowed to be bad at. That framing matters, because a candidate who names five NFRs and promises to maximize all of them hasn't specified anything — they've just listed adjectives.

The useful move is the opposite. Say what you're optimizing, say what you're giving up in exchange, and attach a number to both. "Eventual consistency on the timeline, because a follower seeing a tweet 200 ms late costs nothing and strong consistency here would cost us a cross-region round trip on every read" is a complete argument. It tells the interviewer you know the mechanism, the cost, and the alternative.

Do this before you draw anything and something convenient happens: the architecture stops being a matter of taste. Every box you add afterwards has a number behind it that explains why it's there.

---

*Part of an ongoing system design series. Previous: [back-of-the-envelope estimation]({{< ref "2026-06-26-back-of-envelope-estimation.md" >}}) — the numbers these NFRs are built from. Next: [load balancing]({{< ref "2026-06-28-load-balancing.md" >}}), the first concrete availability lever.*
