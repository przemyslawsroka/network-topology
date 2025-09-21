import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { GcpResourceManagerService, GcpProject } from '../../../core/services/gcp-resource-manager.service';

export interface ProjectPickerProject {
  id: string;
  name: string;
  displayName: string;
}

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
  @Output() projectSelected = new EventEmitter<ProjectPickerProject>();
  
  selectedProject: ProjectPickerProject | null = null;
  projects: ProjectPickerProject[] = [];
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
        next: (gcpProjects: GcpProject[]) => {
          console.log('Fetched GCP projects:', gcpProjects);
          
          // Transform GCP projects to the format expected by the UI
          this.projects = gcpProjects.map(gcpProject => ({
            id: gcpProject.projectId,
            name: gcpProject.name || gcpProject.projectId,
            displayName: gcpProject.name || gcpProject.projectId
          }));

          // Set default selected project (first one if available)
          if (this.projects.length > 0 && !this.selectedProject) {
            this.selectedProject = this.projects[0];
            console.log('Default selected project:', this.selectedProject);
            
            // Emit the default selection
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

          // Fall back to hardcoded projects for development/demo purposes
          this.projects = [
            {
              id: 'przemeksroka-joonix-service',
              name: 'przemeksroka-joonix-service',
              displayName: 'przemeksroka-joonix-service'
            },
            {
              id: 'my-demo-project-123456',
              name: 'my-demo-project-123456', 
              displayName: 'Demo Project'
            },
            {
              id: 'production-env-789012',
              name: 'production-env-789012',
              displayName: 'Production Environment'
            }
          ];
          
          if (this.projects.length > 0 && !this.selectedProject) {
            this.selectedProject = this.projects[0];
            // Emit the fallback selection
            this.projectSelected.emit(this.selectedProject);
          }
        }
      });
  }

  onProjectSelect(project: ProjectPickerProject): void {
    this.selectedProject = project;
    console.log('Selected project:', project);
    
    // Emit event to notify parent components of project selection
    this.projectSelected.emit(project);
  }

  onRetryLoad(): void {
    this.loadProjects();
  }
}
