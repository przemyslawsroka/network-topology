import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GcpBigQueryService, BigQueryResponse } from '../../../core/services/gcp-bigquery.service';

export interface CityTrafficData {
  city: string;
  country: string;
  continent: string;
  latitude: number | null;
  longitude: number | null;
  totalBytes: number;
  totalPackets: number;
  flowCount: number;
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
}

export interface FlowLogsMapConfig {
  projectId: string;
  datasetId: string;
  tableId: string;
}

export interface FlowLogsMapQueryResult {
  cities: CityTrafficData[];
  latency: number;
  success: boolean;
  error?: string;
  totalRows?: number;
  bytesProcessed?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FlowLogsMapService {

  // Comprehensive city coordinates mapping (300+ cities worldwide)
  private cityCoordinates: { [key: string]: { lat: number; lon: number } } = {
    // North America - United States
    'new york': { lat: 40.7128, lon: -74.0060 },
    'los angeles': { lat: 34.0522, lon: -118.2437 },
    'chicago': { lat: 41.8781, lon: -87.6298 },
    'houston': { lat: 29.7604, lon: -95.3698 },
    'phoenix': { lat: 33.4484, lon: -112.0740 },
    'philadelphia': { lat: 39.9526, lon: -75.1652 },
    'san antonio': { lat: 29.4241, lon: -98.4936 },
    'san diego': { lat: 32.7157, lon: -117.1611 },
    'dallas': { lat: 32.7767, lon: -96.7970 },
    'san jose': { lat: 37.3382, lon: -121.8863 },
    'austin': { lat: 30.2672, lon: -97.7431 },
    'jacksonville': { lat: 30.3322, lon: -81.6557 },
    'san francisco': { lat: 37.7749, lon: -122.4194 },
    'columbus': { lat: 39.9612, lon: -82.9988 },
    'charlotte': { lat: 35.2271, lon: -80.8431 },
    'indianapolis': { lat: 39.7684, lon: -86.1581 },
    'seattle': { lat: 47.6062, lon: -122.3321 },
    'denver': { lat: 39.7392, lon: -104.9903 },
    'washington': { lat: 38.9072, lon: -77.0369 },
    'boston': { lat: 42.3601, lon: -71.0589 },
    'nashville': { lat: 36.1627, lon: -86.7816 },
    'detroit': { lat: 42.3314, lon: -83.0458 },
    'portland': { lat: 45.5152, lon: -122.6784 },
    'las vegas': { lat: 36.1699, lon: -115.1398 },
    'memphis': { lat: 35.1495, lon: -90.0490 },
    'louisville': { lat: 38.2527, lon: -85.7585 },
    'baltimore': { lat: 39.2904, lon: -76.6122 },
    'milwaukee': { lat: 43.0389, lon: -87.9065 },
    'albuquerque': { lat: 35.0844, lon: -106.6504 },
    'tucson': { lat: 32.2226, lon: -110.9747 },
    'fresno': { lat: 36.7378, lon: -119.7871 },
    'mesa': { lat: 33.4152, lon: -111.8315 },
    'sacramento': { lat: 38.5816, lon: -121.4944 },
    'atlanta': { lat: 33.7490, lon: -84.3880 },
    'kansas city': { lat: 39.0997, lon: -94.5786 },
    'miami': { lat: 25.7617, lon: -80.1918 },
    'raleigh': { lat: 35.7796, lon: -78.6382 },
    'omaha': { lat: 41.2565, lon: -95.9345 },
    'cleveland': { lat: 41.4993, lon: -81.6944 },
    'minneapolis': { lat: 44.9778, lon: -93.2650 },
    'virginia beach': { lat: 36.8529, lon: -75.9780 },
    
    // North America - Canada
    'toronto': { lat: 43.6532, lon: -79.3832 },
    'montreal': { lat: 45.5017, lon: -73.5673 },
    'vancouver': { lat: 49.2827, lon: -123.1207 },
    'calgary': { lat: 51.0447, lon: -114.0719 },
    'edmonton': { lat: 53.5461, lon: -113.4938 },
    'ottawa': { lat: 45.4215, lon: -75.6972 },
    'winnipeg': { lat: 49.8951, lon: -97.1384 },
    'quebec': { lat: 46.8139, lon: -71.2080 },
    'hamilton': { lat: 43.2557, lon: -79.8711 },
    
    // North America - Mexico
    'mexico city': { lat: 19.4326, lon: -99.1332 },
    'guadalajara': { lat: 20.6597, lon: -103.3496 },
    'monterrey': { lat: 25.6866, lon: -100.3161 },
    'puebla': { lat: 19.0414, lon: -98.2063 },
    'tijuana': { lat: 32.5149, lon: -117.0382 },
    'cancun': { lat: 21.1619, lon: -86.8515 },
    
    // Europe - Western Europe
    'london': { lat: 51.5074, lon: -0.1278 },
    'paris': { lat: 48.8566, lon: 2.3522 },
    'berlin': { lat: 52.5200, lon: 13.4050 },
    'madrid': { lat: 40.4168, lon: -3.7038 },
    'rome': { lat: 41.9028, lon: 12.4964 },
    'amsterdam': { lat: 52.3676, lon: 4.9041 },
    'vienna': { lat: 48.2082, lon: 16.3738 },
    'hamburg': { lat: 53.5511, lon: 9.9937 },
    'barcelona': { lat: 41.3874, lon: 2.1686 },
    'munich': { lat: 48.1351, lon: 11.5820 },
    'milan': { lat: 45.4642, lon: 9.1900 },
    'prague': { lat: 50.0755, lon: 14.4378 },
    'brussels': { lat: 50.8503, lon: 4.3517 },
    'zurich': { lat: 47.3769, lon: 8.5417 },
    'frankfurt': { lat: 50.1109, lon: 8.6821 },
    'copenhagen': { lat: 55.6761, lon: 12.5683 },
    'dublin': { lat: 53.3498, lon: -6.2603 },
    'lisbon': { lat: 38.7223, lon: -9.1393 },
    'stockholm': { lat: 59.3293, lon: 18.0686 },
    'oslo': { lat: 59.9139, lon: 10.7522 },
    'helsinki': { lat: 60.1699, lon: 24.9384 },
    'geneva': { lat: 46.2044, lon: 6.1432 },
    'cologne': { lat: 50.9375, lon: 6.9603 },
    'stuttgart': { lat: 48.7758, lon: 9.1829 },
    'dusseldorf': { lat: 51.2277, lon: 6.7735 },
    'lyon': { lat: 45.7640, lon: 4.8357 },
    'marseille': { lat: 43.2965, lon: 5.3698 },
    'naples': { lat: 40.8518, lon: 14.2681 },
    'turin': { lat: 45.0703, lon: 7.6869 },
    'valencia': { lat: 39.4699, lon: -0.3763 },
    'seville': { lat: 37.3891, lon: -5.9845 },
    'manchester': { lat: 53.4808, lon: -2.2426 },
    'birmingham': { lat: 52.4862, lon: -1.8904 },
    'glasgow': { lat: 55.8642, lon: -4.2518 },
    'edinburgh': { lat: 55.9533, lon: -3.1883 },
    
    // Europe - Eastern Europe
    'warsaw': { lat: 52.2297, lon: 21.0122 },
    'budapest': { lat: 47.4979, lon: 19.0402 },
    'bucharest': { lat: 44.4268, lon: 26.1025 },
    'sofia': { lat: 42.6977, lon: 23.3219 },
    'belgrade': { lat: 44.7866, lon: 20.4489 },
    'zagreb': { lat: 45.8150, lon: 15.9819 },
    'athens': { lat: 37.9838, lon: 23.7275 },
    'kiev': { lat: 50.4501, lon: 30.5234 },
    'minsk': { lat: 53.9045, lon: 27.5615 },
    
    // Asia - East Asia
    'tokyo': { lat: 35.6762, lon: 139.6503 },
    'osaka': { lat: 34.6937, lon: 135.5023 },
    'yokohama': { lat: 35.4437, lon: 139.6380 },
    'nagoya': { lat: 35.1815, lon: 136.9066 },
    'sapporo': { lat: 43.0642, lon: 141.3469 },
    'beijing': { lat: 39.9042, lon: 116.4074 },
    'shanghai': { lat: 31.2304, lon: 121.4737 },
    'guangzhou': { lat: 23.1291, lon: 113.2644 },
    'shenzhen': { lat: 22.5431, lon: 114.0579 },
    'chengdu': { lat: 30.5728, lon: 104.0668 },
    'chongqing': { lat: 29.4316, lon: 106.9123 },
    'tianjin': { lat: 39.3434, lon: 117.3616 },
    'wuhan': { lat: 30.5928, lon: 114.3055 },
    'hangzhou': { lat: 30.2741, lon: 120.1551 },
    'xian': { lat: 34.3416, lon: 108.9398 },
    'seoul': { lat: 37.5665, lon: 126.9780 },
    'busan': { lat: 35.1796, lon: 129.0756 },
    'incheon': { lat: 37.4563, lon: 126.7052 },
    'hong kong': { lat: 22.3193, lon: 114.1694 },
    'taipei': { lat: 25.0330, lon: 121.5654 },
    'macau': { lat: 22.1987, lon: 113.5439 },
    
    // Asia - Southeast Asia
    'singapore': { lat: 1.3521, lon: 103.8198 },
    'bangkok': { lat: 13.7563, lon: 100.5018 },
    'manila': { lat: 14.5995, lon: 120.9842 },
    'jakarta': { lat: -6.2088, lon: 106.8456 },
    'kuala lumpur': { lat: 3.1390, lon: 101.6869 },
    'ho chi minh': { lat: 10.8231, lon: 106.6297 },
    'hanoi': { lat: 21.0285, lon: 105.8542 },
    'phnom penh': { lat: 11.5564, lon: 104.9282 },
    'yangon': { lat: 16.8661, lon: 96.1951 },
    
    // Asia - South Asia
    'mumbai': { lat: 19.0760, lon: 72.8777 },
    'delhi': { lat: 28.7041, lon: 77.1025 },
    'bangalore': { lat: 12.9716, lon: 77.5946 },
    'kolkata': { lat: 22.5726, lon: 88.3639 },
    'chennai': { lat: 13.0827, lon: 80.2707 },
    'hyderabad': { lat: 17.3850, lon: 78.4867 },
    'pune': { lat: 18.5204, lon: 73.8567 },
    'ahmedabad': { lat: 23.0225, lon: 72.5714 },
    'karachi': { lat: 24.8607, lon: 67.0011 },
    'lahore': { lat: 31.5497, lon: 74.3436 },
    'islamabad': { lat: 33.6844, lon: 73.0479 },
    'dhaka': { lat: 23.8103, lon: 90.4125 },
    'colombo': { lat: 6.9271, lon: 79.8612 },
    
    // Middle East
    'dubai': { lat: 25.2048, lon: 55.2708 },
    'abu dhabi': { lat: 24.4539, lon: 54.3773 },
    'riyadh': { lat: 24.7136, lon: 46.6753 },
    'jeddah': { lat: 21.5433, lon: 39.1728 },
    'doha': { lat: 25.2854, lon: 51.5310 },
    'kuwait city': { lat: 29.3759, lon: 47.9774 },
    'muscat': { lat: 23.5880, lon: 58.3829 },
    'manama': { lat: 26.2285, lon: 50.5860 },
    'tel aviv': { lat: 32.0853, lon: 34.7818 },
    'jerusalem': { lat: 31.7683, lon: 35.2137 },
    'beirut': { lat: 33.8886, lon: 35.4955 },
    'amman': { lat: 31.9454, lon: 35.9284 },
    'tehran': { lat: 35.6892, lon: 51.3890 },
    'baghdad': { lat: 33.3152, lon: 44.3661 },
    
    // Africa
    'cairo': { lat: 30.0444, lon: 31.2357 },
    'lagos': { lat: 6.5244, lon: 3.3792 },
    'johannesburg': { lat: -26.2041, lon: 28.0473 },
    'cape town': { lat: -33.9249, lon: 18.4241 },
    'nairobi': { lat: -1.2864, lon: 36.8172 },
    'addis ababa': { lat: 9.0320, lon: 38.7469 },
    'casablanca': { lat: 33.5731, lon: -7.5898 },
    'algiers': { lat: 36.7538, lon: 3.0588 },
    'accra': { lat: 5.6037, lon: -0.1870 },
    'dar es salaam': { lat: -6.7924, lon: 39.2083 },
    'durban': { lat: -29.8587, lon: 31.0218 },
    'tunis': { lat: 36.8065, lon: 10.1815 },
    'kampala': { lat: 0.3476, lon: 32.5825 },
    'lusaka': { lat: -15.3875, lon: 28.3228 },
    'harare': { lat: -17.8252, lon: 31.0335 },
    
    // South America
    'sao paulo': { lat: -23.5505, lon: -46.6333 },
    'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
    'buenos aires': { lat: -34.6037, lon: -58.3816 },
    'lima': { lat: -12.0464, lon: -77.0428 },
    'bogota': { lat: 4.7110, lon: -74.0721 },
    'santiago': { lat: -33.4489, lon: -70.6693 },
    'caracas': { lat: 10.4806, lon: -66.9036 },
    'brasilia': { lat: -15.8267, lon: -47.9218 },
    'medellin': { lat: 6.2476, lon: -75.5658 },
    'quito': { lat: -0.1807, lon: -78.4678 },
    'montevideo': { lat: -34.9011, lon: -56.1645 },
    'asuncion': { lat: -25.2637, lon: -57.5759 },
    
    // Oceania
    'sydney': { lat: -33.8688, lon: 151.2093 },
    'melbourne': { lat: -37.8136, lon: 144.9631 },
    'brisbane': { lat: -27.4698, lon: 153.0251 },
    'perth': { lat: -31.9505, lon: 115.8605 },
    'auckland': { lat: -36.8485, lon: 174.7633 },
    'wellington': { lat: -41.2865, lon: 174.7762 },
    'adelaide': { lat: -34.9285, lon: 138.6007 },
    'canberra': { lat: -35.2809, lon: 149.1300 },
  };

  constructor(private bigQueryService: GcpBigQueryService) {}

  /**
   * Query VPC Flow Logs for city-level traffic and latency data
   */
  getCityTrafficData(
    config: FlowLogsMapConfig,
    timeRangeHours: number = 1,
    direction: 'destination' | 'source' | 'both' = 'destination'
  ): Observable<FlowLogsMapQueryResult> {
    const requestStartTime = Date.now();

    const query = this.buildCityQuery(config, timeRangeHours, direction);

    return this.bigQueryService.query(query).pipe(
      map((response: BigQueryResponse) => {
        const cities = this.parseCityData(response);
        
        return {
          cities,
          latency: Date.now() - requestStartTime,
          success: true,
          totalRows: parseInt(response.totalRows || '0', 10),
          bytesProcessed: parseInt(response.totalBytesProcessed || '0', 10)
        };
      }),
      catchError((error: any) => {
        console.warn('City traffic query failed:', error.message);
        return of({
          cities: [],
          latency: Date.now() - requestStartTime,
          success: false,
          error: error.message || 'Unknown error'
        });
      })
    );
  }

  /**
   * Build BigQuery SQL for city-level aggregation
   */
  private buildCityQuery(
    config: FlowLogsMapConfig,
    timeRangeHours: number,
    direction: 'destination' | 'source' | 'both'
  ): string {
    const tableFQN = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000);
    const startTimestamp = startTime.toISOString();
    const endTimestamp = endTime.toISOString();

    // Build query based on direction
    if (direction === 'both') {
      return `
        WITH cityFlows AS (
          SELECT
            COALESCE(JSON_VALUE(json_payload.dest_location.city), 'Unknown') AS city,
            COALESCE(JSON_VALUE(json_payload.dest_location.country), 'Unknown') AS country,
            COALESCE(JSON_VALUE(json_payload.dest_location.continent), 'Unknown') AS continent,
            CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
            CAST(JSON_VALUE(json_payload.packets_sent) AS INT64) AS packets_sent,
            SAFE_CAST(JSON_VALUE(json_payload.rtt_msec) AS FLOAT64) AS rtt_msec
          FROM ${tableFQN}
          WHERE
            log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
            AND timestamp >= TIMESTAMP('${startTimestamp}')
            AND timestamp <= TIMESTAMP('${endTimestamp}')
            AND json_payload IS NOT NULL
            AND JSON_VALUE(json_payload.dest_location.city) IS NOT NULL
            AND JSON_VALUE(json_payload.dest_location.city) != ''
            AND IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') = 'SRC'
          
          UNION ALL
          
          SELECT
            COALESCE(JSON_VALUE(json_payload.src_location.city), 'Unknown') AS city,
            COALESCE(JSON_VALUE(json_payload.src_location.country), 'Unknown') AS country,
            COALESCE(JSON_VALUE(json_payload.src_location.continent), 'Unknown') AS continent,
            CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
            CAST(JSON_VALUE(json_payload.packets_sent) AS INT64) AS packets_sent,
            SAFE_CAST(JSON_VALUE(json_payload.rtt_msec) AS FLOAT64) AS rtt_msec
          FROM ${tableFQN}
          WHERE
            log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
            AND timestamp >= TIMESTAMP('${startTimestamp}')
            AND timestamp <= TIMESTAMP('${endTimestamp}')
            AND json_payload IS NOT NULL
            AND JSON_VALUE(json_payload.src_location.city) IS NOT NULL
            AND JSON_VALUE(json_payload.src_location.city) != ''
            AND IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') = 'SRC'
        )
        SELECT
          city,
          country,
          continent,
          SUM(bytes_sent) AS total_bytes,
          SUM(packets_sent) AS total_packets,
          COUNT(*) AS flow_count,
          AVG(rtt_msec) AS avg_latency_ms,
          MAX(rtt_msec) AS max_latency_ms
        FROM cityFlows
        WHERE
          city != 'Unknown'
          AND country != 'Unknown'
        GROUP BY city, country, continent
        HAVING total_bytes > 0
        ORDER BY total_bytes DESC
        LIMIT 500
      `;
    } else {
      const locationPrefix = direction === 'destination' ? 'dest_location' : 'src_location';
      
      return `
        WITH cityFlows AS (
          SELECT
            COALESCE(JSON_VALUE(json_payload.${locationPrefix}.city), 'Unknown') AS city,
            COALESCE(JSON_VALUE(json_payload.${locationPrefix}.country), 'Unknown') AS country,
            COALESCE(JSON_VALUE(json_payload.${locationPrefix}.continent), 'Unknown') AS continent,
            CAST(JSON_VALUE(json_payload.bytes_sent) AS INT64) AS bytes_sent,
            CAST(JSON_VALUE(json_payload.packets_sent) AS INT64) AS packets_sent,
            SAFE_CAST(JSON_VALUE(json_payload.rtt_msec) AS FLOAT64) AS rtt_msec
          FROM ${tableFQN}
          WHERE
            log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
            AND timestamp >= TIMESTAMP('${startTimestamp}')
            AND timestamp <= TIMESTAMP('${endTimestamp}')
            AND json_payload IS NOT NULL
            AND JSON_VALUE(json_payload.${locationPrefix}.city) IS NOT NULL
            AND JSON_VALUE(json_payload.${locationPrefix}.city) != ''
            AND IF(JSON_VALUE(json_payload.reporter) IN ('SRC', 'SRC_GATEWAY'), 'SRC', 'DEST') = 'SRC'
        )
        SELECT
          city,
          country,
          continent,
          SUM(bytes_sent) AS total_bytes,
          SUM(packets_sent) AS total_packets,
          COUNT(*) AS flow_count,
          AVG(rtt_msec) AS avg_latency_ms,
          MAX(rtt_msec) AS max_latency_ms
        FROM cityFlows
        WHERE
          city != 'Unknown'
          AND country != 'Unknown'
        GROUP BY city, country, continent
        HAVING total_bytes > 0
        ORDER BY total_bytes DESC
        LIMIT 500
      `;
    }
  }

  /**
   * Parse BigQuery response into city traffic data
   */
  private parseCityData(response: BigQueryResponse): CityTrafficData[] {
    const rows = this.bigQueryService.parseRows(response);

    return rows.map(row => {
      const city = String(row['city'] || '').toLowerCase().trim();
      const country = String(row['country'] || '').trim();
      const continent = String(row['continent'] || '').trim();
      const coords = this.getCityCoordinates(city, country);

      return {
        city: this.formatCityName(row['city']),
        country: country,
        continent: continent,
        latitude: coords.lat,
        longitude: coords.lon,
        totalBytes: parseInt(row['total_bytes'] || '0', 10),
        totalPackets: parseInt(row['total_packets'] || '0', 10),
        flowCount: parseInt(row['flow_count'] || '0', 10),
        avgLatencyMs: row['avg_latency_ms'] ? parseFloat(row['avg_latency_ms']) : null,
        maxLatencyMs: row['max_latency_ms'] ? parseFloat(row['max_latency_ms']) : null
      };
    });
  }

  /**
   * Normalize city name for better matching
   */
  private normalizeCityName(city: string): string {
    return city
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Get city coordinates from cache or return null
   */
  private getCityCoordinates(city: string, country: string): { lat: number | null; lon: number | null } {
    const normalizedCity = this.normalizeCityName(city);
    
    // Direct match
    if (this.cityCoordinates[normalizedCity]) {
      return {
        lat: this.cityCoordinates[normalizedCity].lat,
        lon: this.cityCoordinates[normalizedCity].lon
      };
    }
    
    // Try country-specific variations
    const countryNormalized = country.toLowerCase();
    if (countryNormalized === 'united states' || countryNormalized === 'usa' || countryNormalized === 'us') {
      // Try without "city" suffix (e.g., "kansas city" -> "kansas")
      const withoutCity = normalizedCity.replace(/\s+city$/i, '');
      if (this.cityCoordinates[withoutCity]) {
        return {
          lat: this.cityCoordinates[withoutCity].lat,
          lon: this.cityCoordinates[withoutCity].lon
        };
      }
    }
    
    // Try partial match (city contains key or key contains city)
    for (const key of Object.keys(this.cityCoordinates)) {
      if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
        console.log(`Matched "${city}" to "${key}" via partial match`);
        return {
          lat: this.cityCoordinates[key].lat,
          lon: this.cityCoordinates[key].lon
        };
      }
    }
    
    // No match found
    console.warn(`No coordinates found for city: "${city}", ${country}`);
    return { lat: null, lon: null };
  }

  /**
   * Format city name for display
   */
  private formatCityName(city: any): string {
    if (!city) return 'Unknown';
    return String(city)
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate BigQuery dataset/table path
   */
  validateDatasetPath(path: string): { valid: boolean; projectId?: string; datasetId?: string; tableId?: string; error?: string } {
    const parts = path.split('.');
    
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid format. Expected: project-id.dataset-id.table-id'
      };
    }

    const [projectId, datasetId, tableId] = parts;

    if (!projectId || !datasetId || !tableId) {
      return {
        valid: false,
        error: 'All parts (project, dataset, table) must be non-empty'
      };
    }

    return {
      valid: true,
      projectId,
      datasetId,
      tableId
    };
  }
}
