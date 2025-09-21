export interface AppConfig {
  production: boolean;
  gcp: {
    projectId: string;
    // In a real application, these would be set through environment variables
    // or obtained through OAuth 2.0 authentication flow
    useRealApi: boolean;
    mockMode: boolean;
  };
  monitoring: {
    defaultTimeRange: number; // in minutes
    refreshInterval: number; // in milliseconds
  };
}

export const APP_CONFIG: AppConfig = {
  production: false,
  gcp: {
    projectId: 'demo-network-topology-project', // Replace with your actual project ID
    useRealApi: true, // Set to true to use real GCP Monitoring API
    mockMode: true // Set to false when you have proper authentication
  },
  monitoring: {
    defaultTimeRange: 5, // 5 minutes
    refreshInterval: 30000 // 30 seconds
  }
};

// In a real application, you would have different configurations for different environments:
// - development.config.ts
// - production.config.ts
// - staging.config.ts
