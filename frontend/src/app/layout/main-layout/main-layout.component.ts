import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Observable } from 'rxjs';
import { ProjectPickerComponent } from '../../shared/components/project-picker/project-picker.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    ProjectPickerComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;
  sidenavOpened = true;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    // Debug authentication state
    this.currentUser$.subscribe(user => {
      console.log('MainLayoutComponent: Current user:', user);
    });
    this.isAuthenticated$.subscribe(isAuth => {
      console.log('MainLayoutComponent: Is authenticated:', isAuth);
    });

    // Force clear old problematic auth data if it exists
    const token = localStorage.getItem('gcp_auth_token');
    if (token && token.startsWith('dummy_token_')) {
      console.log('MainLayoutComponent: Detected old dummy token, clearing...');
      this.authService.forceReAuthentication();
    }
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  signOut(): void {
    this.authService.signOut();
  }
}
