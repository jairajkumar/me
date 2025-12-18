---
title: 'JWT Dissection — Understand JSON Web Tokens'
date: '2025-07-17T15:16:46+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "security"]
tags: []
description: ''
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'JWT-dissection'
---
JSON Web Tokens (JWT) are everywhere — from authentication in single-page applications to service-to-service communication in distributed systems. Despite their popularity, JWTs are often misunderstood, misused, or treated as a black box.

In this blog, we’ll **dissect JWTs from the inside out**. We’ll see how a token is structured, how it’s created and verified, and what really happens when an API receives a `Bearer` token — all explained with **clear examples and diagrams**.


## 1. What is a JWT and when should we use it?

A JWT is a standardized token format defined in **RFC 7519**. It allows two parties to securely exchange claims in a compact, URL-safe way.

### Common use cases

- Stateless authentication between clients and APIs  
- Short-lived access tokens  
- Secure information exchange between services  

### When JWT is not a good fit

- When immediate server-side revocation is required  
- When storing highly sensitive information without encryption  
- When token size must remain extremely small  


## 2. JWT structure: `header.payload.signature`

A JWT consists of **three Base64URL-encoded parts** separated by dots:

```json
header.payload.signature
```

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "sub": "1234",
  "name": "John",
  "iat": 1516239022
}
```

> ⚠️ The payload is **not encrypted** — anyone can decode it.

### Signature

The signature ensures the token was not tampered with. It is created by signing:

```
base64url(header) + "." + base64url(payload)
```


## 3. JWT anatomy (visualized)

{{< mermaid >}}
flowchart LR
  A[Header JSON] -->|Base64URL Encode| B[h64]
  C[Payload JSON] -->|Base64URL Encode| D[p64]
  B --> E[Signing Input]
  D --> E
  E -->|Sign with secret / private key| F[Signature]
  F --> G[JWT Token: h64.p64.s64]
{{< /mermaid >}}

 **Note**  
JWT signatures and cryptographic signing deserve a deep dive of their own. We’ll cover signature algorithms, key management, and signing internals in a [**separate dedicated blog on JWT signatures and signing**]({{< ref "JWT_signature.md" >}}).


## 4. How signing and verification works

### Symmetric signing (HS256)

- The same secret is used to sign and verify the token
- Simple to implement, harder to scale securely

### Asymmetric signing (RS256 / ES256)

- Private key signs the token
- Public key verifies it
- Ideal for distributed systems and microservices

{{< mermaid >}}
sequenceDiagram
  participant Client
  participant AuthServer
  participant API

  Client->>AuthServer: Authenticate
  AuthServer-->>Client: Signed JWT
  Client->>API: Authorization: Bearer JWT
  API->>API: Verify signature & claims
  API-->>Client: Protected response
{{< /mermaid >}}


## 5. Common JWT vulnerabilities

- Trusting the `alg` header blindly
- Using long-lived access tokens
- Storing sensitive data inside the payload
- Having no token revocation strategy
- Skipping validation of `iss`, `aud`, or `exp`


## 6. Best practices

- Use **short-lived access tokens**
- Always validate `iss`, `aud`, and `exp`
- Prefer **RS256 / ES256** for distributed systems
- Rotate signing keys regularly
- Use `jti` for token revocation


## 7. JWKS and key rotation

{{< mermaid >}}
sequenceDiagram
  participant API
  participant JWKS

  API->>JWKS: Fetch /.well-known/jwks.json
  JWKS-->>API: Public keys
  API->>API: Verify JWT
{{< /mermaid >}}


## Conclusion

JWTs are powerful but easy to misuse. Understanding their **structure, verification flow, and limitations** is essential for building secure systems.

In the next blog, we’ll dive deep into [**JWT signatures and cryptography**]({{< ref "JWT_signature.md" >}}).

---
