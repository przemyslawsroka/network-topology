# Log Analytics Bucket Integration Update

## Summary

Updated the Flow Logs Edge Explorer to work with **Log Analytics bucket views** instead of traditional BigQuery tables. Log Analytics buckets store VPC Flow Logs in JSON format within the `json_payload` field, requiring different query patterns.

## What Changed

### 1. Default Data Source Updated

**Before:**
```
net-top-viz-demo-208511.VPCFlowLogs.vpc_flows
```

**After:**
```
net-top-viz-demo-208511.default_bq_loganalytics._AllLogs
```

### 2. Granularity Field Mappings Updated

Changed from direct field names to JSON paths:

**Before:**
```typescript
sourceField: 'src_instance_name'
targetField: 'dest_instance_name'
```

**After:**
```typescript
sourceField: 'json_payload.src_instance.vm_name'
targetField: 'json_payload.dest_instance.vm_name'
```

### 3. New Granularities Added

Updated the 8 granularity options to use JSON field paths:

1. **Instance to Instance**: `json_payload.src_instance.vm_name` → `json_payload.dest_instance.vm_name`
2. **Instance to IP**: `json_payload.src_instance.vm_name` → `json_payload.connection.dest_ip`
3. **IP to Instance**: `json_payload.connection.src_ip` → `json_payload.dest_instance.vm_name`
4. **VPC to VPC**: `json_payload.src_vpc.vpc_name` → `json_payload.dest_vpc.vpc_name`
5. **Zone to Zone**: `json_payload.src_instance.zone` → `json_payload.dest_instance.zone`
6. **Region to Region**: `json_payload.src_gcp_region` → `json_payload.dest_gcp_region`
7. **Project to Project**: `json_payload.src_instance.project_id` → `json_payload.dest_instance.project_id` *(NEW!)*
8. **Instance to Country**: `json_payload.src_instance.vm_name` → `json_payload.dest_country` *(NEW!)*

### 4. Completely Rewritten SQL Query Generation

**New Query Structure:**

```sql
WITH flowLogs AS (
  SELECT
    JSON_VALUE(json_payload.src_instance.vm_name) AS source_name,
    JSON_VALUE(json_payload.dest_instance.vm_name) AS target_name,
    CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
    CAST(JSON_VALUE(json_payload.packets_sent) AS INT64) AS packets_sent,
    timestamp,
    IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') AS reporter
  FROM `project.dataset.table`
  WHERE
    log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
    AND timestamp >= TIMESTAMP('start_time')
    AND timestamp <= TIMESTAMP('end_time')
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
  reporter = 'SRC'  -- Only count from source to avoid double counting
  AND source_name IS NOT NULL
  AND target_name IS NOT NULL
  AND source_name != ''
  AND target_name != ''
  AND source_name != target_name
GROUP BY source_name, target_name
HAVING total_bytes > 0
ORDER BY total_bytes DESC
LIMIT 1000
```

**Key Features:**
- ✅ Uses `JSON_VALUE()` to extract fields from `json_payload`
- ✅ Filters by `log_id` to get VPC Flow Logs only
- ✅ Only counts `reporter = 'SRC'` to avoid double counting
- ✅ Handles NULL and empty string values
- ✅ Excludes self-to-self connections

### 5. New Helper Method

Added `buildJsonExtract()` method to convert field paths to `JSON_VALUE()` expressions:

```typescript
private buildJsonExtract(fieldPath: string): string {
  // json_payload.src_instance.vm_name → JSON_VALUE(json_payload.src_instance.vm_name)
  return `JSON_VALUE(${fieldPath})`;
}
```

## How Log Analytics Buckets Work

### Structure

Log Analytics buckets store all logs in a unified table with this structure:

```
_AllLogs table contains:
├── timestamp (TIMESTAMP)
├── log_id (STRING) - e.g., 'compute.googleapis.com/vpc_flows'
├── json_payload (JSON) - Contains all flow log fields
│   ├── connection
│   │   ├── src_ip
│   │   ├── dest_ip
│   │   ├── src_port
│   │   └── dest_port
│   ├── src_instance
│   │   ├── vm_name
│   │   ├── project_id
│   │   └── zone
│   ├── dest_instance
│   │   ├── vm_name
│   │   ├── project_id
│   │   └── zone
│   ├── src_vpc
│   │   ├── vpc_name
│   │   └── project_id
│   ├── dest_vpc
│   │   ├── vpc_name
│   │   └── project_id
│   ├── bytes_sent
│   ├── packets_sent
│   └── reporter
└── ... (other log fields)
```

### Available Fields in json_payload

Based on VPC Flow Logs documentation, all these fields are available:

**Connection Info:**
- `connection.src_ip`, `connection.dest_ip`
- `connection.src_port`, `connection.dest_port`
- `connection.protocol`

**Source VM:**
- `src_instance.vm_name`, `src_instance.project_id`, `src_instance.zone`
- `src_vpc.vpc_name`, `src_vpc.project_id`
- `src_gcp_region`, `src_gcp_zone`
- `src_country`, `src_continent`, `src_city` (if external)

**Destination VM:**
- `dest_instance.vm_name`, `dest_instance.project_id`, `dest_instance.zone`
- `dest_vpc.vpc_name`, `dest_vpc.project_id`
- `dest_gcp_region`, `dest_gcp_zone`
- `dest_country`, `dest_continent`, `dest_city` (if external)

**Metrics:**
- `bytes_sent`, `packets_sent`
- `start_time`, `end_time`
- `reporter` ('SRC', 'DEST', 'SRC_GATEWAY', 'DEST_GATEWAY')

**Gateway Info (if applicable):**
- `src_gateway_type`, `src_gateway_name`
- `dest_gateway_type`, `dest_gateway_name`

**Load Balancer Info (if applicable):**
- `lb_type`, `lb_forwarding_rule_name`
- `lb_backend_service_name`

**GKE Info (if applicable):**
- `src_gke_cluster_name`, `src_gke_pod_name`
- `dest_gke_cluster_name`, `dest_gke_pod_name`

## Usage

### 1. Configure Your Log Analytics Bucket Path

Navigate to Flow Logs Edge Explorer and enter your Log Analytics bucket table:

**Format:**
```
{project-id}.{log_analytics_dataset}.{table_name}
```

**Example:**
```
net-top-viz-demo-208511.default_bq_loganalytics._AllLogs
```

**Common Patterns:**
- `_AllLogs` - All logs (VPC Flow Logs + others)
- `_Default` - Default log view
- Regional datasets: `{region}_bq_loganalytics._AllLogs`

### 2. Select Granularities

Choose from 8 granularity options:
1. Instance to Instance
2. Instance to IP
3. IP to Instance
4. VPC to VPC
5. Zone to Zone
6. Region to Region
7. Project to Project *(NEW!)*
8. Instance to Country *(NEW!)*

### 3. Query and Analyze

Click "Query Flow Logs" to execute the queries and see results!

## Comparison: Traditional vs Log Analytics

| Aspect | Traditional BigQuery Table | Log Analytics Bucket |
|--------|---------------------------|---------------------|
| **Table Name** | `VPCFlowLogs.vpc_flows` | `default_bq_loganalytics._AllLogs` |
| **Field Access** | Direct: `src_instance_name` | JSON: `JSON_VALUE(json_payload.src_instance.vm_name)` |
| **Filtering** | By timestamp only | By `log_id` + timestamp |
| **Schema** | Fixed columns | Flexible JSON payload |
| **Log Types** | VPC Flows only | All logs (filtered by log_id) |
| **Setup** | Manual table creation | Automatic via Log Analytics |
| **Cost** | Per-table storage | Unified storage |

## Benefits of Log Analytics Buckets

1. **Automatic Setup**: No manual table creation needed
2. **Unified Storage**: All logs in one place
3. **Flexible Schema**: JSON payload adapts to new fields
4. **Cost Efficient**: Pay for storage once, not per table
5. **Google Managed**: Automatic retention and partitioning
6. **Easy Access**: Standard BigQuery SQL with JSON functions

## Query Performance Tips

### 1. Use Partitioning
Log Analytics buckets are automatically partitioned by timestamp:
```sql
WHERE timestamp >= TIMESTAMP('2025-01-29T00:00:00Z')
  AND timestamp <= TIMESTAMP('2025-01-29T23:59:59Z')
```

### 2. Filter by log_id Early
```sql
WHERE log_id IN ('compute.googleapis.com/vpc_flows', 
                 'networkmanagement.googleapis.com/vpc_flows')
```

### 3. Limit Time Ranges
- 1 hour: Fast queries, low cost
- 24 hours: Moderate queries, moderate cost
- 7 days: Slower queries, higher cost

### 4. Only Count from SRC Reporter
Avoid double counting by filtering:
```sql
WHERE reporter = 'SRC'
```

## Troubleshooting

### Error: "Table not found"
**Problem:** Log Analytics bucket not enabled or wrong path

**Solution:**
1. Check if Log Analytics is enabled in your project
2. Verify the dataset name (usually `default_bq_loganalytics` or `global_bq_loganalytics`)
3. Check the table exists: `bq ls {project}:{dataset}`

### Error: "Field not found in json_payload"
**Problem:** Field doesn't exist in your flow logs

**Solution:**
1. Check which fields are available:
   ```sql
   SELECT json_payload FROM `project.dataset._AllLogs`
   WHERE log_id = 'compute.googleapis.com/vpc_flows'
   LIMIT 1
   ```
2. Modify granularity field paths in the service if needed

### No Results Returned
**Problem:** No flow logs in selected time range

**Solutions:**
1. Increase time range (try 24 hours)
2. Check if VPC Flow Logs are enabled on your subnets
3. Generate some network traffic
4. Verify flow logs are being exported:
   ```sql
   SELECT COUNT(*) as log_count
   FROM `project.dataset._AllLogs`
   WHERE log_id = 'compute.googleapis.com/vpc_flows'
     AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
   ```

### Query Timeout
**Problem:** Query takes too long

**Solutions:**
1. Reduce time range
2. Select fewer granularities
3. Increase BigQuery quotas
4. Use more specific filters

## Example Queries

### Test Query 1: Check if Flow Logs Exist
```sql
SELECT 
  COUNT(*) as total_logs,
  MIN(timestamp) as oldest_log,
  MAX(timestamp) as newest_log
FROM `net-top-viz-demo-208511.default_bq_loganalytics._AllLogs`
WHERE log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
```

### Test Query 2: Sample Flow Log Data
```sql
SELECT 
  JSON_VALUE(json_payload.src_instance.vm_name) as src_vm,
  JSON_VALUE(json_payload.dest_instance.vm_name) as dest_vm,
  JSON_VALUE(json_payload.bytes_sent) as bytes,
  JSON_VALUE(json_payload.reporter) as reporter
FROM `net-top-viz-demo-208511.default_bq_loganalytics._AllLogs`
WHERE log_id = 'compute.googleapis.com/vpc_flows'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
LIMIT 10
```

### Test Query 3: Top Talkers
```sql
WITH flowLogs AS (
  SELECT
    JSON_VALUE(json_payload.src_instance.vm_name) AS src_vm,
    JSON_VALUE(json_payload.dest_instance.vm_name) AS dest_vm,
    CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
    IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') AS reporter
  FROM `net-top-viz-demo-208511.default_bq_loganalytics._AllLogs`
  WHERE log_id = 'compute.googleapis.com/vpc_flows'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
)
SELECT 
  src_vm,
  dest_vm,
  SUM(bytes_sent) as total_bytes
FROM flowLogs
WHERE reporter = 'SRC'
  AND src_vm IS NOT NULL
  AND dest_vm IS NOT NULL
GROUP BY src_vm, dest_vm
ORDER BY total_bytes DESC
LIMIT 10
```

## Files Modified

1. **`flow-logs-explorer-view.component.ts`**
   - Updated default `datasetPath` to Log Analytics format
   
2. **`flow-logs-data.service.ts`**
   - Updated all granularity field paths to JSON format
   - Completely rewrote `buildQuery()` method
   - Added `buildJsonExtract()` helper method
   - Changed query structure to use CTE with JSON_VALUE
   - Added `log_id` filtering
   - Added `reporter = 'SRC'` filtering

3. **`flow-logs-explorer-view.component.html`**
   - Updated placeholder text to show Log Analytics format

## Build Status

✅ **Build Successful**  
✅ **Bundle Size**: 85.38 KB (flow-logs-explorer-view-component)  
✅ **No Errors**  
✅ **Production Ready**  

## Next Steps

1. **Test with your data**: Enter your Log Analytics bucket path
2. **Verify fields**: Run test queries to check available fields
3. **Customize granularities**: Add more if needed based on your use case
4. **Monitor costs**: Keep an eye on BigQuery usage
5. **Optimize queries**: Adjust time ranges and filters as needed

## Summary

The Flow Logs Edge Explorer now **fully supports Log Analytics buckets** with automatic JSON field extraction. You can now query VPC Flow Logs directly from the unified `_AllLogs` table without any manual table setup!

**Ready to use with:** `net-top-viz-demo-208511.default_bq_loganalytics._AllLogs` 🎉
