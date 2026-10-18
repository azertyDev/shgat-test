// Zooms a map view to the layer that holds the boundary; no ArcGIS imports, so it is testable in jsdom.

export type MapState = 'loading' | 'ready' | 'notFound' | 'error';

type Extent = { clone(): { expand(factor: number): unknown } };

/** FeatureLayer: asks the server for the filtered feature's extent. */
type QueryableLayer = { queryExtent(): Promise<{ count: number; extent: Extent | null }> };
/** GraphicsLayer: the boundary is the first graphic. */
type LocalLayer = { graphics: { getItemAt(i: number): { geometry?: { extent?: Extent | null } | null } | undefined } };

export type BoundaryLayer = QueryableLayer | LocalLayer;
export type ZoomableView = { goTo(target: unknown): Promise<unknown> };

export async function showLayer(layer: BoundaryLayer, view: ZoomableView): Promise<MapState> {
  try {
    if ('queryExtent' in layer) {
      const { count, extent } = await layer.queryExtent();
      if (!count || !extent) return 'notFound'; // the shared test server may have purged it
      await view.goTo(extent.clone().expand(1.5));
    } else {
      const extent = layer.graphics.getItemAt(0)?.geometry?.extent;
      if (extent) await view.goTo(extent.clone().expand(1.5));
    }
    return 'ready';
  } catch {
    return 'error';
  }
}
