import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { GcpResourceManagerService, GcpProject as ApiGcpProject } from '../../../core/services/gcp-resource-manager.service';
import { GcpProject } from '../../../core/services/gcp-auth.service';

@Component({
  selector: 'app-project-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './project-picker.component.html',
  styleUrls: ['./project-picker.component.scss']
})
export class ProjectPickerComponent implements OnInit, OnDestroy {
  @Output() projectSelected = new EventEmitter<GcpProject>();
  
  selectedProject: GcpProject | null = null;
  projects: GcpProject[] = [];
  isLoading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private gcpResourceManagerService: GcpResourceManagerService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.isLoading = true;
    this.error = null;

    // Filter for active projects only
    const filter = 'lifecycleState:ACTIVE';

    this.gcpResourceManagerService.getAllProjects(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (gcpProjects: ApiGcpProject[]) => {
          console.log('Fetched GCP projects:', gcpProjects);
          
          // Transform GCP projects to the format expected by the UI
          this.projects = gcpProjects.map(gcpProject => ({
            id: gcpProject.projectId,
            name: gcpProject.name || gcpProject.projectId
          }));

          // Set default selected project
          const defaultProject = this.projects.find(p => p.id === 'net-top-viz-demo-208511');
          if (defaultProject) {
            this.selectedProject = defaultProject;
          } else if (this.projects.length > 0) {
            this.selectedProject = this.projects[0];
          }

          if (this.selectedProject) {
            console.log('Default selected project:', this.selectedProject);
            this.projectSelected.emit(this.selectedProject);
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.error = error.message || 'Failed to load projects';
          this.isLoading = false;
          
          // Show error message to user
          this.snackBar.open(
            'Failed to load projects. Please check your authentication and permissions.',
            'Retry',
            {
              duration: 10000
            }
          ).onAction().subscribe(() => {
            this.loadProjects();
          });

          // Fallback project selection
          this.projects = [
            { id: 'net-top-viz-demo-208511', name: 'Demo Project' },
            { id: 'przemeksroka-joonix-service', name: 'Joonix Service' }
          ];
          this.selectedProject = this.projects[0];
          this.projectSelected.emit(this.selectedProject);
        }
      });
  }

  onProjectSelect(project: GcpProject): void {
    this.selectedProject = project;
    console.log('Selected project:', project);
    
    // Emit event to notify parent components of project selection
    this.projectSelected.emit(project);
  }

  onRetryLoad(): void {
    this.loadProjects();
  }
}
