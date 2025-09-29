import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  FlowLogsDataService,
  FlowLogConnection,
  FlowLogQueryResult,
  Granularity,
  FlowLogsConfig
} from '../../services/flow-logs-data.service';

export interface FlatFlowLogConnection extends FlowLogConnection {
  granularity: string;
}

interface QuerySummary {
  totalLatency: number;
  totalSuccess: boolean;
  results: Array<{
    granularity: string;
    latency: number;
    success: boolean;
    errorMessage?: string;
    totalRows?: number;
    bytesProcessed?: number;
  }>;
}

@Component({
  selector: 'app-flow-logs-explorer-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './flow-logs-explorer-view.component.html',
  styleUrls: ['./flow-logs-explorer-view.component.scss']
})
export class FlowLogsExplorerViewComponent implements OnInit {

  connections: FlatFlowLogConnection[] = [];
  displayedColumns: string[] = ['source', 'granularity', 'target', 'bytes', 'packets', 'flows'];

  allGranularities: Granularity[] = [];
  selectedGranularities: Granularity[] = [];

  // BigQuery configuration
  datasetPath: string = 'net-top-viz-demo-208511.VPCFlowLogs.vpc_flows';
  config: FlowLogsConfig | null = null;
  isConfigValid: boolean = false;
  configError: string = '';

  // Time range selection
  timeRangeHours: number = 1;
  timeRangeOptions = [
    { value: 1, label: 'Last Hour' },
    { value: 6, label: 'Last 6 Hours' },
    { value: 24, label: 'Last 24 Hours' },
    { value: 168, label: 'Last 7 Days' }
  ];

  querySummary: QuerySummary | null = null;
  isLoading: boolean = false;

  constructor(private flowLogsDataService: FlowLogsDataService) {}

  ngOnInit(): void {
    // Load available granularities
    this.allGranularities = this.flowLogsDataService.getAvailableGranularities();
    
    // Select first 3 granularities by default
    this.selectedGranularities = this.allGranularities.slice(0, 3);

    // Validate initial dataset path
    this.validateAndSetConfig();
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
      this.configError = '';
    } else {
      this.config = null;
      this.isConfigValid = false;
      this.configError = validation.error || 'Invalid configuration';
    }
  }

  /**
   * Toggle granularity selection
   */
  toggleGranularity(granularity: Granularity): void {
    const index = this.selectedGranularities.findIndex(g => g.displayName === granularity.displayName);
    
    if (index >= 0) {
      this.selectedGranularities.splice(index, 1);
    } else {
      this.selectedGranularities.push(granularity);
    }
  }

  /**
   * Check if granularity is selected
   */
  isGranularitySelected(granularity: Granularity): boolean {
    return this.selectedGranularities.some(g => g.displayName === granularity.displayName);
  }

  /**
   * Fetch flow logs data from BigQuery
   */
  fetchData(): void {
    if (!this.config || !this.isConfigValid) {
      console.error('Invalid BigQuery configuration');
      return;
    }

    if (this.selectedGranularities.length === 0) {
      console.error('No granularities selected');
      return;
    }

    this.isLoading = true;
    const startTime = Date.now();

    this.flowLogsDataService.getFlowLogData(
      this.config,
      this.selectedGranularities,
      this.timeRangeHours
    ).subscribe({
      next: (results: FlowLogQueryResult[]) => {
        const endTime = Date.now();
        this.connections = this.flattenConnections(results);

        this.querySummary = {
          totalLatency: endTime - startTime,
          totalSuccess: results.every(r => r.success),
          results: results.map(r => ({
            granularity: r.granularityName,
            latency: r.latency,
            success: r.success,
            errorMessage: r.error,
            totalRows: r.totalRows,
            bytesProcessed: r.bytesProcessed
          }))
        };

        this.isLoading = false;
        console.log(`Loaded ${this.connections.length} flow log connections`);
      },
      error: (error) => {
        const endTime = Date.now();
        this.querySummary = {
          totalLatency: endTime - startTime,
          totalSuccess: false,
          results: []
        };
        this.isLoading = false;
        console.error('Error fetching flow logs:', error);
      }
    });
  }

  /**
   * Flatten connections from all query results
   */
  private flattenConnections(results: FlowLogQueryResult[]): FlatFlowLogConnection[] {
    const connections: FlatFlowLogConnection[] = [];

    results.forEach(result => {
      result.connections.forEach(conn => {
        connections.push({
          ...conn,
          granularity: result.granularityName
        });
      });
    });

    return connections;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    return this.flowLogsDataService.formatBytes(bytes);
  }

  /**
   * Format number with commas
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Get entity type icon
   */
  getEntityIcon(type: string): string {
    const normalizedType = type.toLowerCase();
    
    if (normalizedType.includes('instance')) return 'computer';
    if (normalizedType.includes('subnet')) return 'lan';
    if (normalizedType.includes('vpc')) return 'cloud';
    if (normalizedType.includes('zone')) return 'location_on';
    if (normalizedType.includes('region')) return 'public';
    if (normalizedType.includes('ip') || normalizedType.includes('external')) return 'language';
    
    return 'device_hub';
  }

  /**
   * Get successful queries count
   */
  getSuccessfulQueriesCount(): number {
    if (!this.querySummary) return 0;
    return this.querySummary.results.filter(r => r.success).length;
  }

  /**
   * Export data to CSV
   */
  exportData(): void {
    if (this.connections.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = ['Source Name', 'Source Type', 'Target Name', 'Target Type', 'Granularity', 'Bytes', 'Packets', 'Flows'];
    const rows = this.connections.map(conn => [
      conn.source.name,
      conn.source.type,
      conn.target.name,
      conn.target.type,
      conn.granularity,
      conn.bytes.toString(),
      conn.packets.toString(),
      conn.flows.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vpc-flow-logs-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}