# GCP Monitoring API Integration Setup

This document explains how to set up and configure the Google Cloud Monitoring API integration for the Network Topology application.

## Overview

The application now integrates with the Google Cloud Monitoring API to fetch real-time network metrics data. The implementation includes:

- **GCP Authentication Service**: Handles OAuth 2.0 authentication and project configuration
- **GCP Monitoring Service**: Provides methods to query time series data and metrics
- **Metric Data Service**: Transforms raw monitoring data into connection information
- **Fallback Support**: Falls back to mock data when API calls fail

## Configuration

### 1. Project Setup

Update the project ID in `frontend/src/app/core/config/app.config.ts`:

```typescript
export const APP_CONFIG: AppConfig = {
  production: false,
  gcp: {
    projectId: 'your-actual-project-id', // Replace with your GCP project ID
    useRealApi: true,
    mockMode: false // Set to false when you have proper authentication
  },
  // ... other config
};
```

### 2. Authentication Setup

#### Option A: Service Account Key (Development)

1. Create a service account in your GCP project
2. Assign the `Monitoring Viewer` role
3. Download the service account key JSON file
4. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable

#### Option B: OAuth 2.0 (Production)

For production applications, implement OAuth 2.0 authentication flow:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Configure authorized JavaScript origins
3. Implement the OAuth flow in `GcpAuthService`

### 3. Enable Required APIs

Enable these APIs in your GCP project:
- Cloud Monitoring API
- Compute Engine API (if querying VM metrics)

## API Endpoints Used

The application uses the following GCP Monitoring API endpoints:

### 1. List Time Series
```
GET https://monitoring.googleapis.com/v3/projects/{projectId}/timeSeries
```

**Parameters:**
- `filter`: Metric filter (e.g., `metric.type="networking.googleapis.com/vm_flow/egress_bytes_count"`)
- `interval.startTime`: Start time in ISO format
- `interval.endTime`: End time in ISO format
- `aggregation.*`: Aggregation parameters

### 2. Prometheus Query API (Optional)
```
POST https://monitoring.googleapis.com/v3/projects/{projectId}/location/global/prometheus/api/v1/query
```

## Supported Metrics

The application supports the following network topology metrics:

### Traffic Metrics
- `networking.googleapis.com/vm_flow/egress_bytes_count`
- `networking.googleapis.com/vm_flow/ingress_bytes_count`

### Latency Metrics
- `networking.googleapis.com/vm_flow/rtt`

### Packet Loss Metrics
- `networking.googleapis.com/vm_flow/packet_loss`

### Load Balancer Metrics
- `loadbalancing.googleapis.com/https/request_bytes_count`
- `loadbalancing.googleapis.com/https/backend_request_bytes_count`

## Edge Type Filtering

The application filters metrics based on edge types:

- **VM to VM**: `resource.type="gce_instance"`
- **External to LB**: `resource.type="https_lb_rule"`
- **LB to Backend**: `resource.type="backend_service"`
- **VM to VPN**: `resource.type="vpn_tunnel"`

## Data Transformation

Raw time series data is transformed into connection objects:

```typescript
interface Connection {
  source: string;    // Extracted from resource.labels or metric.labels
  target: string;    // Extracted from resource.labels or metric.labels  
  metricValue: string; // Formatted based on metric type
}
```

## Error Handling

The application includes comprehensive error handling:

1. **Authentication Errors**: Returns clear error messages for 401/403 responses
2. **API Errors**: Logs detailed error information from GCP API
3. **Fallback Mode**: Automatically falls back to mock data when API calls fail
4. **Network Errors**: Handles network connectivity issues gracefully

## Testing

### Mock Mode
Set `mockMode: true` in the configuration to test without real API calls:

```typescript
gcp: {
  projectId: 'demo-project',
  useRealApi: true,
  mockMode: true // Uses mock data
}
```

### Real API Mode
Set `mockMode: false` and ensure proper authentication is configured.

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check your access token or service account credentials
   - Verify the service account has the `Monitoring Viewer` role

2. **"Project or metric not found"**
   - Verify the project ID is correct
   - Ensure the metric type exists in your project
   - Check that the required APIs are enabled

3. **"No data returned"**
   - Check if there's actual metric data in the specified time range
   - Verify the metric filters are correct
   - Ensure resources are generating the metrics

### Debug Mode

Enable debug logging by opening browser console. The application logs:
- API request details
- Response data
- Error messages
- Fallback behavior

## Security Considerations

1. **Never commit service account keys** to version control
2. **Use environment variables** for sensitive configuration
3. **Implement proper CORS** configuration for production
4. **Use HTTPS** for all API communications
5. **Implement token refresh** for long-running sessions

## Production Deployment

For production deployment:

1. Set `production: true` in the configuration
2. Configure proper OAuth 2.0 authentication
3. Set up environment-specific configuration
4. Enable HTTPS and proper CORS settings
5. Implement proper error monitoring and logging
