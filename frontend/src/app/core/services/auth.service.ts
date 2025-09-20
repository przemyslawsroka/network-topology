import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, GoogleCredential } from '../models/user.model';

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com'; // Replace with actual client ID
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform.read-only',
    'https://www.googleapis.com/auth/compute.readonly',
    'profile',
    'email'
  ].join(' ');

  constructor() {
    this.loadGoogleIdentityServices();
    this.checkExistingAuth();
  }

  private loadGoogleIdentityServices(): void {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeGoogleAuth();
    };
    document.head.appendChild(script);
  }

  private initializeGoogleAuth(): void {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: this.CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
    }
  }

  private handleCredentialResponse(response: GoogleCredential): void {
    try {
      const payload = this.parseJwtPayload(response.credential);
      const user: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        domain: payload.hd
      };

      this.setCurrentUser(user);
      this.storeAuthData(response.credential);
    } catch (error) {
      console.error('Error handling credential response:', error);
    }
  }

  private parseJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  public signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      // Show the One Tap dialog
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to popup sign-in
          this.signInWithPopup().then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  }

  private signInWithPopup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authWindow = window.open(
        `https://accounts.google.com/oauth/authorize?` +
        `client_id=${this.CLIENT_ID}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent(this.SCOPES)}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
        `state=popup`,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      const pollTimer = setInterval(() => {
        try {
          if (authWindow?.closed) {
            clearInterval(pollTimer);
            reject(new Error('Authentication cancelled'));
          }

          if (authWindow?.location.hash) {
            const hash = authWindow.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            if (accessToken) {
              clearInterval(pollTimer);
              authWindow.close();
              this.getUserInfo(accessToken).then(resolve).catch(reject);
            }
          }
        } catch (error) {
          // Ignore cross-origin errors while polling
        }
      }, 1000);
    });
  }

  private async getUserInfo(accessToken: string): Promise<void> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      const user: User = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };

      this.setCurrentUser(user);
      this.storeAuthData(accessToken);
    } catch (error) {
      throw new Error('Failed to retrieve user information');
    }
  }

  public signOut(): void {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    this.clearAuthData();
    this.setCurrentUser(null);
  }

  private setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(!!user);
  }

  private storeAuthData(token: string): void {
    localStorage.setItem('gcp_auth_token', token);
    localStorage.setItem('gcp_auth_timestamp', Date.now().toString());
  }

  private clearAuthData(): void {
    localStorage.removeItem('gcp_auth_token');
    localStorage.removeItem('gcp_auth_timestamp');
    localStorage.removeItem('gcp_user_data');
  }

  private checkExistingAuth(): void {
    const token = localStorage.getItem('gcp_auth_token');
    const timestamp = localStorage.getItem('gcp_auth_timestamp');

    if (token && timestamp) {
      const authTime = parseInt(timestamp);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Check if token is less than 1 hour old
      if (now - authTime < oneHour) {
        try {
          const payload = this.parseJwtPayload(token);
          const user: User = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            domain: payload.hd
          };
          this.setCurrentUser(user);
        } catch (error) {
          this.clearAuthData();
        }
      } else {
        this.clearAuthData();
      }
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
}
