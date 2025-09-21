# Network Topology Metrics Documentation

This document outlines the key Google Cloud Monitoring metrics utilized by the Network Topology tool to visualize network traffic, latency, and connectivity across your infrastructure.

## I. GCE / Infrastructure View Metrics

This view provides insights into the network performance of your Compute Engine instances, load balancers, and hybrid connectivity solutions.

### 1. Core VM & Regional Metrics

-   **CPU Utilization**: `compute.googleapis.com/instance/cpu/utilization`
-   **Memory Usage**: `agent.googleapis.com/memory/percent_used` (requires Ops Agent)
-   **Disk Usage**: `agent.googleapis.com/disk/percent_used` (requires Ops Agent)

### 2. VM to VM Connections

These metrics track the direct flow of traffic between individual virtual machine instances.

-   **Average Hourly Throughput (Egress)**: `networking.googleapis.com/vm_flow/egress_bytes_count`
-   **Average Hourly Throughput (Ingress)**: `networking.googleapis.com/vm_flow/ingress_bytes_count`
-   **Latency (Round-Trip Time)**: `networking.googleapis.com/vm_flow/rtt`
-   **Packet Loss**: `networking.googleapis.com/vm_flow/packet_loss_count`

### 3. Client to Load Balancing

Metrics for traffic originating from external clients and terminating at Google Cloud Load Balancers.

#### a. External Application Load Balancer

-   **Traffic (Requests)**: `loadbalancing.googleapis.com/https/request_bytes_count`
-   **Traffic (Responses)**: `loadbalancing.googleapis.com/https/response_bytes_count`
-   **Latency (Frontend RTT)**: `loadbalancing.googleapis.com/https/frontend_tcp_rtt`
-   **Request Count**: `loadbalancing.googleapis.com/https/request_count`

#### b. External Proxy Network Load Balancer

-   **Traffic (Egress)**: `loadbalancing.googleapis.com/tcp_ssl_proxy/egress_bytes_count`
-   **Traffic (Ingress)**: `loadbalancing.googleapis.com/tcp_ssl_proxy/ingress_bytes_count`
-   **Open Connections**: `loadbalancing.googleapis.com/tcp_ssl_proxy/open_connections`

#### c. External Passthrough Network Load Balancer

-   **Traffic (Egress)**: `loadbalancing.googleapis.com/l3/external/egress_bytes_count`
-   **Traffic (Ingress)**: `loadbalancing.googleapis.com/l3/external/ingress_bytes_count`

### 4. Load Balancing to Backends

Metrics for traffic between your load balancers and their backend services (e.g., instance groups).

#### a. External Application Load Balancer to Backend

-   **Traffic (Requests)**: `loadbalancing.googleapis.com/https/backend_request_bytes_count`
-   **Traffic (Responses)**: `loadbalancing.googleapis.com/https/backend_response_bytes_count`
-   **Latency**: `loadbalancing.googleapis.com/https/backend_latencies`
-   **Request Count**: `loadbalancing.googleapis.com/https/backend_request_count`

#### b. Internal Passthrough Network Load Balancer to Backend

-   **Traffic (Egress)**: `loadbalancing.googleapis.com/l3/internal/egress_bytes_count`
-   **Traffic (Ingress)**: `loadbalancing.googleapis.com/l3/internal/ingress_bytes_count`

### 5. Hybrid Connectivity

Metrics for traffic between your VPC and on-premises networks.

#### a. VLAN Attachments (Cloud Interconnect)

-   **Attachment Traffic (Egress)**: `interconnect.googleapis.com/network/attachment/egress_bytes_count`
-   **Attachment Traffic (Ingress)**: `interconnect.googleapis.com/network/attachment/ingress_bytes_count`
-   **VM to VLAN Traffic (Egress)**: `networking.googleapis.com/interconnect_attachment/vm/egress_bytes_count`
-   **VM to VLAN Traffic (Ingress)**: `networking.googleapis.com/interconnect_attachment/vm/ingress_bytes_count`

#### b. VPN Tunnels

-   **Tunnel Traffic (Egress)**: `vpn.googleapis.com/network/egress_bytes_count`
-   **Tunnel Traffic (Ingress)**: `vpn.googleapis.com/network/ingress_bytes_count`
-   **VM to VPN Traffic (Egress)**: `networking.googleapis.com/vpn_tunnel/vm/egress_bytes_count`
-   **VM to VPN Traffic (Ingress)**: `networking.googleapis.com/vpn_tunnel/vm/ingress_bytes_count`

#### c. Router Appliance

-   **VPC to On-premises (Egress)**: `routerappliance.googleapis.com/gateway/egress_bytes_count`
-   **VPC to On-premises (Ingress)**: `routerappliance.googleapis.com/gateway/ingress_bytes_count`
-   **VM to Router (Egress)**: `routerappliance.googleapis.com/vm/egress_bytes_count`
-   **VM to Router (Ingress)**: `routerappliance.googleapis.com/vm/ingress_bytes_count`

### 6. Client to Google Services

-   **Traffic (Requests)**: `networking.googleapis.com/google_service/request_bytes_count`
-   **Traffic (Responses)**: `networking.googleapis.com/google_service/response_bytes_count`

---

## II. GKE Topology Metrics

These metrics, provided by the Cloud Latency pipeline, offer a granular view of network performance within your GKE clusters.

### 1. Pod, Workload, and Namespace Level

-   **Monitored Resource**: `k8s_pod`
-   **Average Throughput (Egress)**: `networking.googleapis.com/pod_flow/egress_bytes_count`
-   **Average Throughput (Ingress)**: `networking.googleapis.com/pod_flow/ingress_bytes_count`
-   **Median Latency (RTT)**: `networking.googleapis.com/pod_flow/rtt`

### 2. Node, Node Pool, and Cluster Level

-   **Monitored Resource**: `k8s_node`
-   **Average Throughput (Egress)**: `networking.googleapis.com/node_flow/egress_bytes_count`
-   **Average Throughput (Ingress)**: `networking.googleapis.com/node_flow/ingress_bytes_count`
-   **Median Latency (RTT)**: `networking.googleapis.com/node_flow/rtt`
