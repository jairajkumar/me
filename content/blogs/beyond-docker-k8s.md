---
title: 'Beyond Docker: Why We Need Kubernetes and AWS EKS'
date: '2026-02-27T00:18:41+05:30'
draft: false
author: 'Jairaj Kumar'
categories: ["backend", "Design"]
tags: ["docker", "kubernetes", "aws-eks", "cloud", "microservices", "infrastructure", "scalibility"]
description: ''
featured: 0  # 0 means not featured, higher numbers (e.g., 1.1, 1.2) will be shown in order
toc: true
slug: 'beyond-docker-k8s'
---

If you are working with microservices, you are probably already using Docker. Docker is fantastic it packages your application and its dependencies into a single, portable unit. It runs exactly the same on your local machine as it does in production.

But as your system grows, a common question arises: *If I have Docker, why do I need Kubernetes?*

To understand why, we need to look at how containerized applications behave in the wild, especially when traffic spikes and infrastructure costs become a concern.

## The "One Container Per VM" Approach

Let’s look at a real world scenario. While working on a recording service that was highly CPU intensive, we deployed it using a straightforward architecture: one Docker container running on one Virtual Machine (VM), with a load balancer sitting in front of a fleet of these VMs.

{{< mermaid >}}
flowchart TD
    Client --> LB_VM
    
    subgraph LB_VM ["Load Balancer VM"]
        LB[Load Balancer]
    end
    
    LB --> VM1
    LB --> VM2
    LB --> VM3
    
    subgraph VM1 ["VM 1 - CPU: 95%"]
        D1["Docker: Recording Service\n(CPU: 95%, RAM: 8GB)"]
    end
    
    subgraph VM2 ["VM 2 - CPU: 90%"]
        D2["Docker: Recording Service\n(CPU: 90%, RAM: 8GB)"]
    end
    
    subgraph VM3 ["VM 3 - CPU: 85%"]
        D3["Docker: Recording Service\n(CPU: 85%, RAM: 8GB)"]
    end
{{< /mermaid >}}

For a monolithic, CPU heavy workload like video recording or encoding, this actually works well. The service needs all the CPU it can get, so isolating it on its own VM prevents "noisy neighbors" from stealing compute power.

But what happens when you split your application into a dozen different microservices?

## The Problem with a VM for Every Service

Imagine you have an Authentication Service, a Notification Service, and a User Profile Service. Unlike the recording service, these are lightweight. They might only use 5% of a VM’s CPU during normal operations.

If you stick to the "one service per VM" rule, you end up provisioning separate EC2 instances for every single microservice.

**Why is this a bad idea?**

1. **Wasted Money:** You are paying for VMs that are sitting idle 95% of the time.
2. **Maintenance Nightmare:** Patching, updating, and monitoring 50 different VMs is a massive operational headache.
3. **Slow Scaling:** Booting up a brand new VM to handle a traffic spike takes minutes. In the cloud world, minutes mean dropped requests.

## Enter Kubernetes: The Power of Pods and Orchestration

This is where Kubernetes (K8s) comes in. Kubernetes is a container orchestrator. If Docker is the shipping container, Kubernetes is the port manager, the cranes, and the logistics system deciding where those containers go.

In Kubernetes, the smallest deployable unit is a **Pod** (which usually holds one Docker container). Instead of tying a service to a specific VM, Kubernetes looks at your available pool of servers (Nodes) and plays a game of Tetris, packing Pods onto Nodes efficiently.

{{< mermaid >}}
graph TD
    subgraph Cluster [Kubernetes Cluster]
        subgraph Node1 [EC2 Node 1 - Overall CPU: 80% Used]
            P1["Pod: Auth Service<br/>(CPU: 15%, RAM: 256MB)"]
            P2["Pod: Notification<br/>(CPU: 5%, RAM: 128MB)"]
            P3["Pod: Profile API<br/>(CPU: 60%, RAM: 1GB)"]
        end
        subgraph Node2 [EC2 Node 2 - Overall CPU: 65% Used]
            P4["Pod: Auth Service<br/>(CPU: 15%, RAM: 256MB)"]
            P5["Pod: Payment Service<br/>(CPU: 50%, RAM: 2GB)"]
        end
    end
{{< /mermaid >}}

### Why Pods are Effective

By using Pods managed by K8s, multiple different microservices can securely share the underlying compute resources of a single EC2 instance. K8s ensures that the Notification service doesn't eat up the RAM required by the Payment service. You get high resource utilization, which drastically lowers your AWS bill.

### How Orchestration and Scaling Work

Kubernetes shines when traffic surges. It scales on two distinct levels:

1. **Pod Scaling (HPA):** If your Auth Service gets swamped with logins, the Horizontal Pod Autoscaler (HPA) instantly creates more Pods for the Auth Service across your existing servers. This takes seconds, not minutes.
2. **Node Scaling (Cluster Autoscaler):** If all your EC2 servers are completely full of Pods and you still need more, Kubernetes talks to AWS and spins up a new EC2 instance automatically. Once the traffic dies down, it kills the extra Pods and terminates the unneeded EC2 instance.

{{< mermaid >}}
flowchart TB
    subgraph ControlPlane ["AWS EKS Control Plane"]
        Metrics["Metrics Server\nDetects Auth Pods > 80% CPU"] --> HPA["Horizontal Pod Autoscaler\nDecision: Add 3 more Auth Pods"]
    end

    subgraph Node1 ["EC2 Node 1 - 100% Allocated"]
        P1["Auth Pod 1 (High CPU)"]
        P2["Auth Pod 2 (High CPU)"]
        P3["Profile API"]
    end

    subgraph Node2 ["EC2 Node 2 - 100% Allocated"]
        P4["Auth Pod 3 (High CPU)"]
        P5["Payment Service"]
        Pending["Pending Auth Pod 4\n(Insufficient CPU)"]
    end

    subgraph Node3 ["NEW EC2 Node 3 - Booting"]
        P6["New Auth Pod 4 (Starting)"]
        P7["New Auth Pod 5 (Starting)"]
    end

    HPA -->|"1. Triggers Scale-Up"| Pending
    Pending -.->|"2. Cannot Schedule"| CA["Cluster Autoscaler\nProvision new EC2"]
    CA -->|"3. Requests New Server"| Node3
{{< /mermaid >}}
## Why Do We Need AWS EKS?

You can absolutely install and run Kubernetes yourself on a bunch of EC2 instances. But managing Kubernetes is notoriously difficult.

A Kubernetes cluster is divided into two parts:

1. **The Control Plane:** The "brain" of the cluster (API server, scheduler, etcd database). It tracks the state of everything.
2. **The Worker Nodes:** The actual EC2 servers where your Pods run.

{{< mermaid >}}
flowchart LR
    subgraph AWSManagedEKS ["AWS Managed EKS"]
        CP[Control Plane / Brain]
    end
    
    subgraph YourAWSAccount ["Your AWS Account"]
        CP --> N1[Worker Node / EC2]
        CP --> N2[Worker Node / EC2]
        
        N1 --> P1((Pod))
        N1 --> P2((Pod))
        
        N2 --> P3((Pod))
    end
{{< /mermaid >}}




If your Control Plane goes down, your entire cluster management goes down. You can't scale, deploy, or recover from failures. Maintaining the Control Plane requires deep expertise in high availability, backups, and networking.

**Amazon Elastic Kubernetes Service (EKS)** solves this by entirely managing the Control Plane for you.

- AWS ensures the "brain" is spread across multiple Availability Zones.
- AWS handles the database backups (etcd).
- AWS handles the K8s version upgrades.

With EKS, you only have to worry about your application code and the Worker Nodes (which you can also automate). EKS bridges the gap between the incredible power of Kubernetes orchestration and the reliability of AWS managed infrastructure.

## Conclusion

Docker packages your code so it can run anywhere. But when "anywhere" becomes a massive cloud environment with dozens of microservices, fluctuating traffic, and a strict budget, you need orchestration. Kubernetes packs your services efficiently, scales them instantly, and recovers them when they fail. And with AWS EKS, you get all that power without having to become a full-time Kubernetes administrator.

---