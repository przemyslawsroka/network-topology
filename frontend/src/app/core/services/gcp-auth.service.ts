import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app.config';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GcpAuthService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();

  private projectIdSubject = new BehaviorSubject<string>('your-project-id');
  public projectId$ = this.projectIdSubject.asObservable();

  constructor(private authService: AuthService) { 
    // Use the real OAuth token from the main AuthService
    this.loadConfiguration();
    
    // Subscribe to authentication changes
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        const token = this.authService.getAuthToken();
        this.accessTokenSubject.next(token);
      } else {
        this.accessTokenSubject.next(null);
      }
    });
  }

  private loadConfiguration(): void {
    // Get project ID from configuration
    const projectId = APP_CONFIG.gcp.projectId;
    this.projectIdSubject.next(projectId);
    
    // Get the real OAuth token if user is already authenticated
    if (this.authService.isAuthenticated()) {
      const token = this.authService.getAuthToken();
      console.log('GcpAuthService: Using real OAuth token from AuthService');
      this.accessTokenSubject.next(token);
    } else {
      console.log('GcpAuthService: No authentication found, setting token to null');
      this.accessTokenSubject.next(null);
    }
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
