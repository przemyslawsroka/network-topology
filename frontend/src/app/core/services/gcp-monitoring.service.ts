import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GcpAuthService } from './gcp-auth.service';

export interface TimeSeriesData {
  metric: {
    type: string;
    labels: { [key: string]: string };
  };
  resource: {
    type: string;
    labels: { [key: string]: string };
  };
  points: Array<{
    interval: {
      endTime: string;
      startTime?: string;
    };
    value: {
      doubleValue?: number;
      int64Value?: string;
      stringValue?: string;
    };
  }>;
}

export interface MonitoringApiResponse {
  timeSeries: TimeSeriesData[];
  nextPageToken?: string;
  executionErrors?: Array<{
    code: number;
    message: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class GcpMonitoringService {
  private readonly baseUrl = 'https://monitoring.googleapis.com/v3';

  constructor(
    private http: HttpClient,
    private authService: GcpAuthService
  ) { }

  /**
   * Fetch time series data from GCP Monitoring API
   * @param metricFilter - The metric filter (e.g., 'metric.type="networking.googleapis.com/vm_flow/egress_bytes_count"')
   * @param startTime - Start time in ISO format
   * @param endTime - End time in ISO format
   * @param aggregation - Optional aggregation configuration
   */
  listTimeSeries(
    metricFilter: string,
    startTime: string,
    endTime: string,
    aggregation?: any
  ): Observable<MonitoringApiResponse> {
    const projectId = this.authService.getProjectId();
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      return throwError(() => new Error('No access token available. Please authenticate first.'));
    }

    const url = `${this.baseUrl}/projects/${projectId}/timeSeries`;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });

    let params = new HttpParams()
      .set('filter', metricFilter)
      .set('interval.startTime', startTime)
      .set('interval.endTime', endTime)
      .set('view', 'FULL');

    if (aggregation) {
      // Add aggregation parameters if provided
      if (aggregation.alignmentPeriod) {
        params = params.set('aggregation.alignmentPeriod', aggregation.alignmentPeriod);
      }
      if (aggregation.perSeriesAligner) {
        params = params.set('aggregation.perSeriesAligner', aggregation.perSeriesAligner);
      }
      if (aggregation.crossSeriesReducer) {
        params = params.set('aggregation.crossSeriesReducer', aggregation.crossSeriesReducer);
      }
      if (aggregation.groupByFields) {
        aggregation.groupByFields.forEach((field: string) => {
          params = params.append('aggregation.groupByFields', field);
        });
      }
    }

    return this.http.get<MonitoringApiResponse>(url, { headers, params })
      .pipe(
        catchError(error => {
          console.error('GCP Monitoring API Error:', error);
          let errorMessage = 'Failed to fetch data from GCP Monitoring API';
          
          if (error.status === 401) {
            errorMessage = 'Authentication failed. Please check your access token.';
          } else if (error.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (error.status === 404) {
            errorMessage = 'Project or metric not found.';
          } else if (error.error?.error?.message) {
            errorMessage = error.error.error.message;
          }
          
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Query metrics using PromQL (Prometheus Query Language)
   * This uses the Prometheus-compatible API provided by Google Cloud Monitoring
   */
  queryPromQL(query: string, time?: string): Observable<any> {
    const projectId = this.authService.getProjectId();
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      return throwError(() => new Error('No access token available. Please authenticate first.'));
    }

    const url = `${this.baseUrl}/projects/${projectId}/location/global/prometheus/api/v1/query`;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let body = new HttpParams().set('query', query);
    if (time) {
      body = body.set('time', time);
    }

    return this.http.post(url, body.toString(), { headers })
      .pipe(
        catchError(error => {
          console.error('GCP Monitoring PromQL API Error:', error);
          let errorMessage = 'Failed to execute PromQL query';
          
          if (error.status === 401) {
            errorMessage = 'Authentication failed. Please check your access token.';
          } else if (error.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (error.error?.error?.message) {
            errorMessage = error.error.error.message;
          }
          
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Get available metrics for a project
   */
  listMetricDescriptors(filter?: string): Observable<any> {
    const projectId = this.authService.getProjectId();
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      return throwError(() => new Error('No access token available. Please authenticate first.'));
    }

    const url = `${this.baseUrl}/projects/${projectId}/metricDescriptors`;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });

    let params = new HttpParams();
    if (filter) {
      params = params.set('filter', filter);
    }

    return this.http.get(url, { headers, params })
      .pipe(
        catchError(error => {
          console.error('GCP Monitoring Metric Descriptors Error:', error);
          return throwError(() => new Error('Failed to fetch metric descriptors'));
        })
      );
  }
}
