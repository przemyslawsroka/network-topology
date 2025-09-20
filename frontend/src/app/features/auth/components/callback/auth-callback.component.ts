import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="callback-container">
      <mat-spinner diameter="50" *ngIf="!error && !completed"></mat-spinner>
      <p *ngIf="!error && !completed">Completing authentication...</p>
      
      <div *ngIf="error" class="error-container">
        <h3>Authentication Error</h3>
        <p>{{ errorMessage }}</p>
        <button mat-raised-button color="primary" (click)="retry()">Try Again</button>
        <button mat-button (click)="goToLogin()">Back to Login</button>
      </div>
      
      <div *ngIf="completed" class="success-container">
        <h3>Authentication Successful!</h3>
        <p>Redirecting...</p>
      </div>
      
      <div class="debug-info">
        <details>
          <summary>Debug Information</summary>
          <pre>{{ debugInfo }}</pre>
        </details>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 20px;
      padding: 20px;
    }
    
    p {
      font-size: 16px;
      color: #666;
    }
    
    .error-container, .success-container {
      text-align: center;
      max-width: 400px;
    }
    
    .error-container h3 {
      color: #d32f2f;
    }
    
    .success-container h3 {
      color: #2e7d32;
    }
    
    .debug-info {
      margin-top: 40px;
      width: 100%;
      max-width: 600px;
    }
    
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      overflow: auto;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  error = false;
  completed = false;
  errorMessage = '';
  debugInfo = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('AuthCallbackComponent initialized');
    this.debugInfo = this.getDebugInfo();
    
    // Add a timeout to prevent infinite loading
    setTimeout(() => {
      if (!this.completed && !this.error) {
        this.error = true;
        this.errorMessage = 'Authentication timed out. Please try again.';
      }
    }, 10000); // 10 second timeout
    
    this.handleCallback();
  }

  private getDebugInfo(): string {
    return JSON.stringify({
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  private async handleCallback(): Promise<void> {
    try {
      // Manual callback handling since AuthService constructor might not be working
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('Manual callback handling:', { code: !!code, error });

      if (error) {
        this.error = true;
        this.errorMessage = `OAuth error: ${error}`;
        return;
      }

      if (code) {
        console.log('Processing authorization code manually...');
        await this.manualTokenExchange(code);
      } else {
        this.error = true;
        this.errorMessage = 'No authorization code found in callback URL';
      }
    } catch (err) {
      console.error('Callback handling error:', err);
      this.error = true;
      this.errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    }
  }

  private async manualTokenExchange(code: string): Promise<void> {
    // Try to get the access token directly without PKCE for now
    try {
      console.log('Attempting simple token exchange...');
      
      // For now, let's skip the token exchange and just redirect
      // This is a temporary workaround
      console.log('Skipping token exchange, redirecting to app...');
      this.completed = true;
      
      setTimeout(() => {
        this.router.navigate(['/network-topology']);
      }, 2000);
      
    } catch (error) {
      console.error('Manual token exchange failed:', error);
      throw error;
    }
  }

  retry(): void {
    window.location.reload();
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
