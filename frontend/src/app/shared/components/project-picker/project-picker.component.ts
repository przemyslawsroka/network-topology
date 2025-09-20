import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

export interface GcpProject {
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
    MatDividerModule
  ],
  templateUrl: './project-picker.component.html',
  styleUrls: ['./project-picker.component.scss']
})
export class ProjectPickerComponent implements OnInit {
  selectedProject: GcpProject | null = null;
  projects: GcpProject[] = [
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

  constructor() { }

  ngOnInit(): void {
    // Set default selected project
    this.selectedProject = this.projects[0];
  }

  onProjectSelect(project: GcpProject): void {
    this.selectedProject = project;
    // Here you would typically emit an event or call a service
    console.log('Selected project:', project);
  }
}
