import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('SimpleCallbackComponent initialized');
    
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

    // Store minimal auth data to simulate successful login
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Store dummy auth data
      localStorage.setItem('gcp_auth_token', 'dummy_token_' + Date.now());
      localStorage.setItem('gcp_auth_timestamp', Date.now().toString());
      localStorage.setItem('gcp_user_data', JSON.stringify({
        id: 'dummy_user',
        email: 'user@example.com',
        name: 'Test User',
        picture: ''
      }));
      console.log('Stored dummy auth data');
    }

    // Simple redirect after 3 seconds
    setTimeout(() => {
      console.log('Redirecting to network topology...');
      this.router.navigate(['/network-topology']);
    }, 3000);
  }
}
