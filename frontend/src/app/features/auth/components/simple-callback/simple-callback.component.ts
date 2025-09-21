import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-simple-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <h2>Authentication Successful!</h2>
      <p>Redirecting to application...</p>
      <div style="margin-top: 20px;">
        <details>
          <summary>Debug Info</summary>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">{{ debugInfo }}</pre>
        </details>
      </div>
    </div>
  `
})
export class SimpleCallbackComponent implements OnInit {
  debugInfo = '';

  constructor(private router: Router, private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    console.log('SimpleCallbackComponent initialized - processing real OAuth callback');
    
    this.debugInfo = JSON.stringify({
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      code: new URLSearchParams(window.location.search).get('code'),
      error: new URLSearchParams(window.location.search).get('error'),
      timestamp: new Date().toISOString()
    }, null, 2);

    console.log('Debug info:', this.debugInfo);

    try {
      // Process the OAuth callback using the real AuthService
      const success = await this.authService.processAuthCallback();
      
      if (success) {
        console.log('Authentication successful, redirecting to network topology...');
        setTimeout(() => {
          this.router.navigate(['/network-topology']);
        }, 1000);
      } else {
        console.log('Authentication failed, redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { error: 'auth_failed' } });
        }, 1000);
      }
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      setTimeout(() => {
        this.router.navigate(['/login'], { queryParams: { error: 'callback_error' } });
      }, 1000);
    }
  }
}
