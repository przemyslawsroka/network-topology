# Functional Requirements

## Overview
This application replicates Google Cloud Platform's Network Topology visualization capabilities using Google Cloud Monitoring API metrics and VPC Flow Logs. The system provides both infrastructure view and detailed traffic analysis by combining real-time telemetry with configuration data, similar to GCP's native Network Topology tool.

Reference: [GCP Network Topology Overview](https://cloud.google.com/network-intelligence-center/docs/network-topology/concepts/overview)

## Core Features

### 1. Hierarchical Entity Visualization
- **FR-001**: Display hierarchical network topology graph with aggregated entities that can be expanded/collapsed
- **FR-002**: Implement base entity visualization with proper hierarchies:
  - **VM Instances**: region > network > subnet > zone > instance group > instance
  - **Load Balancers**: external load balancing > load balancer
  - **GKE Resources**: region > network > cluster > namespace > workload > pod
  - **External Entities**: internet, on-premises networks, Google services
- **FR-003**: Represent entities as circular nodes with appropriate icons matching GCP standards
- **FR-004**: Skip hierarchy levels with single entities, drilling down to meaningful aggregation levels
- **FR-005**: Support project aggregation for multi-project topologies

### 2. Cloud Monitoring API Integration
- **FR-006**: Query Cloud Monitoring API for network metrics with specific metric types per connection:

#### VM-to-VM Connections (using compute.googleapis.com metrics):
- **FR-007**: `instance/network/sent_bytes_count` - Outbound traffic volume
- **FR-008**: `instance/network/received_bytes_count` - Inbound traffic volume  
- **FR-009**: `instance/network/sent_packets_count` - Outbound packet count
- **FR-010**: `instance/network/received_packets_count` - Inbound packet count

#### Load Balancer Connections (using loadbalancing.googleapis.com metrics):
- **FR-011**: `https/backend_request_count` - Request volume to backends
- **FR-012**: `https/total_latencies` - Backend latency metrics
- **FR-013**: `tcp_ssl_proxy/new_connections` - New connection rates
- **FR-014**: `tcp_ssl_proxy/closed_connections` - Connection closure rates

#### Inter-Region Connections (using gce_instance metrics):
- **FR-015**: `networking/sent_bytes_count` - Cross-region traffic volume
- **FR-016**: `networking/received_bytes_count` - Cross-region inbound traffic

#### External Connections (using gce_instance metrics):
- **FR-017**: `networking/sent_bytes_count` with external IP filters
- **FR-018**: `networking/received_bytes_count` with external IP filters

### 3. VPC Flow Logs Analysis (5-tuple granularity)
- **FR-019**: Process VPC Flow Logs for detailed connection analysis where metrics lack granularity:

#### Port-level Analysis:
- **FR-020**: Extract 5-tuple information (src_ip, dest_ip, src_port, dest_port, protocol)
- **FR-021**: Analyze application-level traffic patterns by port
- **FR-022**: Identify specific service communications (HTTP:80, HTTPS:443, SSH:22, etc.)

#### Security and Anomaly Detection:
- **FR-023**: Detect unusual port access patterns
- **FR-024**: Identify communication to unauthorized destinations
- **FR-025**: Monitor for potential security violations or data exfiltration

#### Detailed Traffic Flow Analysis:
- **FR-026**: Correlate VM-to-VM communications with specific applications
- **FR-027**: Analyze microservice communication patterns in GKE clusters
- **FR-028**: Track east-west traffic flows within subnets
- **FR-029**: Monitor north-south traffic patterns to external services

### 4. Time-based Data Collection
- **FR-030**: Implement hourly snapshot visualization (matching GCP's approach)
- **FR-031**: Maintain 6 weeks of historical topology data
- **FR-032**: Show entities and connections only if they communicated during selected time period
- **FR-033**: Support present snapshot (previous hour data) and historical snapshots
- **FR-034**: Provide real-time time series charts with configurable timeframes (1 hour to 6 weeks)

### 5. Interactive Graph Features
- **FR-035**: Enable zoom and pan functionality for network graph navigation
- **FR-036**: Provide node selection and detailed information display with metric overlays
- **FR-037**: Implement filtering capabilities matching GCP Network Topology:
  - By resource type (VM instances, load balancers, GKE resources)
  - By traffic volume thresholds
  - By time range (hourly snapshots, up to 6 weeks history)
  - By network zone/region
  - By project (for multi-project view)
- **FR-038**: Show/hide different types of connections and hierarchical levels
- **FR-039**: Search functionality for specific network resources
- **FR-040**: Support graph truncation handling for large topologies (>1000 nodes)
- **FR-041**: Implement entity expansion/collapse for hierarchical navigation

### 6. Metric Overlays and Visualization
- **FR-042**: Display traffic metrics overlaid on connections with color coding:
  - **Green**: Normal traffic levels
  - **Yellow**: Medium traffic levels  
  - **Red**: High traffic levels or alerts
- **FR-043**: Show connection thickness proportional to traffic volume
- **FR-044**: Display latency metrics with percentile calculations (P50, P95, P99)
- **FR-045**: Implement real-time metric updates with 1-7 minute freshness
- **FR-046**: Show aggregated metrics for collapsed hierarchical entities

### 7. Multi-Project and Cross-Network Support
- **FR-047**: Support Shared VPC network visualization across projects
- **FR-048**: Display VPC Network Peering connections and traffic
- **FR-049**: Implement metrics scope configuration for multi-project monitoring
- **FR-050**: Show cross-project network traffic with proper entity attribution
- **FR-051**: Support hybrid connectivity visualization (VPN, Interconnect)

### 8. Data Processing and Storage
- **FR-052**: Ingest Cloud Monitoring metrics via API with proper authentication
- **FR-053**: Process VPC Flow Logs from Cloud Storage or BigQuery
- **FR-054**: Implement data aggregation matching GCP's hourly snapshots
- **FR-055**: Store topology cache for improved performance
- **FR-056**: Handle metric data freshness and availability constraints
- **FR-057**: Support incremental data updates and historical data retention

### 9. Performance and Scalability
- **FR-058**: Handle large-scale topologies with >1000 entities efficiently
- **FR-059**: Implement client-side graph rendering with WebGL acceleration
- **FR-060**: Support graph pagination and lazy loading for large datasets
- **FR-061**: Optimize API queries to minimize Cloud Monitoring costs
- **FR-062**: Cache frequently accessed topology data with appropriate TTL

### 10. Monitoring and Insights
- **FR-063**: Generate insights for entities with high egress traffic
- **FR-064**: Detect and highlight network anomalies based on baseline patterns
- **FR-065**: Provide network health indicators and status dashboards
- **FR-066**: Support alerting on topology changes and traffic patterns
- **FR-067**: Track and display network configuration changes over time

### 11. Export and Integration
- **FR-068**: Export topology diagrams in various formats (PNG, SVG, PDF)
- **FR-069**: Generate network analysis reports with metric summaries
- **FR-070**: Export raw metric data and flow log analysis results
- **FR-071**: Support API access for topology data integration
- **FR-072**: Provide webhook notifications for significant topology changes

## Detailed Metric Specifications

### Cloud Monitoring API Metrics Usage

#### For VM Instance Connections:
```
Resource Type: gce_instance
Metrics:
- compute.googleapis.com/instance/network/sent_bytes_count
- compute.googleapis.com/instance/network/received_bytes_count
- compute.googleapis.com/instance/network/sent_packets_count
- compute.googleapis.com/instance/network/received_packets_count

Aggregation: SUM over 1-hour windows
Filters: instance_name, zone, network_name
Usage: Determine VM-to-zone level traffic patterns
Limitation: Only provides zone-level granularity, requires VPC Flow Logs for VM-to-VM specificity
```

#### For Load Balancer Connections:
```
Resource Type: https_lb_rule, tcp_ssl_proxy_rule
Metrics:
- loadbalancing.googleapis.com/https/backend_request_count
- loadbalancing.googleapis.com/https/total_latencies
- loadbalancing.googleapis.com/tcp_ssl_proxy/new_connections
- loadbalancing.googleapis.com/tcp_ssl_proxy/closed_connections

Aggregation: SUM for counts, P95/P99 for latencies
Filters: backend_name, forwarding_rule_name
Usage: Show load balancer performance and backend health
```

#### For External Traffic:
```
Resource Type: gce_instance
Metrics:
- compute.googleapis.com/instance/network/sent_bytes_count
- compute.googleapis.com/instance/network/received_bytes_count

Filters: 
- instance_name, zone
- src_ip_type: external
- dest_ip_type: external
Usage: Identify internet-bound and internet-sourced traffic
```

### VPC Flow Logs Usage Patterns

#### High-Granularity Connection Analysis:
```
Required Fields:
- srcaddr, destaddr (IP addresses)
- srcport, destport (port numbers)  
- protocol (TCP, UDP, ICMP)
- bytes, packets (volume metrics)
- start_time, end_time (temporal data)

Usage Scenarios:
1. VM-to-VM specific connections (metrics only show VM-to-zone)
2. Port-level service analysis (HTTP:80, HTTPS:443, SSH:22)
3. Microservice communication patterns in GKE
4. Security anomaly detection
5. Application dependency mapping
```

#### Complementary Usage Strategy:
```
Metrics (Coarse-grained): Use for entity-level aggregations, performance overview
VPC Flow Logs (Fine-grained): Use for specific connection analysis, security monitoring

Example:
- Metrics show: VM-A zone has 100GB traffic to VM-B zone
- Flow Logs reveal: 80GB was HTTPS, 15GB was database traffic, 5GB was SSH
```

### Data Collection Strategy

#### Metrics Collection:
- **Frequency**: Every 1 minute for real-time, hourly aggregation for topology
- **Retention**: 6 weeks aligned with GCP Network Topology
- **API Limits**: Max 100 time series per request, implement batching
- **Cost Optimization**: Use appropriate aggregation intervals, cache frequent queries

#### VPC Flow Logs Processing:
- **Source**: Cloud Storage or BigQuery exports
- **Processing**: Real-time stream processing for alerts, batch processing for topology
- **Sampling**: Support sampling rates (1:1, 1:10, 1:100) based on traffic volume
- **Storage**: Time-partitioned for efficient historical queries

### Technical Implementation Notes

Based on GCP Network Topology documentation:
1. **Entity Detection**: Only show entities that communicated during selected time period
2. **Hierarchy Skipping**: Skip levels with single entities until reaching meaningful aggregation
3. **Graph Truncation**: Handle topologies >1000 nodes with truncation warnings
4. **Multi-Project**: Support metrics scope configuration for cross-project visibility
5. **Data Freshness**: Match GCP's 7-minute maximum delay for real-time data
