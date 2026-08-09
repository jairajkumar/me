---
title: 'Back-of-the-Envelope Estimation for System Design'
date: '2026-03-29T19:15:42+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "Design"]
tags: ["system-design", "hld", "estimation", "capacity-planning", "scalability", "latency"]
description: 'The four formulas, the numbers worth memorizing, and the one habit that makes an estimate sound senior — never leave a number without saying what it forces you to build.'
summary: 'Most system design answers go wrong one step before the boxes and arrows: the candidate never works out how big the system is. Here are the four formulas, the latency numbers worth memorizing, and a worked Twitter example that turns four calculations into five architecture decisions.'
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'back-of-envelope-estimation'
---

Most system design answers go wrong one step before the boxes and arrows. The candidate never works out *how big* the system is, so every architectural choice that follows is either a guess or over-engineering.

Back-of-the-envelope estimation is the five-minute habit that fixes it. It's what turns "Design Twitter" from an open-ended panic into a sequence of decisions you can actually defend.

## Why bother

Estimation is the bridge between [clarifying requirements]({{< ref "2026-06-25-hld-interview-framework.md" >}}) and drawing an architecture. Requirements tell you *what* you're building; estimation tells you *how big*; and size is the only honest justification for caching, replication, sharding, or a CDN.

Skip it and every later choice is either over-engineering or a lucky guess. "Over-engineering while ignoring tradeoffs" is one of the most commonly cited red flags in interview feedback, and this is where it starts.

The bar is **order of magnitude**, not precision. Landing within a factor of 2–10 of reality, quickly, while stating your assumptions out loud, is exactly right. What's being graded is your reasoning, not your last digit.

{{< mermaid >}}
flowchart LR
    R["Requirements<br/>DAU · actions · sizes"] --> Q["QPS<br/> avg & peak"]
    R --> S["Storage<br/>bytes × retention × repl"]
    R --> B["Bandwidth<br/>QPS × payload"]
    Q --> D{"Architecture decision"}
    S --> D
    B --> D
    D --> C["cache · replicas · shards · CDN"]
{{< /mermaid >}}

## The four formulas

Memorize the *shape*, not specific numbers.

| Estimate | Formula | Justifies |
|---|---|---|
| **QPS** | `DAU × actions/user/day ÷ 86,400`, then peak ≈ 3× avg | replicas, app servers, sharding |
| **Storage** | `writes/day × bytes/record × retention_days × replication` | DB choice, partitioning, object store |
| **Bandwidth** | `QPS × avg payload` (ingress + egress) | CDN, link capacity, compression |
| **Cache memory** | `daily egress × hot-fraction` (80/20) | Redis sizing, what's cacheable |

The shortcut that does most of the work: there are 86,400 seconds in a day, near enough to 10⁵. So:

> **1 million requests/day ≈ 12 QPS.**

Scale it linearly from there. 1 billion a day is about 12,000 QPS.

## Numbers worth memorizing

**Data scale, in powers of two:** 2¹⁰ ≈ 1 KB, 2²⁰ ≈ 1 MB, 2³⁰ ≈ 1 GB, 2⁴⁰ ≈ 1 TB, 2⁵⁰ ≈ 1 PB. Typical object sizes: a text row is a few hundred bytes to 2 KB, a tweet about 300 B, a photo 1–2 MB, an hour of HD video roughly 1 GB.

**Latency numbers** (rounded, and the rounding is the point):

| Operation | Time |
|---|---|
| Main memory (RAM) reference | 100 ns |
| Read 4 KB random from SSD | 150 µs |
| Round trip in the same datacenter | 500 µs |
| Disk (HDD) seek | 10 ms |
| Round trip cross-Atlantic (CA↔NL) | 150 ms |

Don't memorize these as trivia — memorize the **ratios**. RAM is roughly 1000× faster than SSD, which is roughly 100× faster than a spinning disk. A round trip inside a datacenter is about 300× faster than one across an ocean. Three consequences fall straight out: memory is fast and disk is slow, writes cost more than reads, and cross-region round trips are the thing to design away.

**Availability translated into downtime:** 99% is about 3.65 days a year, 99.99% is about 52 minutes, 99.999% is about 5 minutes.

**Throughput rules of thumb** (state these as assumptions, not facts): a tuned SQL node handles roughly 10K writes/sec and 50K reads/sec, Redis around 100K ops/sec, and "real-time" generally means under 250 ms end to end.

## Size for the peak, not the average

Systems don't fall over at the average. Two accepted ways to get to a peak number:

- **Multiplier:** peak ≈ 2–5× average, with 3× as a safe default.
- **10%-in-an-hour:** peak QPS = (0.10 × daily volume) ÷ 3600.

Design the baseline for average, but provision and stress-test for peak. Because statically running peak-sized capacity is expensive, real systems lean on autoscaling plus **graceful degradation** — shedding heavy features and serving stale or cached content when the spike arrives. Saying that out loud is worth a lot; it shows you've thought about what the system does when your estimate turns out to be wrong.

## Worked example: "Design Twitter"

**Assumptions, said aloud:** 300M DAU, about 1 tweet per user per day, a read-to-write ratio of roughly 100:1, ~1 KB stored per tweet, 20% of tweets carrying a 200 KB image, 5-year retention, 3× replication.

**Traffic**

```text
Writes/day   = 300M               → ~3,500 write QPS avg → ~10,500 peak (×3)
Reads (100×) → ~350K read QPS avg → ~1M peak
```

Reads dominate by 100×. *Which means:* read replicas, an aggressive cache, and a CDN — a single primary cannot serve a million peak reads a second.

**Storage**

```text
Text  300M × 1 KB          = 300 GB/day
Media 300M × 20% × 200 KB  = 12 TB/day
× replication 3 × 365 × 5y ≈ 67 PB
```

*Which means:* media goes to object storage fronted by a CDN, the database keeps only metadata and pointers, and it's sharded.

**Bandwidth**

```text
Text egress ≈ 350K × 1 KB ≈ 350 MB/s   (a 10 Gbps uplink is ~1.25 GB/s)
Media egress would dwarf this → served from the CDN, offloading the origin
```

Four small calculations produced five concrete mandates — replicas, sharding, an object store, a CDN, a cache — and every one of them is tied to a number you can point at.

## The one habit that signals seniority

**Never leave a number naked.** Always finish with the consequence:

> "About a million peak reads per second — *which means* we can't serve from a single primary. We need read replicas plus a cache, and a CDN for media."

Number, then consequence. Every time. That single discipline is the difference between an estimate that lands and arithmetic that just fills time.

## Conclusion

Decompose the requirement into a formula, plug in rounded numbers, compute QPS, storage, bandwidth, and cache size to the right order of magnitude, size for peak rather than average, and attach every number to the architecture decision it forces.

The reason this works isn't the arithmetic — it's that estimation converts opinion into constraint. "We should probably cache this" is an opinion, and an interviewer can push back on it forever. "A million peak reads per second against a database that does fifty thousand" is a constraint, and there's nothing to argue about; the design follows.

That's also why it takes five minutes and not thirty. You're not building a capacity model. You're building the smallest set of numbers that makes the rest of your answer inevitable.

---

*Part of an ongoing system design series. Previous: [a repeatable framework for HLD interviews]({{< ref "2026-06-25-hld-interview-framework.md" >}}). Next: [non-functional requirements]({{< ref "2026-06-27-non-functional-requirements.md" >}}) — turning "fast and reliable" into numbers.*
