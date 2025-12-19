---
title: 'The Cryptographic Seal: A Deep Dive into JWT Signatures'
date: '2025-08-18T21:44:26+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "security"]
tags: []
description: ''
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'JWT-signature'
mathjax: true
---
If we look at our previous discussion in [**JWT Dissection**]({{< ref "JWT_dissection.md" >}}), we established that a JWT is effectively a digital ID card. But in a distributed system, an ID card is worthless if anyone can forge it.

In the physical world, we rely on a **Gazetted Officer's Attestation**. When we get a document stamped, that official seal guarantees two things:

1. **Authenticity:** The document originated from a legitimate authority.
2. **Integrity:** The content hasn't been altered (no one tipp-exed our marksheet).

In the digital world, the **JWT Signature** performs this exact function. It is the mathematical "seal" that turns a JSON object into a trusted token. Today, we are going to move past the basics and dissect the cryptography that makes this possible.

---

## 1. The Mathematics of Trust (Why We Need Signatures)

When we transmit data between services, we are sending plain text (Base64). Without a signature, a malicious actor—or even a buggy middleware—could alter the payload.

The signature is generated using a specific formula:

$$Signature = Sign(Base64(Header) + "." + Base64(Payload), Key)$$

This creates a **Cryptographic Binding**. If a hacker changes the payload from `{"user_id": 101}` to `{"user_id": 102}`, the hash of the payload changes. Since the signature is derived from that hash, the token becomes invalid immediately.

Let's explore the two primary architectures we use to implement this: **Symmetric** and **Asymmetric**.

---

## 2. Symmetric Signing (HS256): The "Internal Trust" Model

**Algorithm:** HMAC (Hash-based Message Authentication Code) using SHA-256.

In this architecture, the service that **creates** the token and the service that **verifies** the token share a single **Secret Key**. There is no distinction between a "signer" and a "verifier." If we have the key, we can do both.

### Technical Implementation

We take the message and the secret key, process them through the HMAC-SHA256 algorithm, and produce a hash. This is highly efficient in terms of CPU cycles.

### Real-World Use Case: Swiggy / Zomato Internal Microservices

Consider a high-velocity environment like **Swiggy**.

- **Order Service:** Creates an order token.
- **Delivery Service:** Consumes the token to assign a rider.

Since both services live inside Swiggy's private VPC (Virtual Private Cloud) and are managed by the same DevOps team, we can safely share a secret key (e.g., stored in AWS Secrets Manager).

**Why we use it here:**

- **Speed:** HMAC is significantly faster than RSA. When processing millions of food orders per minute, every millisecond of latency counts.
- **Simplicity:** No need to manage complex public key infrastructure (PKI).

{{< mermaid >}}
sequenceDiagram
    participant OrderService
    participant DeliveryService
    
    Note over OrderService, DeliveryService: 🔐 Shared Secret: "SwiggyInternalKey_2025"
    
    OrderService->>OrderService: Generate JWT <br/>(Sign with Secret)
    OrderService->>DeliveryService: Send Token
    DeliveryService->>DeliveryService: Re-compute Hash <br/>(using same Secret)
    
    alt Hash Matches
        DeliveryService->>DeliveryService: ✅ Process Order
    else Hash Mismatch
        DeliveryService->>DeliveryService: ❌ Reject
    end
{{< /mermaid >}}

---

## 3. Asymmetric Signing (RS256 / PS256): The "Distributed Trust" Model

**Algorithms:** RSA (Rivest–Shamir–Adleman) or ECDSA.

Here, we use a **Key Pair**:

1. **Private Key:** Used to **Sign**. Held *only* by the authentication server.
2. **Public Key:** Used to **Verify**. Distributed to anyone who needs to validate the token.

### Real-World Use Case: Jio / Google Login

Think about "Login with Jio" or "Login with Google."

- **Jio Auth Server (The Signer):** Generates the token using its **Private Key**.
- **Third-Party App (The Verifier):** E.g., `JioSaavn` or a partner app like `Hotstar`.

Jio cannot give its private key to Hotstar (that would compromise Jio's security). Instead, Jio publishes its **Public Key** at a known URL (JWKS endpoint). Hotstar fetches this public key to verify the signature but can never create a fake Jio token itself.

---

## 4. Deep Dive: RS256 vs. PS256

If we choose Asymmetric signing (which is the standard for public APIs), we face a critical configuration choice: **RS256** or **PS256**. Both use RSA keys, but the padding scheme—how the data is prepared before encryption—differs significantly.

### A. RS256 — The Deterministic Standard

This is the default in most JWT libraries. It is **deterministic**.

- **Mechanism:** If we sign the exact same payload twice with the same key, we get the exact same signature string.
- **Vulnerability:** Because the structure is predictable, it is theoretically susceptible to **Padding Oracle Attacks** (like Bleichenbacher’s attack). If an attacker can send millions of slightly modified signatures and analyze the server's error response time, they might reverse-engineer the key.

### B. PS256 — The Probabilistic Shield

This is the modern, secure alternative recommended for high-security applications.

- **Mechanism:** PS256 introduces a random component called a **Salt**. It uses a **Mask Generation Function (MGF1)**.
- **Probabilistic Nature:** If we sign the same payload twice, the signature looks completely different each time. However, the verification logic (using the Public Key) is smart enough to validate both.
- **Security:** The randomness masks the underlying structure of the key, making side-channel attacks and oracle attacks mathematically infeasible.

### Real-World Use Case: UPI & Banking

In the UPI (Unified Payments Interface) ecosystem or banking apps (like ICICI/HDFC), trust is paramount.

We cannot risk a "Padding Oracle Attack" when moving money. Therefore, for financial-grade APIs (FAPI), we prefer PS256 (or ES256) over the older RS256.

### Visualizing the Difference

{{< mermaid >}}
flowchart TD
    subgraph PS256 ["PS256 (Probabilistic)"]
    direction TB
    Input2["Payload Data"] --> Hash2["SHA-256"]
    Salt["Random Salt 🧂"] --> Mix
    Hash2 --> Mix["MGF1 Mixing"]
    Mix --> Enc2["RSA Encrypt"]
    Enc2 --> Sig2["Signature B (Unique every time)"]
    end
    
    subgraph RS256 ["RS256 (Deterministic)"]
    direction TB
    Input1["Payload Data"] --> Hash1["SHA-256"]
    Hash1 --> Pad1["Static Padding"]
    Pad1 --> Enc1["RSA Encrypt"]
    Enc1 --> Sig1["Signature A"]
    end
    
    style Salt fill:#f9f,stroke:#333
{{< /mermaid >}}

---

## 5. Summary: The Decision Matrix

When we architect our systems, we should use the following decision matrix to choose our signing algorithm:

| **Scenario** | **Recommended Algo** | **Why?** | **Real World Example** |
| --- | --- | --- | --- |
| **Internal Microservices** | **HS256** (Symmetric) | Speed & Simplicity. Trust exists between services. | **Swiggy/Zomato** (Order <-> Logistics) |
| **Public APIs / SaaS** | **RS256** (Asymmetric) | Industry compatibility. Secure separation of signer/verifier. | **Google/Facebook** (SSO Login) |
| **Financial / High Security** | **PS256** (Asymmetric) | Maximum security. Mathematical proof against padding attacks. | **UPI / Banking** (Payment Gateways) |

### Conclusion

We often treat JWT libraries as "plug and play," but the choice of `alg` in the header has massive security implications. For most general purposes, RS256 is acceptable. But as we build systems handling sensitive financial data or personal identity, moving to PS256 is not just an upgrade—it's a responsibility.

---