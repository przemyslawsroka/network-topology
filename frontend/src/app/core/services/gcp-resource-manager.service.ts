import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GcpAuthService } from './gcp-auth.service';
import { AuthService } from './auth.service';

export interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime?: string;
  labels?: { [key: string]: string };
}

export interface ProjectsListResponse {
  projects: GcpProject[];
  nextPageToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GcpResourceManagerService {
  private readonly baseUrl = 'https://cloudresourcemanager.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: GcpAuthService,
    private mainAuthService: AuthService
  ) { }

  /**
   * List all projects accessible to the authenticated user
   * @param pageSize - Number of projects to return per page (max 500)
   * @param pageToken - Token for pagination
   * @param filter - Optional filter expression
   */
  listProjects(
    pageSize: number = 100,
    pageToken?: string,
    filter?: string
  ): Observable<ProjectsListResponse> {
    const accessToken = this.authService.getAccessToken();

    console.log('GCP Resource Manager API Call:', {
      hasToken: !!accessToken,
      tokenLength: accessToken?.length,
      pageSize,
      pageToken,
      filter
    });

    if (!accessToken) {
      console.error('No access token available for GCP Resource Manager API');
      return throwError(() => new Error('No access token available. Please authenticate first.'));
    }

    const url = `${this.baseUrl}/projects`;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    
    if (pageSize) {
      params.pageSize = pageSize.toString();
    }
    
    if (pageToken) {
      params.pageToken = pageToken;
    }
    
    if (filter) {
      params.filter = filter;
    }

    return this.http.get<ProjectsListResponse>(url, { 
      headers, 
      params: Object.keys(params).length > 0 ? params : undefined 
    }).pipe(
      catchError(error => {
        console.error('GCP Resource Manager API Error:', error);
        console.error('Request URL:', url);
        console.error('Request params:', params);
        console.error('Auth token (first 20 chars):', accessToken.substring(0, 20) + '...');
        
        let errorMessage = 'Failed to fetch projects from GCP Resource Manager API';
        
        if (error.status === 401) {
          errorMessage = 'Authentication failed. Please re-authenticate with updated scopes.';
          console.log('Authentication error - clearing stored auth data');
          this.mainAuthService.forceReAuthentication();
        } else if (error.status === 403) {
          errorMessage = `Access denied. Please check your permissions and ensure the Cloud Resource Manager API is enabled. Error: ${error.error?.error?.message || 'Permission denied'}`;
          console.log('Suggested fixes:');
          console.log('1. Enable Cloud Resource Manager API: https://console.cloud.google.com/apis/api/cloudresourcemanager.googleapis.com');
          console.log('2. Ensure you have the "resourcemanager.projects.list" permission');
          console.log('3. Check that your OAuth scopes include "https://www.googleapis.com/auth/cloud-platform" or "https://www.googleapis.com/auth/cloudplatformprojects.readonly"');
        } else if (error.status === 404) {
          errorMessage = 'Resource Manager API endpoint not found. Please verify the API is enabled.';
        } else if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get all projects accessible to the user (handles pagination automatically)
   */
  getAllProjects(filter?: string): Observable<GcpProject[]> {
    return new Observable(observer => {
      const allProjects: GcpProject[] = [];
      let pageToken: string | undefined;

      const fetchNextPage = () => {
        this.listProjects(500, pageToken, filter).subscribe({
          next: (response) => {
            if (response.projects) {
              allProjects.push(...response.projects);
            }
            
            if (response.nextPageToken) {
              pageToken = response.nextPageToken;
              fetchNextPage();
            } else {
              observer.next(allProjects);
              observer.complete();
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      fetchNextPage();
    });
  }

  /**
   * Get a specific project by ID
   * @param projectId - The project ID
   */
  getProject(projectId: string): Observable<GcpProject> {
    const accessToken = this.authService.getAccessToken();

    if (!accessToken) {
      return throwError(() => new Error('No access token available. Please authenticate first.'));
    }

    const url = `${this.baseUrl}/projects/${projectId}`;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<GcpProject>(url, { headers }).pipe(
      catchError(error => {
        console.error('GCP Resource Manager Get Project Error:', error);
        
        let errorMessage = `Failed to fetch project ${projectId}`;
        
        if (error.status === 401) {
          errorMessage = 'Authentication failed. Please re-authenticate.';
          this.mainAuthService.forceReAuthentication();
        } else if (error.status === 403) {
          errorMessage = `Access denied for project ${projectId}. Check your permissions.`;
        } else if (error.status === 404) {
          errorMessage = `Project ${projectId} not found or you don't have access to it.`;
        } else if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Debug method to check if the Resource Manager API is accessible
   */
  debugResourceManagerAccess(): void {
    const accessToken = this.authService.getAccessToken();
    const isAuthenticated = this.authService.isAuthenticated();
    
    console.log('=== GCP RESOURCE MANAGER DEBUG INFO ===');
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Has Access Token:', !!accessToken);
    console.log('Token Preview:', accessToken ? accessToken.substring(0, 20) + '...' : 'None');
    
    console.log('Required scopes for Resource Manager API:');
    console.log('- https://www.googleapis.com/auth/cloud-platform');
    console.log('- https://www.googleapis.com/auth/cloudplatformprojects.readonly');
    
    console.log('Required API to enable:');
    console.log('- Cloud Resource Manager API: https://console.cloud.google.com/apis/api/cloudresourcemanager.googleapis.com');
    console.log('==========================================');
  }
}
