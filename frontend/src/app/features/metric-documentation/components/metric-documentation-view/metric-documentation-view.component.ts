import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-metric-documentation-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './metric-documentation-view.component.html',
  styleUrls: ['./metric-documentation-view.component.scss']
})
export class MetricDocumentationViewComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
