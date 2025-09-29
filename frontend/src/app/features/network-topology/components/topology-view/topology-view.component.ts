import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { Observable } from 'rxjs';
import { NetworkGraphComponent, Node, Link } from '../network-graph/network-graph.component';
import { MetricDataService, Connection, MetricQueryResult } from '../../../metric-edge-explorer/services/metric-data.service';

interface LatencyInfo {
  totalLatency: number;
  metricCount: number;
  connectionCount: number;
  successCount: number;
  failureCount: number;
}

@Component({
  selector: 'app-topology-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    NetworkGraphComponent
  ],
  templateUrl: './topology-view.component.html',
  styleUrls: ['./topology-view.component.scss']
})
export class TopologyViewComponent implements OnInit {
  currentUser$: Observable<User | null>;
  
  nodes: Node[] = [];
  links: Link[] = [];
  isLoading = false;
  latencyInfo: LatencyInfo | null = null;

  constructor(
    private authService: AuthService,
    private metricDataService: MetricDataService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.fetchTopologyData();
  }

  fetchTopologyData(): void {
    this.isLoading = true;
    const startTime = Date.now();
    
    // Get all available granularities
    const allGranularities = this.metricDataService.getAvailableGranularities();
    
    console.log(`Fetching topology data for ${allGranularities.length} granularities`);

    this.metricDataService.getMetricData(allGranularities).subscribe({
      next: (results: MetricQueryResult[]) => {
        const endTime = Date.now();
        
        // Calculate latency info
        const totalConnections = results.reduce((sum, r) => sum + r.connections.length, 0);
        const successCount = results.filter(r => r.success).length;
        
        this.latencyInfo = {
          totalLatency: endTime - startTime,
          metricCount: results.length,
          connectionCount: totalConnections,
          successCount: successCount,
          failureCount: results.length - successCount
        };

        // Transform connections to nodes and links
        this.transformConnectionsToGraph(results);
        
        this.isLoading = false;
        
        console.log(`Topology loaded: ${this.nodes.length} nodes, ${this.links.length} links in ${this.latencyInfo.totalLatency}ms`);
      },
      error: (error) => {
        console.error('Error fetching topology data:', error);
        const endTime = Date.now();
        this.latencyInfo = {
          totalLatency: endTime - startTime,
          metricCount: 0,
          connectionCount: 0,
          successCount: 0,
          failureCount: 1
        };
        this.isLoading = false;
      }
    });
  }

  private transformConnectionsToGraph(results: MetricQueryResult[]): void {
    const nodeMap = new Map<string, Node>();
    const linkSet = new Set<string>();
    const links: Link[] = [];

    // Process all connections from all results
    results.forEach(result => {
      result.connections.forEach(conn => {
        // Add source node
        const sourceId = `${conn.source.type}-${conn.source.name}`;
        if (!nodeMap.has(sourceId)) {
          nodeMap.set(sourceId, {
            id: sourceId,
            name: conn.source.name,
            type: conn.source.type,
            status: 'healthy'
          });
        }

        // Add target node
        const targetId = `${conn.target.type}-${conn.target.name}`;
        if (!nodeMap.has(targetId)) {
          nodeMap.set(targetId, {
            id: targetId,
            name: conn.target.name,
            type: conn.target.type,
            status: 'healthy'
          });
        }

        // Add link (avoid duplicates)
        const linkKey = `${sourceId}->${targetId}`;
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey);
          links.push({
            source: sourceId,
            target: targetId,
            type: 'network',
            metricValue: conn.metricValue
          });
        }
      });
    });

    this.nodes = Array.from(nodeMap.values());
    this.links = links;
  }

  refreshData(): void {
    this.fetchTopologyData();
  }
}
