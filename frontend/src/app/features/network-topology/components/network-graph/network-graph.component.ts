import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

export interface Node {
  id: string;
  name: string;
  type: 'region' | 'vpc' | 'subnet' | 'instance' | 'service';
  region?: string;
  status: 'healthy' | 'warning' | 'error';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  type: 'network' | 'peering' | 'vpn' | 'interconnect';
}

@Component({
  selector: 'app-network-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="network-graph-container">
      <div class="graph-header">
        <h2>Network Topology</h2>
        <div class="graph-controls">
          <button class="control-btn" (click)="resetZoom()">Reset View</button>
          <button class="control-btn" (click)="toggleSimulation()">
            {{ simulationRunning ? 'Pause' : 'Resume' }}
          </button>
        </div>
      </div>
      <div class="graph-legend">
        <div class="legend-item">
          <div class="legend-color region"></div>
          <span>Regions</span>
        </div>
        <div class="legend-item">
          <div class="legend-color vpc"></div>
          <span>VPCs</span>
        </div>
        <div class="legend-item">
          <div class="legend-color instance"></div>
          <span>Instances</span>
        </div>
        <div class="legend-item">
          <div class="legend-color service"></div>
          <span>Services</span>
        </div>
      </div>
      <svg #networkSvg class="network-svg"></svg>
    </div>
  `,
  styles: [`
    .network-graph-container {
      width: 100%;
      height: 600px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      position: relative;
      background: #fafafa;
    }

    .graph-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
      border-radius: 8px 8px 0 0;
    }

    .graph-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #3c4043;
    }

    .graph-controls {
      display: flex;
      gap: 8px;
    }

    .control-btn {
      padding: 6px 12px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      background: white;
      color: #3c4043;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: #f8f9fa;
      border-color: #1a73e8;
    }

    .graph-legend {
      position: absolute;
      top: 70px;
      right: 16px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
      z-index: 10;
    }

    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      color: #5f6368;
    }

    .legend-item:last-child {
      margin-bottom: 0;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }

    .legend-color.region { background: #1a73e8; }
    .legend-color.vpc { background: #34a853; }
    .legend-color.instance { background: #fbbc04; }
    .legend-color.service { background: #ea4335; }

    .network-svg {
      width: 100%;
      height: calc(100% - 70px);
      display: block;
    }

    :host ::ng-deep .node {
      stroke: #fff;
      stroke-width: 2px;
      cursor: pointer;
    }

    :host ::ng-deep .node.region { fill: #1a73e8; }
    :host ::ng-deep .node.vpc { fill: #34a853; }
    :host ::ng-deep .node.subnet { fill: #9aa0a6; }
    :host ::ng-deep .node.instance { fill: #fbbc04; }
    :host ::ng-deep .node.service { fill: #ea4335; }

    :host ::ng-deep .node.error { fill: #d93025; }
    :host ::ng-deep .node.warning { fill: #f9ab00; }

    :host ::ng-deep .link {
      stroke: #999;
      stroke-opacity: 0.6;
      stroke-width: 2px;
    }

    :host ::ng-deep .link.network { stroke: #1a73e8; }
    :host ::ng-deep .link.peering { stroke: #34a853; }
    :host ::ng-deep .link.vpn { stroke: #fbbc04; }
    :host ::ng-deep .link.interconnect { stroke: #ea4335; }

    :host ::ng-deep .node-label {
      font-family: 'Roboto', sans-serif;
      font-size: 11px;
      fill: #3c4043;
      text-anchor: middle;
      pointer-events: none;
    }

    :host ::ng-deep .node:hover {
      stroke-width: 3px;
      stroke: #1a73e8;
    }
  `]
})
export class NetworkGraphComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('networkSvg', { static: true }) svgElement!: ElementRef<SVGElement>;

  private svg: any;
  private simulation: any;
  public simulationRunning = true;
  private width = 800;
  private height = 530;

  // Demo data
  private nodes: Node[] = [
    { id: 'us-central1', name: 'us-central1', type: 'region', status: 'healthy' },
    { id: 'us-east1', name: 'us-east1', type: 'region', status: 'healthy' },
    { id: 'europe-west1', name: 'europe-west1', type: 'region', status: 'healthy' },
    
    { id: 'vpc-prod', name: 'vpc-production', type: 'vpc', region: 'us-central1', status: 'healthy' },
    { id: 'vpc-staging', name: 'vpc-staging', type: 'vpc', region: 'us-east1', status: 'healthy' },
    { id: 'vpc-dev', name: 'vpc-development', type: 'vpc', region: 'europe-west1', status: 'warning' },
    
    { id: 'web-server-1', name: 'web-server-1', type: 'instance', status: 'healthy' },
    { id: 'web-server-2', name: 'web-server-2', type: 'instance', status: 'healthy' },
    { id: 'db-server', name: 'database-server', type: 'instance', status: 'healthy' },
    { id: 'cache-server', name: 'redis-cache', type: 'instance', status: 'warning' },
    
    { id: 'api-gateway', name: 'API Gateway', type: 'service', status: 'healthy' },
    { id: 'load-balancer', name: 'Load Balancer', type: 'service', status: 'healthy' },
    { id: 'cloud-sql', name: 'Cloud SQL', type: 'service', status: 'healthy' }
  ];

  private links: Link[] = [
    { source: 'us-central1', target: 'vpc-prod', type: 'network' },
    { source: 'us-east1', target: 'vpc-staging', type: 'network' },
    { source: 'europe-west1', target: 'vpc-dev', type: 'network' },
    
    { source: 'vpc-prod', target: 'vpc-staging', type: 'peering' },
    { source: 'vpc-staging', target: 'vpc-dev', type: 'vpn' },
    
    { source: 'vpc-prod', target: 'web-server-1', type: 'network' },
    { source: 'vpc-prod', target: 'web-server-2', type: 'network' },
    { source: 'vpc-prod', target: 'db-server', type: 'network' },
    { source: 'vpc-staging', target: 'cache-server', type: 'network' },
    
    { source: 'load-balancer', target: 'web-server-1', type: 'network' },
    { source: 'load-balancer', target: 'web-server-2', type: 'network' },
    { source: 'api-gateway', target: 'load-balancer', type: 'network' },
    { source: 'db-server', target: 'cloud-sql', type: 'interconnect' }
  ];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializeGraph();
  }

  ngOnDestroy(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  private initializeGraph(): void {
    const element = this.svgElement.nativeElement;
    this.width = element.clientWidth;
    this.height = element.clientHeight;

    this.svg = d3.select(element)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .call(d3.zoom<SVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event: any) => {
          const { transform } = event;
          this.svg.select('.graph-content').attr('transform', transform);
        }));

    const graphContent = this.svg.append('g').attr('class', 'graph-content');

    // Create simulation
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = graphContent.append('g')
      .selectAll('line')
      .data(this.links)
      .enter().append('line')
      .attr('class', (d: Link) => `link ${d.type}`);

    // Create nodes
    const node = graphContent.append('g')
      .selectAll('circle')
      .data(this.nodes)
      .enter().append('circle')
      .attr('class', (d: Node) => `node ${d.type} ${d.status}`)
      .attr('r', (d: Node) => this.getNodeRadius(d.type))
      .call(this.drag());

    // Add labels
    const labels = graphContent.append('g')
      .selectAll('text')
      .data(this.nodes)
      .enter().append('text')
      .attr('class', 'node-label')
      .text((d: Node) => d.name);

    // Add tooltips
    node.append('title')
      .text((d: Node) => `${d.name} (${d.type})\nStatus: ${d.status}`);

    // Update positions on simulation tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y + 5);
    });
  }

  private getNodeRadius(type: string): number {
    switch (type) {
      case 'region': return 20;
      case 'vpc': return 16;
      case 'subnet': return 12;
      case 'instance': return 14;
      case 'service': return 18;
      default: return 12;
    }
  }

  private drag(): any {
    return d3.drag<SVGCircleElement, Node>()
      .on('start', (event: any, d: any) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: any, d: any) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  resetZoom(): void {
    this.svg.transition().duration(750).call(
      d3.zoom<SVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  }

  toggleSimulation(): void {
    if (this.simulationRunning) {
      this.simulation.stop();
    } else {
      this.simulation.restart();
    }
    this.simulationRunning = !this.simulationRunning;
  }
}

