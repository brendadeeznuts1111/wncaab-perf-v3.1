/**
 * Spline Renderer - Core Rendering Engine
 * 
 * Separated from API server to allow CLI usage without starting server
 */

export interface SplinePoint {
  x: number;
  y: number;
  t: number;
}

export interface SplineConfig {
  type: 'catmull-rom' | 'bezier' | 'cubic' | 'linear';
  points: number;
  tension?: number;
  closed?: boolean;
}

export class SplineRenderer {
  /**
   * Generate spline path with specified number of points
   */
  render(config: SplineConfig): SplinePoint[] {
    const { type, points, tension = 0.5, closed = false } = config;
    const path: SplinePoint[] = [];

    // Generate control points
    const controlPoints = this.generateControlPoints(points);

    // Render based on type
    switch (type) {
      case 'catmull-rom':
        return this.renderCatmullRom(controlPoints, points, tension, closed);
      case 'bezier':
        return this.renderBezier(controlPoints, points);
      case 'cubic':
        return this.renderCubic(controlPoints, points);
      case 'linear':
        return this.renderLinear(controlPoints, points);
      default:
        return this.renderCatmullRom(controlPoints, points, tension, closed);
    }
  }

  /**
   * Predict next N points based on existing path
   */
  predict(path: SplinePoint[], horizon: number): SplinePoint[] {
    if (path.length < 2) return [];

    // Use last 4 points for prediction
    const lastPoints = path.slice(-4);
    const predicted: SplinePoint[] = [];

    // Extrapolate using Catmull-Rom continuation
    for (let i = 0; i < horizon; i++) {
      const t = 1 + (i / horizon);
      const point = this.extrapolateCatmullRom(lastPoints, t);
      predicted.push(point);
    }

    return predicted;
  }

  private generateControlPoints(count: number): SplinePoint[] {
    const points: SplinePoint[] = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.sin(i * 0.1) * 100 + i * 10,
        y: Math.cos(i * 0.1) * 100 + i * 5,
        t: i / count,
      });
    }
    return points;
  }

  private renderCatmullRom(controlPoints: SplinePoint[], resolution: number, tension: number, closed: boolean): SplinePoint[] {
    const path: SplinePoint[] = [];
    const n = controlPoints.length;

    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1);
      const segment = Math.floor(t * (n - 1));
      const localT = (t * (n - 1)) - segment;

      let p0, p1, p2, p3;

      if (closed) {
        p0 = controlPoints[(segment - 1 + n) % n];
        p1 = controlPoints[segment % n];
        p2 = controlPoints[(segment + 1) % n];
        p3 = controlPoints[(segment + 2) % n];
      } else {
        p0 = controlPoints[Math.max(0, segment - 1)];
        p1 = controlPoints[segment];
        p2 = controlPoints[Math.min(n - 1, segment + 1)];
        p3 = controlPoints[Math.min(n - 1, segment + 2)];
      }

      const point = this.catmullRom(p0, p1, p2, p3, localT, tension);
      path.push(point);
    }

    return path;
  }

  private renderBezier(controlPoints: SplinePoint[], resolution: number): SplinePoint[] {
    const path: SplinePoint[] = [];
    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1);
      const point = this.bezier(controlPoints, t);
      path.push(point);
    }
    return path;
  }

  private renderCubic(controlPoints: SplinePoint[], resolution: number): SplinePoint[] {
    return this.renderBezier(controlPoints, resolution);
  }

  private renderLinear(controlPoints: SplinePoint[], resolution: number): SplinePoint[] {
    const path: SplinePoint[] = [];
    const step = (controlPoints.length - 1) / (resolution - 1);
    
    for (let i = 0; i < resolution; i++) {
      const idx = i * step;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const t = idx - lower;

      const p1 = controlPoints[lower];
      const p2 = controlPoints[Math.min(upper, controlPoints.length - 1)];
      
      path.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        t: i / (resolution - 1),
      });
    }

    return path;
  }

  private catmullRom(p0: SplinePoint, p1: SplinePoint, p2: SplinePoint, p3: SplinePoint, t: number, tension: number): SplinePoint {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ) * tension;

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ) * tension;

    return { x, y, t };
  }

  private bezier(points: SplinePoint[], t: number): SplinePoint {
    const n = points.length - 1;
    let x = 0, y = 0;

    for (let i = 0; i <= n; i++) {
      const binom = this.binomialCoefficient(n, i);
      const term = binom * Math.pow(1 - t, n - i) * Math.pow(t, i);
      x += points[i].x * term;
      y += points[i].y * term;
    }

    return { x, y, t };
  }

  private binomialCoefficient(n: number, k: number): number {
    if (k > n - k) k = n - k;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return result;
  }

  private extrapolateCatmullRom(points: SplinePoint[], t: number): SplinePoint {
    if (points.length < 4) {
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      return {
        x: last.x + (last.x - secondLast.x) * t,
        y: last.y + (last.y - secondLast.y) * t,
        t: 1 + t,
      };
    }

    const [p0, p1, p2, p3] = points.slice(-4);
    return this.catmullRom(p0, p1, p2, p3, t, 0.5);
  }
}

