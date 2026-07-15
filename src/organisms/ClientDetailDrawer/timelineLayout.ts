const VIEWBOX_X0 = 10;
const VIEWBOX_X1 = 386;

/** x-coordinate of the nth of `count` evenly spaced nodes along the Ledger Line timeline. */
export function timelineNodeX(index: number, count: number): number {
  if (count <= 1) return VIEWBOX_X0;
  const stepX = (VIEWBOX_X1 - VIEWBOX_X0) / (count - 1);
  return VIEWBOX_X0 + stepX * index;
}
