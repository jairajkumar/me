---
title: 'Mermaid Test Page'
date: '2025-01-22T12:00:00+05:30'
draft: true 
author: 'Jairaj Kumar'
slug: mermaid-test
description: 'Test page for Mermaid diagram theme switching'
---

# Mermaid Theme Test

This is a test page to verify that Mermaid diagrams work correctly with theme switching.

## Simple Graph

{{< mermaid >}}
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    
    classDef successNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef errorNode fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    
    class C successNode
    class D errorNode
{{< /mermaid >}}

## Sequence Diagram

{{< mermaid >}}
sequenceDiagram
    participant U as User
    participant T as Theme Toggle
    participant M as Mermaid
    
    U->>T: Click theme toggle
    T->>M: Re-render diagrams
    M-->>U: Updated theme applied
{{< /mermaid >}}

## Instructions

1. Switch between light and dark themes using the theme toggle
2. Verify that diagrams update smoothly without errors
3. Check browser console for any error messages

## Expected Behavior

- ✅ Diagrams should re-render smoothly
- ✅ No console errors during theme switching
- ✅ Visual feedback during transitions
- ✅ Clean diagram rendering in both themes 