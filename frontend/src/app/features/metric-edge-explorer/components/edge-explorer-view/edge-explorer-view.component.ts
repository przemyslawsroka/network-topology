import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { HttpClientModule } from '@angular/common/http';
import { MetricDataService, Connection, MetricQueryResult } from '../../services/metric-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GcpMonitoringService } from '../../../../core/services/gcp-monitoring.service';

interface QuerySummary {
  totalLatency: number;
  totalSuccess: boolean;
  results: IndividualQueryResult[];
}

interface IndividualQueryResult {
  metric: string;
  latency: number;
  success: boolean;
  errorMessage?: string;
}

export interface GroupedConnection {
  source: { name: string; type: string };
  targets: { 
    target: { name: string; type: string }; 
    metricValue: string; 
    metricName: string;
  }[];
  granularity: string;
}

@Component({
  selector: 'app-edge-explorer-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    MatExpansionModule,
    HttpClientModule
  ],
  templateUrl: './edge-explorer-view.component.html',
  styleUrls: ['./edge-explorer-view.component.scss']
})
export class EdgeExplorerViewComponent implements OnInit {
  
  groupedConnections: GroupedConnection[] = [];
  displayedColumns: string[] = ['source', 'granularity', 'target', 'metricName', 'metricValue'];
  
  querySummary: QuerySummary | null = null;
  isLoading: boolean = false;

  constructor(
    private metricDataService: MetricDataService,
    private authService: AuthService,
    private gcpMonitoringService: GcpMonitoringService
  ) { }

  ngOnInit(): void {
    // Data will be loaded when a project is selected
  }

  fetchData(): void {
    this.isLoading = true;
    const startTime = Date.now();
    
    this.metricDataService.getMetricData()
      .subscribe({
        next: (results: MetricQueryResult[]) => {
          const endTime = Date.now();
          this.groupedConnections = this.groupConnections(results);
          
          this.querySummary = {
            totalLatency: endTime - startTime,
            totalSuccess: results.every(r => r.success),
            results: results.map(r => ({
              metric: r.metricName,
              latency: r.latency,
              success: r.success,
              errorMessage: r.error
            }))
          };
          this.isLoading = false;
        },
        error: (error) => {
          const endTime = Date.now();
          this.querySummary = {
            totalLatency: endTime - startTime,
            totalSuccess: false,
            results: []
          };
          this.isLoading = false;
        }
      });
  }

  private groupConnections(results: MetricQueryResult[]): GroupedConnection[] {
    const groupedBySource: { [key: string]: GroupedConnection } = {};

    results.forEach(result => {
      result.connections.forEach(connection => {
        const key = `${connection.source.name}-${result.metricName}`;
        if (!groupedBySource[key]) {
          groupedBySource[key] = {
            source: connection.source,
            targets: [],
            granularity: result.metricName
          };
        }
        groupedBySource[key].targets.push({
          target: connection.target,
          metricValue: connection.metricValue.split(': ')[1], // Extract just the value
          metricName: connection.metricValue.split(': ')[0]  // Extract just the name
        });
      });
    });

    return Object.values(groupedBySource);
  }

  exportData(): void {
    // Placeholder for export functionality
    console.log('Exporting edge data...');
  }

  debugAuthentication(): void {
    console.log('=== DEBUGGING AUTHENTICATION STATE ===');
    this.authService.debugAuthState();
    this.gcpMonitoringService.debugAuthAndProject();
    console.log('====================================');
  }

  forceReAuthentication(): void {
    console.log('Forcing re-authentication to grant necessary monitoring scopes...');
    this.authService.forceReAuthentication();
  }
}
