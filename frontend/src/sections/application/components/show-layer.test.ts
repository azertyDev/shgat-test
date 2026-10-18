import { showLayer } from './show-layer';

const extent = { clone: () => ({ expand: (f: number) => ({ expandedBy: f }) }) };
const view = () => ({ goTo: vi.fn(async () => undefined) });

describe('showLayer', () => {
  it('zooms to the feature returned by the layer', async () => {
    const v = view();
    await expect(showLayer({ queryExtent: async () => ({ count: 1, extent }) }, v)).resolves.toBe('ready');
    expect(v.goTo).toHaveBeenCalledWith({ expandedBy: 1.5 });
  });

  it('reports a feature missing on the server', async () => {
    const v = view();
    await expect(showLayer({ queryExtent: async () => ({ count: 0, extent: null }) }, v)).resolves.toBe('notFound');
    expect(v.goTo).not.toHaveBeenCalled();
  });

  it('reports a layer error', async () => {
    const failing = { queryExtent: async () => Promise.reject(new Error('HTTP 500')) };
    await expect(showLayer(failing, view())).resolves.toBe('error');
  });

  it('zooms to the local graphic', async () => {
    const v = view();
    await expect(showLayer({ graphics: { getItemAt: () => ({ geometry: { extent } }) } }, v)).resolves.toBe('ready');
    expect(v.goTo).toHaveBeenCalled();
  });
});
