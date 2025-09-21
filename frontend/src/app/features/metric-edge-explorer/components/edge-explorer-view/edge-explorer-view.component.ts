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
import { MetricDataService, Connection } from '../../services/metric-data.service';

interface QueryDetails {
  metric: string;
  query: string;
  latency: number;
  success: boolean;
  errorMessage?: string;
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
  
  connections: Connection[] = [];
  displayedColumns: string[] = ['source', 'target', 'metricValue'];
  
  selectedEdgeType: string = 'all';
  selectedMetric: string = 'traffic';
  
  queryDetails: QueryDetails | null = null;
  isLoading: boolean = false;

  constructor(private metricDataService: MetricDataService) { }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading = true;
    const startTime = Date.now();
    
    this.metricDataService.getMetricData(this.selectedEdgeType, this.selectedMetric)
      .subscribe({
        next: (data: Connection[]) => {
          const endTime = Date.now();
          this.connections = data;
          this.queryDetails = {
            metric: this.getMetricName(),
            query: this.generateQuery(),
            latency: endTime - startTime,
            success: true
          };
          this.isLoading = false;
        },
        error: (error) => {
          const endTime = Date.now();
          this.queryDetails = {
            metric: this.getMetricName(),
            query: this.generateQuery(),
            latency: endTime - startTime,
            success: false,
            errorMessage: error.message || 'Unknown error occurred'
          };
          this.isLoading = false;
        }
      });
  }

  private getMetricName(): string {
    const metricMap: { [key: string]: string } = {
      'traffic': 'networking.googleapis.com/vm_flow/egress_bytes_count',
      'latency': 'networking.googleapis.com/vm_flow/rtt',
      'packet_loss': 'networking.googleapis.com/vm_flow/packet_loss'
    };
    return metricMap[this.selectedMetric] || this.selectedMetric;
  }

  private generateQuery(): string {
    const metric = this.getMetricName();
    const edgeTypeFilter = this.selectedEdgeType !== 'all' ? `{edge_type="${this.selectedEdgeType}"}` : '';
    return `${metric}${edgeTypeFilter}[5m]`;
  }

  exportData(): void {
    // Placeholder for export functionality
    console.log('Exporting edge data...');
  }
}
