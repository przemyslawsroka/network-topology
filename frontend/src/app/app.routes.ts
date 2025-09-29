import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/components/simple-callback/simple-callback.component').then(m => m.SimpleCallbackComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'network-topology',
        pathMatch: 'full'
      },
      {
        path: 'network-topology',
        loadComponent: () => import('./features/network-topology/components/topology-view/topology-view.component').then(m => m.TopologyViewComponent)
      },
      {
        path: 'flow-topology',
        loadComponent: () => import('./features/flow-topology/components/flow-topology-view/flow-topology-view.component').then(m => m.FlowTopologyViewComponent)
      },
      {
        path: 'metric-edge-explorer',
        loadComponent: () => import('./features/metric-edge-explorer/components/edge-explorer-view/edge-explorer-view.component').then(m => m.EdgeExplorerViewComponent)
      },
      {
        path: 'flow-logs-edge-explorer',
        loadComponent: () => import('./features/flow-logs-edge-explorer/components/flow-logs-explorer-view/flow-logs-explorer-view.component').then(m => m.FlowLogsExplorerViewComponent)
      },
      {
        path: 'metric-documentation',
        loadComponent: () => import('./features/metric-documentation/components/metric-documentation-view/metric-documentation-view.component').then(m => m.MetricDocumentationViewComponent)
      },
      {
        path: 'flow-logs-documentation',
        loadComponent: () => import('./features/flow-logs-documentation/components/flow-logs-documentation-view/flow-logs-documentation-view.component').then(m => m.FlowLogsDocumentationViewComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'network-topology'
  }
];
