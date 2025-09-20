import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/network-topology',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/components/simple-callback/simple-callback.component').then(m => m.SimpleCallbackComponent)
  },
  {
    path: 'network-topology',
    loadComponent: () => import('./features/network-topology/components/topology-view/topology-view.component').then(m => m.TopologyViewComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/network-topology'
  }
];
