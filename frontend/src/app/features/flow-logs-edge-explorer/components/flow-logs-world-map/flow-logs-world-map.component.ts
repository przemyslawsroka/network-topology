import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import {
  FlowLogsMapService,
  CityTrafficData,
  FlowLogsMapConfig,
  FlowLogsMapQueryResult
} from '../../services/flow-logs-map.service';
import * as d3 from 'd3';
import { hexbin as d3Hexbin, HexbinBin } from 'd3-hexbin';
import * as topojson from 'topojson-client';

@Component({
  selector: 'app-flow-logs-world-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSliderModule
  ],
  templateUrl: './flow-logs-world-map.component.html',
  styleUrls: ['./flow-logs-world-map.component.scss']
})
export class FlowLogsWorldMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  // BigQuery configuration
  datasetPath: string = 'net-top-viz-demo-208511.default_bq_loganalytics._AllLogs';
  config: FlowLogsMapConfig | null = null;
  isConfigValid: boolean = false;
  configError: string = '';

  // Data
  cityData: CityTrafficData[] = [];
  isLoading: boolean = false;
  queryLatency: number = 0;

  // Time range selection
  timeRangeHours: number = 24;
  timeRangeOptions = [
    { value: 1, label: 'Last Hour' },
    { value: 6, label: 'Last 6 Hours' },
    { value: 24, label: 'Last 24 Hours' },
    { value: 168, label: 'Last 7 Days' }
  ];

  // Direction selection
  direction: 'destination' | 'source' | 'both' = 'destination';
  directionOptions = [
    { value: 'destination', label: 'Destinations (Outbound)' },
    { value: 'source', label: 'Sources (Inbound)' },
    { value: 'both', label: 'Both Directions' }
  ];

  // Map settings
  hexRadius: number = 20; // Increased default from 10 to 20 for better visibility
  
  // D3 objects
  private svg: any;
  private projection: any;
  private hexbin: any;

  constructor(private mapService: FlowLogsMapService) {}

  ngOnInit(): void {
    this.validateAndSetConfig();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    // Clean up D3 elements
    if (this.svg) {
      this.svg.selectAll('*').remove();
    }
  }

  /**
   * Validate dataset path and set config
   */
  validateAndSetConfig(): void {
    const validation = this.mapService.validateDatasetPath(this.datasetPath);
    
    if (validation.valid && validation.projectId && validation.datasetId && validation.tableId) {
      this.config = {
        projectId: validation.projectId,
        datasetId: validation.datasetId,
        tableId: validation.tableId
      };
      this.isConfigValid = true;
      this.configError = '';
    } else {
      this.config = null;
      this.isConfigValid = false;
      this.configError = validation.error || 'Invalid configuration';
    }
  }

  /**
   * Initialize D3 map
   */
  private initializeMap(): void {
    if (!this.mapContainer) {
      console.error('Map container not found');
      return;
    }

    const container = this.mapContainer.nativeElement;
    
    // Clear any existing SVG first
    d3.select(container).selectAll('svg').remove();
    
    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : 1200;
    const height = 800; // Increased from 600 to 800

    // Create SVG with explicit dimensions
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width + 'px')
      .attr('height', height + 'px')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block')
      .style('border', '1px solid #ddd');

    // Create projection (Mercator for world map)
    this.projection = d3.geoMercator()
      .center([0, 20])
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);

    // Create hexbin generator
    this.hexbin = d3Hexbin()
      .radius(this.hexRadius)
      .extent([[0, 0], [width, height]]);

    // Draw world map outline
    this.drawWorldMap(width, height);
  }

  /**
   * Draw world map outline
   */
  private async drawWorldMap(width: number, height: number): Promise<void> {
    const path = d3.geoPath().projection(this.projection);

    // Add ocean background
    this.svg.append('rect')
      .attr('class', 'ocean')
      .attr('width', width)
      .attr('height', height)
      .style('fill', '#d4e6f1');

    // Add graticule (grid lines)
    const graticule = d3.geoGraticule();
    this.svg.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', 0.5)
      .style('opacity', 0.5);

    // Add sphere outline
    this.svg.append('path')
      .datum({ type: 'Sphere' } as any)
      .attr('class', 'sphere')
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', '#666')
      .style('stroke-width', 2);

    // Load world countries from TopoJSON
    try {
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const world = await response.json();
      
      // Convert TopoJSON to GeoJSON
      const countries: any = topojson.feature(world, world.objects.countries as any);

      if (countries && countries.features) {
        this.svg.append('g')
          .attr('class', 'countries')
          .selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path)
          .style('fill', '#e8f4ea')
          .style('stroke', '#95a5a6')
          .style('stroke-width', 0.5);
      }
    } catch (error) {
      console.warn('Could not load world map data, using simple outline only');
    }
  }

  /**
   * Fetch city traffic data
   */
  fetchData(): void {
    if (!this.config || !this.isConfigValid) {
      console.error('Invalid BigQuery configuration');
      return;
    }

    this.isLoading = true;
    this.cityData = [];

    this.mapService.getCityTrafficData(
      this.config,
      this.timeRangeHours,
      this.direction as any
    ).subscribe({
      next: (result: FlowLogsMapQueryResult) => {
        this.cityData = result.cities.filter(c => c.latitude !== null && c.longitude !== null);
        this.queryLatency = result.latency;
        this.isLoading = false;
        this.updateMap();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error fetching city traffic data:', error);
      }
    });
  }

  /**
   * Update map with hexbin visualization
   */
  private updateMap(): void {
    if (!this.svg || !this.cityData.length) return;

    // Convert city coordinates to screen coordinates
    const points: Array<[number, number] & { data: CityTrafficData }> = this.cityData
      .filter(city => city.latitude !== null && city.longitude !== null)
      .map(city => {
        const coords = this.projection([city.longitude!, city.latitude!]);
        const point: any = coords;
        point.data = city;
        return point;
      });

    // Generate hexbins
    const bins = this.hexbin(points);

    // Calculate metrics for each bin
    const binsWithData = bins.map((bin: any) => {
      const totalBytes = d3.sum(bin, (d: any) => d.data.totalBytes);
      const avgLatency = d3.mean(bin, (d: any) => d.data.avgLatencyMs || 0) || 0;
      const cities = bin.map((d: any) => d.data);
      
      return {
        ...bin,
        totalBytes,
        avgLatency,
        cities
      };
    });

    // Scales
    const maxBytes = d3.max(binsWithData, (d: any) => d.totalBytes) || 1;
    const maxLatency = d3.max(binsWithData, (d: any) => d.avgLatency) || 100;

    const radiusScale = d3.scaleSqrt()
      .domain([0 as number, maxBytes as number])
      .range([5, this.hexRadius * 4]); // Increased from [2, radius*2] to [5, radius*4] for visibility

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([maxLatency as number, 0 as number]); // Reversed: high latency = red, low latency = green

    // Remove old hexagons (handled in hexagon group creation now)
    // this.svg.selectAll('.hexagon').remove();

    // Add tooltip div
    let tooltipDiv = d3.select('body').select<HTMLDivElement>('.map-tooltip');
    if (tooltipDiv.empty()) {
      tooltipDiv = d3.select('body').append<HTMLDivElement>('div')
        .attr('class', 'map-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('font-size', '12px')
        .style('z-index', '1000');
    }

    // Create a group for hexagons
    let hexagonGroup = this.svg.select('.hexagon-group');
    if (hexagonGroup.empty()) {
      hexagonGroup = this.svg.append('g').attr('class', 'hexagon-group');
    }
    hexagonGroup.selectAll('.hexagon').remove();

    // Draw hexagons
    const hexagons = hexagonGroup.selectAll('.hexagon')
      .data(binsWithData)
      .enter()
      .append('path')
      .attr('class', 'hexagon')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .attr('d', (d: any) => this.hexbin.hexagon(radiusScale(d.totalBytes)))
      .style('fill', (d: any) => colorScale(d.avgLatency))
      .style('stroke', '#333')
      .style('stroke-width', 1.5)
      .style('opacity', 0.85)
      .on('mouseover', (event: any, d: any) => {
        tooltipDiv
          .style('opacity', 1)
          .html(this.formatTooltip(d))
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', (event: any) => {
        tooltipDiv
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        tooltipDiv.style('opacity', 0);
      });

    // Add legend
    this.addLegend(colorScale, radiusScale, maxBytes as number);
  }

  /**
   * Format tooltip content
   */
  private formatTooltip(bin: any): string {
    const cities = bin.cities.map((c: CityTrafficData) => c.city).join(', ');
    const bytes = this.mapService.formatBytes(bin.totalBytes);
    const latency = bin.avgLatency > 0 ? bin.avgLatency.toFixed(2) + ' ms' : 'N/A';
    
    return `
      <div><strong>${cities}</strong></div>
      <div>Traffic: ${bytes}</div>
      <div>Avg Latency: ${latency}</div>
      <div>Cities: ${bin.cities.length}</div>
    `;
  }

  /**
   * Add legend to map
   */
  private addLegend(colorScale: any, radiusScale: any, maxBytes: number): void {
    // Remove old legend
    this.svg.selectAll('.legend').remove();

    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = 20;
    const legendY = 20;

    // Color legend (latency)
    const colorLegend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    colorLegend.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Latency (ms)');

    const gradient = colorLegend.append('defs')
      .append('linearGradient')
      .attr('id', 'latency-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    // Create smooth gradient: green (fast) → yellow (medium) → red (slow)
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.interpolateRdYlGn(1)); // Green (low/fast)

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', d3.interpolateRdYlGn(0.5)); // Yellow (medium)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d3.interpolateRdYlGn(0)); // Red (high/slow)

    colorLegend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#latency-gradient)');

    colorLegend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .style('font-size', '10px')
      .text('Low (Fast)');

    colorLegend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .style('font-size', '10px')
      .style('text-anchor', 'end')
      .text('High (Slow)');

    // Size legend (traffic volume)
    const sizeLegend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY + 60})`);

    sizeLegend.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Traffic Volume');

    const sizeValues = [maxBytes * 0.25, maxBytes * 0.5, maxBytes * 0.75, maxBytes];
    const sizeLabels = sizeValues.map(v => this.mapService.formatBytes(v));

    sizeValues.forEach((value, i) => {
      const radius = radiusScale(value);
      const cx = i * 50 + 25;
      
      sizeLegend.append('circle')
        .attr('cx', cx)
        .attr('cy', 20)
        .attr('r', radius)
        .style('fill', '#666')
        .style('opacity', 0.5);

      sizeLegend.append('text')
        .attr('x', cx)
        .attr('y', 45)
        .style('font-size', '9px')
        .style('text-anchor', 'middle')
        .text(sizeLabels[i]);
    });
  }

  /**
   * Update hex radius and redraw
   */
  updateHexRadius(): void {
    if (this.hexbin) {
      this.hexbin.radius(this.hexRadius);
      this.updateMap();
    }
  }

  /**
   * Get stats summary
   */
  getTotalTraffic(): string {
    const total = d3.sum(this.cityData, d => d.totalBytes);
    return this.mapService.formatBytes(total);
  }

  getAvgLatency(): string {
    const latencies = this.cityData.filter(d => d.avgLatencyMs !== null).map(d => d.avgLatencyMs!);
    if (latencies.length === 0) return 'N/A';
    const avg = d3.mean(latencies) || 0;
    return avg.toFixed(2) + ' ms';
  }

  getCityCount(): number {
    return this.cityData.length;
  }

  /**
   * Format label for slider
   */
  formatLabel(value: number): string {
    return `${value}`;
  }
}
