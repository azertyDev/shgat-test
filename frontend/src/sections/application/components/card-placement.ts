// Where a map card goes next to a point on the map; no ArcGIS imports, so it is testable in jsdom.

const GAP = 14; // between the point and the card
const MARGIN = 8; // between the card and the map edge

export type CardPlacement = { left: number; width: number; maxHeight: number } & ({ top: number } | { bottom: number });

/**
 * Right of the point if it fits, otherwise left of it; below the point in the upper half of the map,
 * above it in the lower half. Null when the point has been panned out of view.
 */
export function placeCard(point: { x: number; y: number }, viewWidth: number, viewHeight: number, cardWidth = 300): CardPlacement | null {
  const { x, y } = point;
  if (x < 0 || y < 0 || x > viewWidth || y > viewHeight) return null;

  const width = Math.min(cardWidth, viewWidth - 2 * MARGIN);
  const right = x + GAP;
  const left =
    right + width <= viewWidth - MARGIN ? right : Math.max(MARGIN, Math.min(x - GAP - width, viewWidth - MARGIN - width));

  if (y <= viewHeight / 2) {
    const top = Math.max(MARGIN, y - GAP);
    return { left, width, top, maxHeight: viewHeight - top - MARGIN };
  }
  const bottom = Math.max(MARGIN, viewHeight - y - GAP);
  return { left, width, bottom, maxHeight: viewHeight - bottom - MARGIN };
}
