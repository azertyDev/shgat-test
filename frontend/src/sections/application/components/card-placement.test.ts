import { placeCard } from './card-placement';

describe('placeCard', () => {
  it('puts the card to the right of and below a point in the upper left', () => {
    expect(placeCard({ x: 100, y: 100 }, 1000, 800)).toEqual({ left: 114, width: 300, top: 86, maxHeight: 706 });
  });

  it('flips to the left near the right edge and above the point in the lower half', () => {
    expect(placeCard({ x: 900, y: 700 }, 1000, 800)).toEqual({ left: 586, width: 300, bottom: 86, maxHeight: 706 });
  });

  it('stays inside a narrow map', () => {
    expect(placeCard({ x: 200, y: 50 }, 375, 280)).toMatchObject({ left: 8, width: 300 });
  });

  it('hides the card when the point is out of view', () => {
    expect(placeCard({ x: -5, y: 100 }, 1000, 800)).toBeNull();
    expect(placeCard({ x: 100, y: 900 }, 1000, 800)).toBeNull();
  });
});
