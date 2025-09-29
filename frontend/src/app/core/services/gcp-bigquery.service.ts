import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { GcpAuthService } from './gcp-auth.service';

export interface BigQueryRow {
  [key: string]: any;
}

export interface BigQueryResponse {
  kind: string;
  schema: {
    fields: Array<{
      name: string;
      type: string;
      mode?: string;
    }>;
  };
  jobReference: {
    projectId: string;
    jobId: string;
    location?: string;
  };
  totalRows: string;
  rows?: Array<{
    f: Array<{ v: any }>;
  }>;
  totalBytesProcessed?: string;
  jobComplete: boolean;
  cacheHit?: boolean;
}

export interface BigQueryJob {
  kind: string;
  configuration: {
    query: {
      query: string;
      useLegacySql: boolean;
      useQueryCache?: boolean;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class GcpBigQueryService {
  private readonly baseUrl = 'https://bigquery.googleapis.com/bigquery/v2';

  constructor(
    private http: HttpClient,
    private authService: GcpAuthService
  ) {}

  /**
   * Execute a BigQuery SQL query
   * @param query - SQL query string
   * @param maxResults - Maximum number of results to return
   * @param useLegacySql - Whether to use legacy SQL (default: false, uses Standard SQL)
   */
  query(
    query: string,
    maxResults: number = 10000,
    useLegacySql: boolean = false
  ): Observable<BigQueryResponse> {
    return this.authService.projectId$.pipe(
      take(1),
      switchMap(projectId => {
        if (!projectId) {
          return throwError(() => new Error('No project selected.'));
        }

        const accessToken = this.authService.getAccessToken();
        if (!accessToken) {
          console.error('No OAuth2 access token available. Please authenticate first.');
          return throwError(() => new Error('No access token available. Please authenticate first.'));
        }

        const url = `${this.baseUrl}/projects/${projectId}/queries`;

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        });

        const body = {
          query: query,
          useLegacySql: useLegacySql,
          maxResults: maxResults,
          useQueryCache: true
        };

        console.log('BigQuery API Request:', {
          projectId,
          query: query.substring(0, 200) + '...',
          maxResults
        });

        return this.http.post<BigQueryResponse>(url, body, { headers }).pipe(
          catchError(error => {
            console.error('BigQuery API Error:', error);
            if (error.error?.error) {
              const bqError = error.error.error;
              return throwError(() => new Error(
                `BigQuery Error: ${bqError.message || 'Unknown error'}`
              ));
            }
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * Parse BigQuery response rows into typed objects
   * @param response - BigQuery response
   * @returns Array of parsed row objects
   */
  parseRows(response: BigQueryResponse): BigQueryRow[] {
    if (!response.rows || !response.schema) {
      return [];
    }

    const fields = response.schema.fields;
    
    return response.rows.map(row => {
      const obj: BigQueryRow = {};
      row.f.forEach((field, index) => {
        const fieldName = fields[index].name;
        obj[fieldName] = field.v;
      });
      return obj;
    });
  }

  /**
   * List datasets in the project
   */
  listDatasets(): Observable<any> {
    return this.authService.projectId$.pipe(
      take(1),
      switchMap(projectId => {
        if (!projectId) {
          return throwError(() => new Error('No project selected.'));
        }

        const accessToken = this.authService.getAccessToken();
        if (!accessToken) {
          return throwError(() => new Error('No access token available.'));
        }

        const url = `${this.baseUrl}/projects/${projectId}/datasets`;
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        });

        return this.http.get(url, { headers }).pipe(
          catchError(error => {
            console.error('BigQuery List Datasets Error:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  /**
   * List tables in a dataset
   */
  listTables(datasetId: string): Observable<any> {
    return this.authService.projectId$.pipe(
      take(1),
      switchMap(projectId => {
        if (!projectId) {
          return throwError(() => new Error('No project selected.'));
        }

        const accessToken = this.authService.getAccessToken();
        if (!accessToken) {
          return throwError(() => new Error('No access token available.'));
        }

        const url = `${this.baseUrl}/projects/${projectId}/datasets/${datasetId}/tables`;
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        });

        return this.http.get(url, { headers }).pipe(
          catchError(error => {
            console.error('BigQuery List Tables Error:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }
}
