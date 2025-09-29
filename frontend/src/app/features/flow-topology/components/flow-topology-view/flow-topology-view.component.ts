import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { Observable } from 'rxjs';
import { NetworkGraphComponent, Node, Link } from '../../../network-topology/components/network-graph/network-graph.component';
import {
  FlowLogsDataService,
  FlowLogQueryResult,
  Granularity,
  FlowLogsConfig
} from '../../../flow-logs-edge-explorer/services/flow-logs-data.service';

interface LatencyInfo {
  totalLatency: number;
  queryCount: number;
  connectionCount: number;
  successCount: number;
  failureCount: number;
}

@Component({
  selector: 'app-flow-topology-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    NetworkGraphComponent
  ],
  templateUrl: './flow-topology-view.component.html',
  styleUrls: ['./flow-topology-view.component.scss']
})
export class FlowTopologyViewComponent implements OnInit {
  currentUser$: Observable<User | null>;
  
  nodes: Node[] = [];
  links: Link[] = [];
  isLoading = false;
  latencyInfo: LatencyInfo | null = null;

  // BigQuery configuration
  datasetPath: string = 'net-top-viz-demo-208511.default_bq_loganalytics._AllLogs';
  config: FlowLogsConfig | null = null;
  isConfigValid: boolean = false;

  // Time range
  timeRangeHours: number = 1;
  timeRangeOptions = [
    { value: 1, label: 'Last Hour' },
    { value: 6, label: 'Last 6 Hours' },
    { value: 24, label: 'Last 24 Hours' }
  ];

  // Selected granularities for topology - all by default
  selectedGranularityIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7]; // All granularities including Instance-to-Country

  constructor(
    private authService: AuthService,
    private flowLogsDataService: FlowLogsDataService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.validateAndSetConfig();
    if (this.isConfigValid) {
      this.fetchTopologyData();
    }
  }

  /**
   * Validate dataset path and set config
   */
  validateAndSetConfig(): void {
    const validation = this.flowLogsDataService.validateDatasetPath(this.datasetPath);
    
    if (validation.valid && validation.projectId && validation.datasetId && validation.tableId) {
      this.config = {
        projectId: validation.projectId,
        datasetId: validation.datasetId,
        tableId: validation.tableId
      };
      this.isConfigValid = true;
    } else {
      this.config = null;
      this.isConfigValid = false;
    }
  }

  fetchTopologyData(): void {
    if (!this.config || !this.isConfigValid) {
      console.error('Invalid BigQuery configuration');
      return;
    }

    this.isLoading = true;
    const startTime = Date.now();
    
    // Get selected granularities
    const allGranularities = this.flowLogsDataService.getAvailableGranularities();
    const selectedGranularities = this.selectedGranularityIndices.map(i => allGranularities[i]);
    
    console.log(`Fetching flow topology data for ${selectedGranularities.length} granularities`);

    this.flowLogsDataService.getFlowLogData(
      this.config,
      selectedGranularities,
      this.timeRangeHours
    ).subscribe({
      next: (results: FlowLogQueryResult[]) => {
        const endTime = Date.now();
        
        // Calculate latency info
        const totalConnections = results.reduce((sum, r) => sum + r.connections.length, 0);
        const successCount = results.filter(r => r.success).length;
        
        this.latencyInfo = {
          totalLatency: endTime - startTime,
          queryCount: results.length,
          connectionCount: totalConnections,
          successCount: successCount,
          failureCount: results.length - successCount
        };

        // Transform connections to nodes and links
        this.transformConnectionsToGraph(results);
        
        this.isLoading = false;
        
        console.log(`Flow topology loaded: ${this.nodes.length} nodes, ${this.links.length} links in ${this.latencyInfo.totalLatency}ms`);
      },
      error: (error) => {
        console.error('Error fetching flow topology data:', error);
        const endTime = Date.now();
        this.latencyInfo = {
          totalLatency: endTime - startTime,
          queryCount: 0,
          connectionCount: 0,
          successCount: 0,
          failureCount: 1
        };
        this.isLoading = false;
      }
    });
  }

  private transformConnectionsToGraph(results: FlowLogQueryResult[]): void {
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
          
          // Format metric value to show bytes
          const bytesFormatted = this.flowLogsDataService.formatBytes(conn.bytes);
          
          links.push({
            source: sourceId,
            target: targetId,
            type: 'network',
            metricValue: `${bytesFormatted} (${conn.flows} flows)`
          });
        }
      });
    });

    this.nodes = Array.from(nodeMap.values());
    this.links = links;
  }

  refreshData(): void {
    this.validateAndSetConfig();
    if (this.isConfigValid) {
      this.fetchTopologyData();
    }
  }
}
