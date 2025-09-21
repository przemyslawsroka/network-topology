import { Injectable } from '@angular/core';
import { forkJoin, of, Observable, timer } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { GcpMonitoringService, MonitoringApiResponse, TimeSeriesData } from '../../../core/services/gcp-monitoring.service';
import { APP_CONFIG } from '../../../core/config/app.config';
import { GcpAuthService } from '../../../core/services/gcp-auth.service';

export interface Connection {
  source: { name: string; type: string };
  target: { name: string; type: string };
  metricValue: string;
}

export interface MetricQueryResult {
  connections: Connection[];
  latency: number;
  success: boolean;
  metricName: string;
  error?: string;
}

interface Granularity {
  displayName: string;
  sourceField: string;
  targetField: string;
  sourceType: string; // e.g., 'VM', 'Zone'
  targetType: string; // e.g., 'External', 'Zone'
}

interface MetricConfig {
  metricType: string;
  resourceType: string;
  granularities: Granularity[];
}

@Injectable({
  providedIn: 'root'
})
export class MetricDataService {

  private readonly METRIC_CONFIGS: MetricConfig[] = [
    {
      metricType: 'networking.googleapis.com/vm_flow/egress_bytes_count',
      resourceType: 'gce_instance',
      granularities: [
        { displayName: 'VM to External', sourceField: 'resource.labels.instance_id', targetField: 'metric.labels.remote_location_type', sourceType: 'VM', targetType: 'External' },
        { displayName: 'VM to Zone', sourceField: 'resource.labels.instance_id', targetField: 'resource.labels.zone', sourceType: 'VM', targetType: 'Zone' },
        { displayName: 'Zone to Zone', sourceField: 'resource.labels.zone', targetField: 'metric.labels.remote_location_type', sourceType: 'Zone', targetType: 'External' }
      ]
    },
    {
      metricType: 'loadbalancing.googleapis.com/https/request_bytes_count',
      resourceType: 'https_lb_rule',
      granularities: [
        { displayName: 'External to LB', sourceField: 'metric.labels.remote_country', targetField: 'resource.labels.forwarding_rule_name', sourceType: 'External', targetType: 'Load Balancer' }
      ]
    },
    {
      metricType: 'loadbalancing.googleapis.com/https/backend_request_bytes_count',
      resourceType: 'https_lb_rule',
      granularities: [
        { displayName: 'LB to Backend', sourceField: 'resource.labels.backend_name', targetField: 'resource.labels.backend_zone', sourceType: 'Load Balancer', targetType: 'Backend' }
      ]
    },
    {
      metricType: 'networking.googleapis.com/vm_flow/rtt',
      resourceType: 'gce_instance',
      granularities: [
        { displayName: 'VM to VM Latency', sourceField: 'resource.labels.instance_id', targetField: 'metric.labels.remote_instance_id', sourceType: 'VM', targetType: 'VM' }
      ]
    }
  ];

  constructor(private gcpMonitoringService: GcpMonitoringService) { }

  getMetricData(): Observable<MetricQueryResult[]> {
    console.log(`Fetching all relevant GCP metrics`);
    
    const requests: Observable<MetricQueryResult>[] = [];
    this.METRIC_CONFIGS.forEach(config => {
      config.granularities.forEach(granularity => {
        requests.push(this.fetchSingleMetric(config, granularity));
      });
    });

    return forkJoin(requests).pipe(
      map(results => results.filter(r => r.connections.length > 0)) // Filter out empty results
    );
  }

  private fetchSingleMetric(config: MetricConfig, granularity: Granularity): Observable<MetricQueryResult> {
    const requestStartTime = Date.now();
    const filter = `metric.type="${config.metricType}" AND resource.type="${config.resourceType}"`;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour

    const aggregation = {
      alignmentPeriod: '3600s',
      perSeriesAligner: 'ALIGN_SUM',
      crossSeriesReducer: 'REDUCE_SUM',
      groupByFields: [granularity.sourceField, granularity.targetField]
    };

    return this.gcpMonitoringService.listTimeSeries(
      filter,
      startTime.toISOString(),
      endTime.toISOString(),
      aggregation
    ).pipe(
      map((response: MonitoringApiResponse) => ({
        connections: this.transformTimeSeriesData(response.timeSeries, config, granularity),
        latency: Date.now() - requestStartTime,
        success: true,
        metricName: granularity.displayName
      })),
      catchError((error: any) => {
        console.warn(`Query failed for ${granularity.displayName}:`, error.message);
        return of({
          connections: [],
          latency: Date.now() - requestStartTime,
          success: false,
          metricName: granularity.displayName,
          error: error.message || 'Unknown error'
        });
      })
    );
  }

  private transformTimeSeriesData(timeSeries: TimeSeriesData[], config: MetricConfig, granularity: Granularity): Connection[] {
    if (!timeSeries) {
      return [];
    }

    const connections: Connection[] = [];
    
    timeSeries.forEach(series => {
      if (series.points && series.points.length > 0) {
        const latestPoint = series.points[0];
        
        const sourceLabel = this.getLabelValue(series, granularity.sourceField);
        const targetLabel = this.getLabelValue(series, granularity.targetField);
        
        let metricValue = 'N/A';
        if (latestPoint.value.doubleValue !== undefined) {
          metricValue = this.formatMetricValue(latestPoint.value.doubleValue, config.metricType);
        } else if (latestPoint.value.int64Value !== undefined) {
          metricValue = this.formatMetricValue(parseFloat(latestPoint.value.int64Value), config.metricType);
        }
        
        connections.push({
          source: { name: sourceLabel, type: granularity.sourceType },
          target: { name: targetLabel, type: granularity.targetType },
          metricValue: `${this.getMetricShortName(config.metricType)}: ${metricValue}`
        });
      }
    });

    return connections;
  }

  private getMetricShortName(metricType: string): string {
    const parts = metricType.split('/');
    return parts[parts.length - 1];
  }

  private getLabelValue(series: TimeSeriesData, field: string): string {
    const [source, type, ...rest] = field.split('.');
    const key = rest.join('.');
    
    if (source === 'resource' && series.resource.labels && series.resource.labels[key]) {
      return series.resource.labels[key];
    }
    if (source === 'metric' && series.metric.labels && series.metric.labels[key]) {
      return series.metric.labels[key];
    }
    return `unknown-${key}`;
  }

  private formatMetricValue(value: number, metricType: string): string {
    if (metricType.includes('bytes_count')) {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB`;
      return `${value.toFixed(0)} B`;
    } else if (metricType.includes('rtt') || metricType.includes('latencies')) {
      return `${value.toFixed(2)} ms`;
    } else {
      return value.toFixed(2);
    }
  }

  private generateMockData(): Connection[] {
    const baseConnections: Connection[] = [
      { 
        source: { name: 'web-server-1', type: 'VM' }, 
        target: { name: 'db-server', type: 'VM' }, 
        metricValue: `egress_bytes_count: 1.2 GB` 
      },
      { 
        source: { name: 'load-balancer', type: 'LB' }, 
        target: { name: 'web-server-1', type: 'VM' }, 
        metricValue: `request_bytes_count: 500 MB` 
      },
      { 
        source: { name: 'api-gateway', type: 'Gateway' }, 
        target: { name: 'load-balancer', type: 'LB' }, 
        metricValue: `request_bytes_count: 2.1 GB` 
      }
    ];
    return baseConnections;
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
