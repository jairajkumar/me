---
title: 'A Repeatable Framework for High-Level Design Interviews'
date: '2026-03-11T22:40:18+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "Design"]
tags: ["system-design", "hld", "interview-framework", "architecture", "scalability"]
description: 'A six-step framework for high-level design interviews — clarify requirements, estimate scale, define the API, sketch the design, deep dive, then break it on purpose.'
summary: 'Most system design interviews are lost in the first five minutes, not because the candidate lacks knowledge, but because they jump to boxes and arrows before understanding what they are building. Here is the six-step framework that fixes it, and why the order matters more than any individual step.'
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'hld-interview-framework'
---

Most system design interviews are lost in the first five minutes. Not because the candidate lacks knowledge — usually they know more than enough — but because they hear "Design Twitter" and immediately start drawing boxes, without ever establishing what they're building or for whom.

A repeatable framework fixes this. It turns an open-ended, intimidating prompt into a sequence of concrete steps you can drive with confidence. This is the one I use for every HLD problem. Learn the order until it's muscle memory, and the specific wording of the prompt stops mattering.

## The six steps

{{< mermaid >}}
flowchart TD
    A["1. Clarify requirements"] --> B["2. Estimate scale"]
    B --> C["3. Define the API"]
    C --> D["4. High-level design"]
    D --> E["5. Deep dive 1-2 components"]
    E --> F["6. Bottlenecks & tradeoffs"]
    F -.->|interviewer steers| E
{{< /mermaid >}}

### 1. Clarify requirements

The interview is not a trivia contest, and answering before you understand the problem is the single biggest red flag. Spend the first few minutes nailing down two kinds of requirements.

**Functional** requirements are what the system actually does. For a URL shortener: create a short link, redirect to the original, maybe track clicks. State the scope explicitly, and confirm what's *out* of scope — custom aliases? expiry? analytics? The things you rule out are as informative as the things you keep.

**Non-functional** requirements are how the system must behave, and this is where senior candidates separate themselves. Pin down:

- **Scale** — how many users, reads vs writes, the read/write ratio
- **Latency** — what's acceptable (a redirect should feel instant; analytics can lag)
- **Availability** — is downtime catastrophic or tolerable?
- **Consistency** — does everyone need to see the same data immediately, or is eventual consistency fine?
- **Durability** — can we ever lose data?

Every later decision traces back to these answers, so get them first.

### 2. Estimate scale

Translate the requirements into numbers: queries per second, storage, bandwidth. You don't need precision. You need the right order of magnitude, because the difference between 1K QPS and 1M QPS is the difference between a single server and a globally sharded system.

Quick example: 100M daily active users each making 10 reads a day is about 1B reads/day, roughly 11,600 reads/sec on average, and you'd plan for a peak of three to five times that. Numbers like these are what justify caching, sharding, and replication later — so do them early and keep referring back.

### 3. Define the API

Write the contract before the architecture. A handful of endpoints (or event schemas) — `POST /shorten`, `GET /{shortCode}` — forces clarity about inputs, outputs, and who calls what. It also gives the interviewer a concrete surface to probe, which is usually better for you than letting them pick.

### 4. High-level design

Now draw the boxes and arrows: clients, load balancer, app servers, cache, database, queues. Show the **data flow** for your main operations, tracing a write and a read all the way through. Keep it simple — you'll add depth in a moment. The goal here is a coherent skeleton, not every detail.

### 5. Deep dive into one or two components

This is where most of the signal is. The interviewer will steer you toward something specific — the database schema, the sharding strategy, how the cache stays consistent, how you generate unique IDs. Go deep. Show you understand the mechanics *and* the failure modes.

Don't try to deep-dive everything. Pick what matters and follow the interviewer's lead; they're usually steering you toward the part they want to evaluate.

### 6. Bottlenecks and tradeoffs

Close the loop by stress-testing your own design. What breaks at 10x traffic? Where's the single point of failure? What did you trade away, and why was that the right call?

Naming tradeoffs explicitly — "I chose eventual consistency here because read latency matters more than seeing the absolute latest count" — is precisely the reasoning interviewers grade. It's also the part candidates most often skip.

## Why the order matters

Each step feeds the next. Requirements set the scale, scale justifies the architecture, and the architecture exposes the bottlenecks. Skip step one and everything downstream rests on assumptions you never validated, which is exactly how strong engineers give weak interviews.

> **Worth knowing:** interviewers increasingly evaluate three things *beyond* raw scalability — **cost reasoning**, **failure recovery**, and **operational maturity**. Weave these into steps 5 and 6: what does this component cost at scale, how does the system recover when it fails, and how would you know it was failing?

## Conclusion

Clarify what you're building and for what scale. Define the contract. Sketch the skeleton. Go deep where it counts. Then break your own design on purpose.

The framework isn't clever, and that's the point. Its whole value is that it removes the improvisation from the first five minutes — the exact window where most candidates lose the room. You're not being graded on inventing a novel architecture in 45 minutes. You're being graded on whether you can take a vague problem, impose structure on it, and reason honestly about what your choices cost.

Practise the sequence on three or four problems and something useful happens: the prompt's wording stops mattering. Design Twitter, design Uber, design a rate limiter — the first four steps are identical every time, and by the time you reach the part that's actually specific to the problem, you have numbers and a contract to reason from instead of a blank whiteboard.

---

*Part of an ongoing system design series. Next: [back-of-the-envelope estimation]({{< ref "2026-06-26-back-of-envelope-estimation.md" >}}) — the numbers that justify everything in step 4.*
