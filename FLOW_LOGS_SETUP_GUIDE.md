# VPC Flow Logs BigQuery Setup Guide

## Quick Start Guide

This guide will help you set up VPC Flow Logs in BigQuery and connect them to the Flow Logs Edge Explorer.

## Prerequisites

1. ✅ GCP Project with VPC Flow Logs enabled
2. ✅ BigQuery dataset created
3. ✅ VPC Flow Logs exported to BigQuery
4. ✅ OAuth2 authentication configured (already done)

## Step 1: Enable VPC Flow Logs

If not already enabled, enable VPC Flow Logs on your subnets:

```bash
# Enable flow logs on a subnet
gcloud compute networks subnets update SUBNET_NAME \
  --region=REGION \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=1.0 \
  --logging-metadata=include-all
```

Or via Console:
1. Go to **VPC Network** → **VPC networks**
2. Select your VPC
3. Click on a subnet
4. Click **EDIT**
5. Enable **Flow logs**
6. Set aggregation interval and sampling rate
7. Click **SAVE**

## Step 2: Create BigQuery Dataset

Create a dataset to store flow logs:

```bash
# Create dataset
bq mk --dataset \
  --location=US \
  YOUR_PROJECT_ID:VPCFlowLogs
```

Or via Console:
1. Go to **BigQuery** → **SQL Workspace**
2. Click **CREATE DATASET**
3. Dataset ID: `VPCFlowLogs`
4. Location: Choose your region
5. Click **CREATE DATASET**

## Step 3: Export VPC Flow Logs to BigQuery

### Option A: Via Cloud Console

1. Go to **VPC Network** → **VPC networks**
2. Select your VPC and subnet
3. Edit the subnet
4. Under **Flow logs**, click **Configure logs**
5. Select **BigQuery** as destination
6. Choose your dataset: `VPCFlowLogs`
7. Table name: `vpc_flows` (will be auto-created)
8. Click **SAVE**

### Option B: Via Logging Sink

Create a log sink to export flow logs to BigQuery:

```bash
# Create BigQuery sink for VPC Flow Logs
gcloud logging sinks create vpc-flow-logs-sink \
  bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/VPCFlowLogs \
  --log-filter='resource.type="gce_subnetwork" AND log_name:vpc_flows'
```

### Option C: Via Terraform

```hcl
resource "google_bigquery_dataset" "vpc_flow_logs" {
  dataset_id = "VPCFlowLogs"
  project    = var.project_id
  location   = "US"
}

resource "google_logging_project_sink" "vpc_flow_logs_sink" {
  name        = "vpc-flow-logs-sink"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.vpc_flow_logs.dataset_id}"
  
  filter = "resource.type=gce_subnetwork AND log_name:vpc_flows"

  bigquery_options {
    use_partitioned_tables = true
  }
}
```

## Step 4: Verify Flow Logs are Flowing

Wait 5-10 minutes for logs to start flowing, then check:

```bash
# Check if table exists
bq ls YOUR_PROJECT_ID:VPCFlowLogs

# Query sample data
bq query --use_legacy_sql=false \
'SELECT 
  COUNT(*) as total_flows,
  MIN(timestamp) as oldest_flow,
  MAX(timestamp) as newest_flow
FROM `YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows`'
```

You should see flow log records!

## Step 5: Understand the Schema

The auto-created table will have fields like:

```sql
jsonPayload.connection {
  src_ip: STRING
  dest_ip: STRING
  src_port: INTEGER
  dest_port: INTEGER
  protocol: INTEGER
}
jsonPayload.bytes_sent: INTEGER
jsonPayload.packets_sent: INTEGER
timestamp: TIMESTAMP
resource.labels.location: STRING
resource.labels.project_id: STRING
resource.labels.subnetwork_name: STRING
-- and more...
```

## Step 6: Create Optimized View (Recommended)

For better performance, create a flattened view:

```sql
CREATE OR REPLACE VIEW `YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows_flat` AS
SELECT
  timestamp,
  CAST(jsonPayload.bytes_sent AS INT64) as bytes_sent,
  CAST(jsonPayload.packets_sent AS INT64) as packets_sent,
  
  -- Source information
  jsonPayload.connection.src_ip as src_ip,
  CAST(jsonPayload.connection.src_port AS INT64) as src_port,
  jsonPayload.src_instance.vm_name as src_instance_name,
  jsonPayload.src_vpc.subnetwork_name as src_subnet_name,
  jsonPayload.src_vpc.vpc_name as src_vpc_name,
  resource.labels.location as src_zone,
  jsonPayload.src_location.region as src_region,
  
  -- Destination information  
  jsonPayload.connection.dest_ip as dest_ip,
  CAST(jsonPayload.connection.dest_port AS INT64) as dest_port,
  jsonPayload.dest_instance.vm_name as dest_instance_name,
  jsonPayload.dest_vpc.subnetwork_name as dest_subnet_name,
  jsonPayload.dest_vpc.vpc_name as dest_vpc_name,
  jsonPayload.dest_location.zone as dest_zone,
  jsonPayload.dest_location.region as dest_region,
  
  -- Protocol and action
  CAST(jsonPayload.connection.protocol AS INT64) as protocol,
  jsonPayload.reporter as reporter,
  
  -- Project info
  resource.labels.project_id as project_id

FROM `YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows`
WHERE jsonPayload IS NOT NULL
```

## Step 7: Use in Flow Logs Edge Explorer

1. Navigate to **Flow Logs Edge Explorer**
2. Enter your BigQuery table path:
   ```
   YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows_flat
   ```
   Or if you didn't create a view:
   ```
   YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows
   ```
3. Select time range (start with "Last Hour")
4. Expand "Select Granularities"
5. Check 2-3 granularities (e.g., Instance to Instance, Zone to Zone)
6. Click **Query Flow Logs**
7. View results!

## Common Issues and Solutions

### Issue: Table not found
**Solution:**
- Wait 10-15 minutes after enabling flow logs
- Check if logs are being exported: `gcloud logging read "resource.type=gce_subnetwork" --limit 10`
- Verify sink configuration

### Issue: No data in results
**Solution:**
- Generate some traffic in your VPC
- Increase time range to "Last 24 Hours"
- Check flow log sampling rate (set to 1.0 for all flows)

### Issue: Query too slow or expensive
**Solution:**
- Create partitioned table:
  ```sql
  CREATE TABLE `PROJECT.VPCFlowLogs.vpc_flows_partitioned`
  PARTITION BY DATE(timestamp)
  CLUSTER BY src_instance_name, dest_instance_name
  AS SELECT * FROM `PROJECT.VPCFlowLogs.vpc_flows`
  ```
- Use shorter time ranges
- Reduce sampling rate if too much data

### Issue: Missing field errors in queries
**Solution:**
- VPC Flow Logs schema varies slightly by GCP setup
- Modify the query in `flow-logs-data.service.ts` to match your schema
- Update field names in `buildQuery()` method

## Schema Customization

If your VPC Flow Logs have different field names, update the service:

Edit: `/frontend/src/app/features/flow-logs-edge-explorer/services/flow-logs-data.service.ts`

Find the `buildQuery()` method and adjust field names:

```typescript
const query = `
  SELECT
    ${granularity.sourceField} AS source_name,  -- Change field name here
    ${granularity.targetField} AS target_name,  -- Change field name here
    SUM(bytes_sent) AS total_bytes,             -- Change if your bytes field differs
    SUM(packets_sent) AS total_packets,         -- Change if your packets field differs
    COUNT(*) AS flow_count
  FROM ${tableFQN}
  WHERE
    timestamp >= TIMESTAMP('${startTimestamp}')
    AND timestamp <= TIMESTAMP('${endTimestamp}')
    -- Add your custom filters here
  ...
```

## Cost Optimization Tips

1. **Enable Partitioning**: Significantly reduces scan costs
   ```sql
   CREATE TABLE `PROJECT.VPCFlowLogs.vpc_flows`
   PARTITION BY DATE(timestamp)
   ```

2. **Use Clustering**: Improves query performance
   ```sql
   CLUSTER BY src_instance_name, dest_instance_name
   ```

3. **Set Expiration**: Auto-delete old logs
   ```sql
   ALTER TABLE `PROJECT.VPCFlowLogs.vpc_flows`
   SET OPTIONS (partition_expiration_days=30)
   ```

4. **Sample Flows**: Reduce volume (in VPC Flow Logs settings)
   - Set sampling to 0.1-0.5 for most use cases
   - 1.0 = capture all flows (can be expensive)

5. **Use Query Cache**: Enabled by default in the service

## Testing Your Setup

Run this test query to verify everything works:

```sql
SELECT
  src_instance_name,
  dest_instance_name,
  SUM(bytes_sent) as total_bytes,
  COUNT(*) as flow_count
FROM `YOUR_PROJECT_ID.VPCFlowLogs.vpc_flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND src_instance_name IS NOT NULL
  AND dest_instance_name IS NOT NULL
GROUP BY src_instance_name, dest_instance_name
ORDER BY total_bytes DESC
LIMIT 10
```

If this returns results, your setup is correct!

## Example: Complete Setup Script

```bash
#!/bin/bash

PROJECT_ID="your-project-id"
DATASET_ID="VPCFlowLogs"
REGION="us-central1"
SUBNET_NAME="default"

# Enable Flow Logs
gcloud compute networks subnets update $SUBNET_NAME \
  --region=$REGION \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all

# Create BigQuery Dataset
bq mk --dataset --location=US $PROJECT_ID:$DATASET_ID

# Create Log Sink
gcloud logging sinks create vpc-flow-logs-sink \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/$DATASET_ID \
  --log-filter='resource.type="gce_subnetwork" AND log_name:vpc_flows'

# Wait for data
echo "Waiting 10 minutes for flow logs to start..."
sleep 600

# Test query
bq query --use_legacy_sql=false \
"SELECT COUNT(*) as total_flows 
FROM \`$PROJECT_ID.$DATASET_ID.vpc_flows\`"

echo "Setup complete! Use this path in Flow Logs Edge Explorer:"
echo "$PROJECT_ID.$DATASET_ID.vpc_flows"
```

## Resources

- [VPC Flow Logs Documentation](https://cloud.google.com/vpc/docs/using-flow-logs)
- [BigQuery Documentation](https://cloud.google.com/bigquery/docs)
- [Flow Logs Schema Reference](https://cloud.google.com/vpc/docs/flow-logs#record_format)
- [BigQuery Pricing](https://cloud.google.com/bigquery/pricing)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify OAuth scopes include BigQuery
3. Ensure table path format: `project.dataset.table`
4. Check IAM permissions for BigQuery access

Happy analyzing! 🚀
