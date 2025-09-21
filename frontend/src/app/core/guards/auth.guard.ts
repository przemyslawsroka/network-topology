import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take, delay } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        console.log('AuthGuard: canActivate called, isAuthenticated:', isAuthenticated);
        console.log('AuthGuard: Current user:', this.authService.getCurrentUser());
        console.log('AuthGuard: Current URL:', window.location.href);
        
        if (!isAuthenticated) {
          console.log('AuthGuard: Not authenticated, redirecting to login');
          this.router.navigate(['/login']);
          return false;
        }
        console.log('AuthGuard: Authenticated, allowing access');
        return true;
      })
    );
  }
}
