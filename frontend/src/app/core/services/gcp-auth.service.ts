import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app.config';

@Injectable({
  providedIn: 'root'
})
export class GcpAuthService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();

  private projectIdSubject = new BehaviorSubject<string>('your-project-id');
  public projectId$ = this.projectIdSubject.asObservable();

  constructor() { 
    // In a real application, you would implement OAuth 2.0 flow here
    // For demo purposes, we'll use environment variables or configuration
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    // In a real application, these would come from:
    // 1. OAuth 2.0 authentication flow
    // 2. Environment variables
    // 3. Configuration files
    // 4. Service account key
    
    const projectId = APP_CONFIG.gcp.projectId;
    
    if (APP_CONFIG.gcp.mockMode) {
      // In mock mode, use a fake token for demonstration
      const accessToken = 'demo-access-token';
      this.accessTokenSubject.next(accessToken);
    } else {
      // In real mode, you would implement OAuth 2.0 flow here
      // For now, set to null to trigger authentication flow
      this.accessTokenSubject.next(null);
    }
    
    this.projectIdSubject.next(projectId);
  }

  getAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  getProjectId(): string {
    return this.projectIdSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.accessTokenSubject.value;
  }

  // In a real application, implement these methods:
  // - refreshToken(): Observable<string>
  // - login(): Observable<void>
  // - logout(): void
}
