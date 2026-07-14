export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Catmull-Rom -> cubic Bezier conversion, producing the same kind of smooth
 * curve as the hand-drawn path in the original dashboard.html hero chart,
 * but generated from real data points instead of a fixed `d` string.
 */
export function buildSmoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  let path = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

export function buildAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = buildSmoothLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
}

/** Scales raw data values into an SVG viewBox, y-axis flipped (higher value = higher up). */
export function scaleToViewBox(
  values: number[],
  viewBoxWidth: number,
  viewBoxHeight: number,
  topPadding = 10,
): ChartPoint[] {
  if (values.length === 0) return [];
  if (values.length === 1) {
    return [{ x: 0, y: viewBoxHeight - topPadding }];
  }

  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const usableHeight = viewBoxHeight - topPadding;
  const step = viewBoxWidth / (values.length - 1);

  return values.map((value, index) => ({
    x: index * step,
    y: topPadding + usableHeight * (1 - (value - min) / range),
  }));
}
