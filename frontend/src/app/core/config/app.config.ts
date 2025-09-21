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
    projectId: 'przemekasroka-joonix-service', // Real project ID from OAuth client
    useRealApi: true, // Set to true to use real GCP Monitoring API
    mockMode: false // Set to false to use real authentication
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
