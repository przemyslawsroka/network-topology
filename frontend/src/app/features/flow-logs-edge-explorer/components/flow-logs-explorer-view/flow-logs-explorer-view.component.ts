import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-flow-logs-explorer-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './flow-logs-explorer-view.component.html',
  styleUrls: ['./flow-logs-explorer-view.component.scss']
})
export class FlowLogsExplorerViewComponent implements OnInit {
  
  // Sample VPC Flow Logs data for demonstration
  flowLogs = [
    {
      srcAddr: '10.0.1.15',
      dstAddr: '10.0.2.22',
      srcPort: 443,
      dstPort: 8080,
      protocol: 'TCP',
      bytes: 2048576,
      packets: 1024,
      action: 'ACCEPT',
      start: new Date('2024-01-20T10:30:00Z'),
      end: new Date('2024-01-20T10:35:00Z'),
      srcInstance: 'web-server-1',
      dstInstance: 'app-server-2'
    },
    {
      srcAddr: '10.0.2.10',
      dstAddr: '10.0.3.15',
      srcPort: 3306,
      dstPort: 33306,
      protocol: 'TCP',
      bytes: 1024000,
      packets: 512,
      action: 'ACCEPT',
      start: new Date('2024-01-20T10:28:00Z'),
      end: new Date('2024-01-20T10:33:00Z'),
      srcInstance: 'app-server-2',
      dstInstance: 'db-server-1'
    },
    {
      srcAddr: '192.168.1.100',
      dstAddr: '10.0.1.15',
      srcPort: 80,
      dstPort: 443,
      protocol: 'TCP',
      bytes: 512000,
      packets: 256,
      action: 'REJECT',
      start: new Date('2024-01-20T10:25:00Z'),
      end: new Date('2024-01-20T10:25:30Z'),
      srcInstance: 'external',
      dstInstance: 'web-server-1'
    },
    {
      srcAddr: '10.0.1.20',
      dstAddr: '10.0.1.25',
      srcPort: 22,
      dstPort: 22,
      protocol: 'TCP',
      bytes: 8192,
      packets: 16,
      action: 'ACCEPT',
      start: new Date('2024-01-20T10:32:00Z'),
      end: new Date('2024-01-20T10:45:00Z'),
      srcInstance: 'admin-vm',
      dstInstance: 'web-server-2'
    },
    {
      srcAddr: '10.0.2.30',
      dstAddr: '8.8.8.8',
      srcPort: 53,
      dstPort: 53,
      protocol: 'UDP',
      bytes: 1024,
      packets: 2,
      action: 'ACCEPT',
      start: new Date('2024-01-20T10:29:00Z'),
      end: new Date('2024-01-20T10:29:01Z'),
      srcInstance: 'dns-resolver',
      dstInstance: 'external'
    }
  ];

  displayedColumns: string[] = ['srcInstance', 'dstInstance', 'protocol', 'ports', 'bytes', 'packets', 'action', 'duration'];

  // Computed properties for template
  get totalFlowsMB(): number {
    return this.flowLogs.reduce((sum, flow) => sum + flow.bytes, 0) / 1024 / 1024;
  }

  get averageDuration(): number {
    const durations = this.flowLogs.map(flow => (flow.end.getTime() - flow.start.getTime()) / 1000);
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  get acceptedFlowsCount(): number {
    return this.flowLogs.filter(f => f.action === 'ACCEPT').length;
  }

  get rejectedFlowsCount(): number {
    return this.flowLogs.filter(f => f.action === 'REJECT').length;
  }

  constructor() { }

  ngOnInit(): void {
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'ACCEPT': return 'action-accept';
      case 'REJECT': return 'action-reject';
      case 'DROP': return 'action-drop';
      default: return '';
    }
  }

  getProtocolClass(protocol: string): string {
    switch (protocol) {
      case 'TCP': return 'protocol-tcp';
      case 'UDP': return 'protocol-udp';
      case 'ICMP': return 'protocol-icmp';
      default: return 'protocol-other';
    }
  }

  formatDuration(start: Date, end: Date): string {
    const duration = (end.getTime() - start.getTime()) / 1000;
    if (duration < 60) {
      return `${duration.toFixed(1)}s`;
    } else if (duration < 3600) {
      return `${(duration / 60).toFixed(1)}m`;
    } else {
      return `${(duration / 3600).toFixed(1)}h`;
    }
  }

  refreshData(): void {
    // Placeholder for refresh functionality
    console.log('Refreshing VPC Flow Logs data...');
  }

  exportData(): void {
    // Placeholder for export functionality
    console.log('Exporting VPC Flow Logs data...');
  }
}
