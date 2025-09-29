import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GcpBigQueryService, BigQueryResponse } from '../../../core/services/gcp-bigquery.service';

export interface FlowLogConnection {
  source: { name: string; type: string };
  target: { name: string; type: string };
  bytes: number;
  packets: number;
  flows: number;
}

export interface FlowLogQueryResult {
  connections: FlowLogConnection[];
  latency: number;
  success: boolean;
  granularityName: string;
  error?: string;
  totalRows?: number;
  bytesProcessed?: number;
}

export interface Granularity {
  displayName: string;
  sourceField: string;
  targetField: string;
  sourceType: string;
  targetType: string;
  description: string;
}

export interface FlowLogsConfig {
  projectId: string;
  datasetId: string;
  tableId: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlowLogsDataService {

  // Define available granularities for VPC Flow Logs analysis
  // Using JSON field paths for Log Analytics bucket views
  private readonly GRANULARITIES: Granularity[] = [
    {
      displayName: 'Instance to Instance',
      sourceField: 'json_payload.src_instance.vm_name',
      targetField: 'json_payload.dest_instance.vm_name',
      sourceType: 'Instance',
      targetType: 'Instance',
      description: 'Direct instance-to-instance communication'
    },
    {
      displayName: 'Instance to IP',
      sourceField: 'json_payload.src_instance.vm_name',
      targetField: 'json_payload.connection.dest_ip',
      sourceType: 'Instance',
      targetType: 'IP Address',
      description: 'Instance to specific IP address flows'
    },
    {
      displayName: 'IP to Instance',
      sourceField: 'json_payload.connection.src_ip',
      targetField: 'json_payload.dest_instance.vm_name',
      sourceType: 'IP Address',
      targetType: 'Instance',
      description: 'IP address to instance flows'
    },
    {
      displayName: 'VPC to VPC',
      sourceField: 'json_payload.src_vpc.vpc_name',
      targetField: 'json_payload.dest_vpc.vpc_name',
      sourceType: 'VPC',
      targetType: 'VPC',
      description: 'VPC-to-VPC traffic patterns'
    },
    {
      displayName: 'Zone to Zone',
      sourceField: 'json_payload.src_instance.zone',
      targetField: 'json_payload.dest_instance.zone',
      sourceType: 'Zone',
      targetType: 'Zone',
      description: 'Cross-zone traffic analysis'
    },
    {
      displayName: 'Region to Region',
      sourceField: 'json_payload.src_gcp_region',
      targetField: 'json_payload.dest_gcp_region',
      sourceType: 'Region',
      targetType: 'Region',
      description: 'Cross-region traffic flows'
    },
    {
      displayName: 'Project to Project',
      sourceField: 'json_payload.src_instance.project_id',
      targetField: 'json_payload.dest_instance.project_id',
      sourceType: 'Project',
      targetType: 'Project',
      description: 'Cross-project traffic flows'
    },
    {
      displayName: 'Instance to Country',
      sourceField: 'json_payload.src_instance.vm_name',
      targetField: 'json_payload.dest_country',
      sourceType: 'Instance',
      targetType: 'Country',
      description: 'Instance to external country'
    }
  ];

  constructor(private bigQueryService: GcpBigQueryService) {}

  getAvailableGranularities(): Granularity[] {
    return this.GRANULARITIES;
  }

  /**
   * Query VPC Flow Logs for selected granularities
   */
  getFlowLogData(
    config: FlowLogsConfig,
    selectedGranularities: Granularity[],
    timeRangeHours: number = 1
  ): Observable<FlowLogQueryResult[]> {
    console.log(`Fetching VPC Flow Logs for ${selectedGranularities.length} granularities`);

    if (!selectedGranularities || selectedGranularities.length === 0) {
      return of([]);
    }

    const requests: Observable<FlowLogQueryResult>[] = selectedGranularities.map(granularity =>
      this.fetchSingleGranularity(config, granularity, timeRangeHours)
    );

    return forkJoin(requests).pipe(
      map(results => results.filter(r => r.connections.length > 0))
    );
  }

  /**
   * Fetch data for a single granularity
   */
  private fetchSingleGranularity(
    config: FlowLogsConfig,
    granularity: Granularity,
    timeRangeHours: number
  ): Observable<FlowLogQueryResult> {
    const requestStartTime = Date.now();

    // Build the SQL query
    const query = this.buildQuery(config, granularity, timeRangeHours);

    return this.bigQueryService.query(query).pipe(
      map((response: BigQueryResponse) => {
        const connections = this.parseConnections(response, granularity);
        
        return {
          connections,
          latency: Date.now() - requestStartTime,
          success: true,
          granularityName: granularity.displayName,
          totalRows: parseInt(response.totalRows || '0', 10),
          bytesProcessed: parseInt(response.totalBytesProcessed || '0', 10)
        };
      }),
      catchError((error: any) => {
        console.warn(`Query failed for ${granularity.displayName}:`, error.message);
        return of({
          connections: [],
          latency: Date.now() - requestStartTime,
          success: false,
          granularityName: granularity.displayName,
          error: error.message || 'Unknown error'
        });
      })
    );
  }

  /**
   * Build BigQuery SQL for VPC Flow Logs from Log Analytics bucket
   */
  private buildQuery(
    config: FlowLogsConfig,
    granularity: Granularity,
    timeRangeHours: number
  ): string {
    const tableFQN = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    
    // Calculate time window
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000);

    // Format timestamps for BigQuery
    const startTimestamp = startTime.toISOString();
    const endTimestamp = endTime.toISOString();

    // Extract field names from JSON paths
    const sourceFieldExtract = this.buildJsonExtract(granularity.sourceField);
    const targetFieldExtract = this.buildJsonExtract(granularity.targetField);

    // Build query for Log Analytics bucket with JSON payload
    const query = `
      WITH flowLogs AS (
        SELECT
          ${sourceFieldExtract} AS source_name,
          ${targetFieldExtract} AS target_name,
          CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
          CAST(JSON_VALUE(json_payload.packets_sent) AS INT64) AS packets_sent,
          timestamp,
          IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') AS reporter
        FROM ${tableFQN}
        WHERE
          log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
          AND timestamp >= TIMESTAMP('${startTimestamp}')
          AND timestamp <= TIMESTAMP('${endTimestamp}')
          AND json_payload IS NOT NULL
      )
      SELECT
        source_name,
        target_name,
        SUM(bytes_sent) AS total_bytes,
        SUM(packets_sent) AS total_packets,
        COUNT(*) AS flow_count
      FROM flowLogs
      WHERE
        reporter = 'SRC'
        AND source_name IS NOT NULL
        AND target_name IS NOT NULL
        AND source_name != ''
        AND target_name != ''
        AND source_name != target_name
      GROUP BY
        source_name,
        target_name
      HAVING
        total_bytes > 0
      ORDER BY
        total_bytes DESC
      LIMIT 1000
    `;

    console.log(`BigQuery for ${granularity.displayName}:`, query);
    return query;
  }

  /**
   * Build JSON_VALUE extract expression from field path
   */
  private buildJsonExtract(fieldPath: string): string {
    // Field path format: json_payload.src_instance.vm_name
    // Need to convert to: JSON_VALUE(json_payload.src_instance.vm_name)
    return `JSON_VALUE(${fieldPath})`;
  }

  /**
   * Parse BigQuery response into FlowLogConnection objects
   */
  private parseConnections(
    response: BigQueryResponse,
    granularity: Granularity
  ): FlowLogConnection[] {
    const rows = this.bigQueryService.parseRows(response);

    return rows.map(row => ({
      source: {
        name: this.sanitizeValue(row['source_name']),
        type: granularity.sourceType
      },
      target: {
        name: this.sanitizeValue(row['target_name']),
        type: granularity.targetType
      },
      bytes: parseInt(row['total_bytes'] || '0', 10),
      packets: parseInt(row['total_packets'] || '0', 10),
      flows: parseInt(row['flow_count'] || '0', 10)
    }));
  }

  /**
   * Sanitize field values from BigQuery
   */
  private sanitizeValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return 'unknown';
    }
    return String(value);
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate BigQuery dataset/table path
   */
  validateDatasetPath(path: string): { valid: boolean; projectId?: string; datasetId?: string; tableId?: string; error?: string } {
    // Expected format: project-id.dataset-id.table-id
    const parts = path.split('.');
    
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid format. Expected: project-id.dataset-id.table-id'
      };
    }

    const [projectId, datasetId, tableId] = parts;

    if (!projectId || !datasetId || !tableId) {
      return {
        valid: false,
        error: 'All parts (project, dataset, table) must be non-empty'
      };
    }

    return {
      valid: true,
      projectId,
      datasetId,
      tableId
    };
  }
}
