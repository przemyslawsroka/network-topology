import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { GcpAuthService } from './gcp-auth.service';
import { AuthService } from './auth.service';

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
    private authService: GcpAuthService,
    private mainAuthService: AuthService
  ) { }

  listTimeSeries(
    metricFilter: string,
    startTime: string,
    endTime: string,
    aggregation?: any
  ): Observable<MonitoringApiResponse> {
    return this.authService.projectId$.pipe(
      take(1), // Ensure the observable completes after getting the project ID
      switchMap(projectId => {
        if (!projectId) {
          return throwError(() => new Error('No project selected.'));
        }
        
        const accessToken = this.authService.getAccessToken();

        if (!accessToken) {
          console.error('No OAuth2 access token available. Please authenticate first.');
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
                errorMessage = 'Authentication failed. Your session may have expired.';
                this.mainAuthService.forceReAuthentication();
              } else if (error.status === 403) {
                errorMessage = `Permission denied for project ${projectId}. Ensure your account has the 'monitoring.read' scope and necessary IAM permissions.`;
                console.log('Forcing re-authentication to allow user to grant correct scopes.');
                this.mainAuthService.forceReAuthentication();
              } else if (error.error?.error?.message) {
                errorMessage = error.error.error.message;
              }
              
              return throwError(() => new Error(errorMessage));
            })
          );
      })
    );
  }

  debugAuthAndProject(): void {
    const projectId = this.authService.getProjectId();
    const accessToken = this.authService.getAccessToken();
    const isAuthenticated = this.authService.isAuthenticated();
    
    console.log('=== GCP MONITORING DEBUG INFO ===');
    console.log('Project ID:', projectId);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Has Access Token:', !!accessToken);
    console.log('Token Preview:', accessToken ? accessToken.substring(0, 20) + '...' : 'None');
    console.log('==================================');
  }
}
