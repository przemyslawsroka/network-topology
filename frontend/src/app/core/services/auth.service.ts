import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, GoogleCredential } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly CLIENT_ID = environment.googleClientId;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform.read-only',
    'https://www.googleapis.com/auth/monitoring.read',
    'https://www.googleapis.com/auth/compute.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  private readonly REDIRECT_URI = window.location.origin + '/auth/callback';

  constructor() {
    console.log('AuthService constructor called');
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    
    this.checkExistingAuth();
    
    // Don't auto-handle callback if we're on the callback page
    // Let the callback component handle it instead
    if (window.location.pathname !== '/auth/callback') {
      this.handleAuthCallback();
    } else {
      console.log('Skipping auto-callback handling - on callback page');
    }
  }

  // Generate a random string for PKCE challenge
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    values.forEach(value => {
      result += charset[value % charset.length];
    });
    return result;
  }

  // Create SHA256 hash and base64url encode
  private async sha256(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  public async signIn(): Promise<void> {
    try {
      console.log('AuthService: Starting sign-in process with implicit flow');
      
      // Use implicit flow for better SPA compatibility
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', this.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'token'); // Use implicit flow
      authUrl.searchParams.set('scope', this.SCOPES.join(' '));
      authUrl.searchParams.set('state', this.generateRandomString(16));
      authUrl.searchParams.set('include_granted_scopes', 'true');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('AuthService: Redirecting to OAuth URL:', authUrl.toString());
      
      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('AuthService: Failed to initiate authentication:', error);
      throw new Error('Failed to initiate authentication');
    }
  }

  private async handleAuthCallback(): Promise<void> {
    if (window.location.pathname !== '/auth/callback') {
      return;
    }

    // Check for implicit flow (hash parameters)
    if (window.location.hash) {
      console.log('Handling implicit flow callback...');
      await this.handleImplicitFlowCallback();
      return;
    }

    // Check for authorization code flow (query parameters)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    console.log('Handling auth callback:', { code: !!code, error, pathname: window.location.pathname });

    if (error) {
      console.error('OAuth error:', error);
      window.location.href = '/login?error=' + encodeURIComponent(error);
      return;
    }

    if (code) {
      console.log('Processing authorization code...');
      try {
        await this.exchangeCodeForToken(code);
        console.log('Token exchange successful, redirecting...');
        // Redirect to main app after successful authentication
        window.location.href = '/network-topology';
      } catch (error) {
        console.error('Token exchange failed:', error);
        window.location.href = '/login?error=auth_failed';
      }
    }
  }

  private async handleImplicitFlowCallback(): Promise<void> {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const error = params.get('error');

      if (error) {
        console.error('Implicit flow error:', error);
        window.location.href = '/login?error=' + encodeURIComponent(error);
        return;
      }

      if (accessToken) {
        console.log('Access token received from implicit flow');
        await this.getUserInfo(accessToken);
        console.log('Implicit flow authentication successful, redirecting...');
        window.location.href = '/network-topology';
      } else {
        throw new Error('No access token found in callback');
      }
    } catch (error) {
      console.error('Implicit flow callback error:', error);
      window.location.href = '/login?error=auth_failed';
    }
  }

  private async exchangeCodeForToken(code: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    console.log('Code verifier found:', !!codeVerifier);
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    console.log('Exchanging code for token...');
    
    try {
      // For public OAuth clients (SPA), we don't include client_secret
      const tokenParams = new URLSearchParams({
        client_id: this.CLIENT_ID,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.REDIRECT_URI,
      });

      console.log('Token exchange request params:', {
        client_id: this.CLIENT_ID,
        grant_type: 'authorization_code',
        redirect_uri: this.REDIRECT_URI,
        code: !!code
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        mode: 'cors',
        body: tokenParams,
      });

      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', errorText);
        
        // If CORS error or client_secret error, fall back to implicit flow
        if (tokenResponse.status === 0 || errorText.includes('CORS') || 
            errorText.includes('client_secret') || tokenResponse.status === 400) {
          console.log('OAuth error detected (CORS or client_secret), falling back to implicit flow...');
          await this.fallbackToImplicitFlow();
          return;
        }
        
        throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token data received:', { access_token: !!tokenData.access_token });
      
      // Get user info with the access token
      await this.getUserInfo(tokenData.access_token);
      
      // Clean up
      sessionStorage.removeItem('code_verifier');
    } catch (error) {
      console.error('Exchange code error:', error);
      
      // If it's a network error or other OAuth error, fall back to implicit flow
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Network error detected (likely CORS), falling back to implicit flow...');
        await this.fallbackToImplicitFlow();
        return;
      }
      
      // For any OAuth configuration issues, try implicit flow
      if (error instanceof Error && error.message && (error.message.includes('client_secret') || 
                           error.message.includes('invalid_request'))) {
        console.log('OAuth configuration error, falling back to implicit flow...');
        await this.fallbackToImplicitFlow();
        return;
      }
      
      throw error;
    }
  }

  private async fallbackToImplicitFlow(): Promise<void> {
    console.log('Initiating fallback implicit flow...');
    
    // Create authorization URL for implicit flow
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', this.SCOPES.join(' '));
    authUrl.searchParams.set('state', 'implicit_fallback');
    authUrl.searchParams.set('include_granted_scopes', 'true');

    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  }

  private async getUserInfo(accessToken: string): Promise<void> {
    try {
      console.log('Fetching user info...');
      
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      console.log('User info response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('User info error:', errorText);
        throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
      }

      const userInfo = await response.json();
      console.log('User info received:', { email: userInfo.email, name: userInfo.name });
      
      const user: User = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };

      this.setCurrentUser(user);
      this.storeAuthData(accessToken);
      
      console.log('User authentication completed successfully');
    } catch (error) {
      console.error('Get user info error:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  public signOut(): void {
    this.clearAuthData();
    this.setCurrentUser(null);
    // Redirect to login page
    window.location.href = '/login';
  }

  private setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(!!user);
  }

  private storeAuthData(token: string): void {
    localStorage.setItem('gcp_auth_token', token);
    localStorage.setItem('gcp_auth_timestamp', Date.now().toString());
    localStorage.setItem('gcp_auth_scopes', this.SCOPES.sort().join(' '));
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      localStorage.setItem('gcp_user_data', JSON.stringify(currentUser));
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem('gcp_auth_token');
    localStorage.removeItem('gcp_auth_timestamp');
    localStorage.removeItem('gcp_user_data');
    localStorage.removeItem('gcp_auth_scopes');
  }

  private checkExistingAuth(): void {
    const token = localStorage.getItem('gcp_auth_token');
    const timestamp = localStorage.getItem('gcp_auth_timestamp');
    const userData = localStorage.getItem('gcp_user_data');
    const storedScopes = localStorage.getItem('gcp_auth_scopes');

    console.log('AuthService: Checking existing auth...', { 
      hasToken: !!token, 
      hasUserData: !!userData,
      storedScopes 
    });

    // Check if scopes have changed (need re-authentication for new scopes)
    const currentScopes = this.SCOPES.sort().join(' ');
    if (storedScopes && storedScopes !== currentScopes) {
      console.log('AuthService: Scopes changed from', storedScopes, 'to', currentScopes);
      console.log('AuthService: Clearing auth data for re-authentication');
      this.clearAuthData();
      return;
    } else if (!storedScopes && token) {
      console.log('AuthService: No stored scopes but token exists, updating scopes');
      localStorage.setItem('gcp_auth_scopes', currentScopes);
    }

    if (token && timestamp && userData) {
      const authTime = parseInt(timestamp);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Check if token is less than 1 hour old
      if (now - authTime < oneHour) {
        try {
          const user = JSON.parse(userData);
          console.log('AuthService: Restored existing authentication for user:', user.email);
          this.setCurrentUser(user);
        } catch (error) {
          console.error('AuthService: Error parsing stored user data:', error);
          this.clearAuthData();
        }
      } else {
        console.log('AuthService: Token expired, clearing auth data');
        this.clearAuthData();
      }
    } else {
      console.log('AuthService: No existing authentication found');
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  public getAuthToken(): string | null {
    return localStorage.getItem('gcp_auth_token');
  }

  public forceReAuthentication(): void {
    console.log('AuthService: Forcing re-authentication...');
    this.clearAuthData();
    this.setCurrentUser(null);
  }

  public debugAuthState(): void {
    console.log('=== AUTH DEBUG STATE ===');
    console.log('Current URL:', window.location.href);
    console.log('Is authenticated:', this.isAuthenticated());
    console.log('Current user:', this.getCurrentUser());
    console.log('Auth token:', this.getAuthToken());
    console.log('localStorage items:');
    console.log('  gcp_auth_token:', localStorage.getItem('gcp_auth_token'));
    console.log('  gcp_auth_timestamp:', localStorage.getItem('gcp_auth_timestamp'));
    console.log('  gcp_user_data:', localStorage.getItem('gcp_user_data'));
    console.log('  gcp_auth_scopes:', localStorage.getItem('gcp_auth_scopes'));
    console.log('=========================');
  }

  public async processAuthCallback(): Promise<boolean> {
    console.log('AuthService: Processing auth callback...');
    try {
      // Force processing the callback regardless of current path
      await this.forceHandleAuthCallback();
      return this.isAuthenticated();
    } catch (error) {
      console.error('AuthService: Auth callback processing failed:', error);
      return false;
    }
  }

  private async forceHandleAuthCallback(): Promise<void> {
    console.log('AuthService: Force handling auth callback');
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    
    // Check for implicit flow (hash parameters) - prioritize this
    if (window.location.hash) {
      console.log('Handling implicit flow callback...');
      await this.handleImplicitFlowCallback();
      return;
    }

    // Check for authorization code flow (query parameters)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    console.log('Handling auth callback:', { code: !!code, error, pathname: window.location.pathname });

    if (error) {
      console.error('OAuth error:', error);
      // If authorization code flow failed, try implicit flow
      console.log('Authorization code flow failed, trying implicit flow fallback...');
      await this.fallbackToImplicitFlow();
      return;
    }

    if (code) {
      console.log('Processing authorization code...');
      try {
        await this.exchangeCodeForToken(code);
        console.log('Token exchange successful');
      } catch (error) {
        console.error('Token exchange failed:', error);
        // Fallback to implicit flow on any error
        console.log('Code exchange failed, trying implicit flow fallback...');
        await this.fallbackToImplicitFlow();
        return;
      }
    } else {
      console.log('No authorization code or hash found, trying implicit flow...');
      await this.fallbackToImplicitFlow();
    }
  }
}

