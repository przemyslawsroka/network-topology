import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GcpMonitoringService, TimeSeriesData } from '../../../core/services/gcp-monitoring.service';

export interface Connection {
  source: string;
  target: string;
  metricValue: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricDataService {

  constructor(private gcpMonitoringService: GcpMonitoringService) { }

  getMetricData(edgeType: string, metric: string): Observable<Connection[]> {
    console.log(`Fetching real GCP metric data for edgeType: ${edgeType}, metric: ${metric}`);
    
    const metricType = this.getMetricType(metric);
    const filter = this.buildMetricFilter(metricType, edgeType);
    
    // Set time range for the last 5 minutes
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    const aggregation = {
      alignmentPeriod: '60s',
      perSeriesAligner: 'ALIGN_RATE',
      crossSeriesReducer: 'REDUCE_SUM',
      groupByFields: [
        'resource.label.instance_id',
        'resource.label.zone'
      ]
    };

    return this.gcpMonitoringService.listTimeSeries(
      filter,
      startTime.toISOString(),
      endTime.toISOString(),
      aggregation
    ).pipe(
      map(response => this.transformTimeSeriesData(response.timeSeries, metric)),
      catchError(error => {
        console.error('Failed to fetch GCP monitoring data:', error);
        // Fallback to mock data if real API fails
        console.log('Falling back to mock data...');
        return of(this.generateMockData(edgeType, metric));
      })
    );
  }

  private getMetricType(metric: string): string {
    const metricTypeMap: { [key: string]: string } = {
      'traffic': 'networking.googleapis.com/vm_flow/egress_bytes_count',
      'latency': 'networking.googleapis.com/vm_flow/rtt',
      'packet_loss': 'networking.googleapis.com/vm_flow/packet_loss'
    };
    return metricTypeMap[metric] || metricTypeMap['traffic'];
  }

  private buildMetricFilter(metricType: string, edgeType: string): string {
    let filter = `metric.type="${metricType}"`;
    
    // Add resource type filter based on edge type
    if (edgeType !== 'all') {
      switch (edgeType) {
        case 'vm_to_vm':
          filter += ' AND resource.type="gce_instance"';
          break;
        case 'external_to_lb':
          filter += ' AND resource.type="https_lb_rule"';
          break;
        case 'lb_to_backend':
          filter += ' AND resource.type="backend_service"';
          break;
        case 'vm_to_vpn':
          filter += ' AND resource.type="vpn_tunnel"';
          break;
      }
    }
    
    return filter;
  }

  private transformTimeSeriesData(timeSeries: TimeSeriesData[], metricType: string): Connection[] {
    if (!timeSeries || timeSeries.length === 0) {
      console.log('No time series data received, generating mock data');
      return this.generateMockData('all', metricType);
    }

    const connections: Connection[] = [];
    
    timeSeries.forEach(series => {
      if (series.points && series.points.length > 0) {
        // Get the most recent data point
        const latestPoint = series.points[0];
        
        // Extract source and target from labels
        const sourceLabel = series.resource.labels['instance_id'] || 
                           series.resource.labels['backend_service'] || 
                           series.metric.labels['source_vm'] || 
                           'unknown-source';
        
        const targetLabel = series.metric.labels['target_vm'] || 
                           series.metric.labels['destination'] ||
                           series.resource.labels['zone'] || 
                           'unknown-target';
        
        // Format the metric value
        let metricValue = 'N/A';
        if (latestPoint.value.doubleValue !== undefined) {
          metricValue = this.formatMetricValue(latestPoint.value.doubleValue, metricType);
        } else if (latestPoint.value.int64Value !== undefined) {
          metricValue = this.formatMetricValue(parseFloat(latestPoint.value.int64Value), metricType);
        }
        
        connections.push({
          source: sourceLabel,
          target: targetLabel,
          metricValue: metricValue
        });
      }
    });

    // If no connections were extracted, fall back to mock data
    if (connections.length === 0) {
      console.log('No connections extracted from time series data, generating mock data');
      return this.generateMockData('all', metricType);
    }
    
    return connections;
  }

  private formatMetricValue(value: number, metricType: string): string {
    switch (metricType) {
      case 'traffic':
        // Convert bytes to appropriate unit
        if (value >= 1e9) {
          return `${(value / 1e9).toFixed(2)} GB`;
        } else if (value >= 1e6) {
          return `${(value / 1e6).toFixed(2)} MB`;
        } else if (value >= 1e3) {
          return `${(value / 1e3).toFixed(2)} KB`;
        } else {
          return `${value.toFixed(0)} B`;
        }
      case 'latency':
        // Convert to milliseconds
        return `${(value * 1000).toFixed(1)}ms`;
      case 'packet_loss':
        // Convert to percentage
        return `${(value * 100).toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  }

  private generateMockData(edgeType: string, metric: string): Connection[] {
    const baseConnections = [
      { source: 'web-server-1', target: 'db-server' },
      { source: 'load-balancer', target: 'web-server-1' },
      { source: 'web-server-2', target: 'cache-server' },
      { source: 'api-gateway', target: 'load-balancer' },
      { source: 'frontend-lb', target: 'web-server-1' },
      { source: 'web-server-1', target: 'redis-cache' },
      { source: 'monitoring-vm', target: 'log-server' },
      { source: 'backup-service', target: 'storage-vm' }
    ];

    // Filter connections based on edge type
    let filteredConnections = baseConnections;
    if (edgeType !== 'all') {
      // For demo purposes, we'll show a subset for specific edge types
      filteredConnections = baseConnections.slice(0, Math.max(3, Math.floor(Math.random() * 6) + 2));
    }

    // Generate metric values based on metric type
    return filteredConnections.map(conn => ({
      ...conn,
      metricValue: this.generateMetricValue(metric)
    }));
  }

  private generateMetricValue(metric: string): string {
    switch (metric) {
      case 'traffic':
        const bytes = Math.random() * 5000 + 100; // 100-5100 MB
        return bytes > 1000 ? `${(bytes / 1000).toFixed(1)} GB` : `${bytes.toFixed(0)} MB`;
        
      case 'latency':
        const latency = Math.random() * 100 + 0.5; // 0.5-100.5 ms
        return `${latency.toFixed(1)}ms`;
        
      case 'packet_loss':
        const loss = Math.random() * 5; // 0-5%
        return `${loss.toFixed(2)}%`;
        
      default:
        return 'N/A';
    }
  }
}
