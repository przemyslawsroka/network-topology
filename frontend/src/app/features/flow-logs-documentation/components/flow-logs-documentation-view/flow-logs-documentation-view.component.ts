import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-flow-logs-documentation-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule
  ],
  templateUrl: './flow-logs-documentation-view.component.html',
  styleUrls: ['./flow-logs-documentation-view.component.scss']
})
export class FlowLogsDocumentationViewComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
