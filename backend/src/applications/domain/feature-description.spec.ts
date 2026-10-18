import {
  buildFeatureDescription,
  DESCRIPTION_MAX_LENGTH,
} from './feature-description.js';

const NUMBER = 'БР-1703401-2026'; // "БР-1703401-2026 | " is 18 code units

describe('buildFeatureDescription', () => {
  it('joins number and name', () => {
    expect(buildFeatureDescription(NUMBER, 'Andijon shahri bosh rejasi')).toBe(
      'БР-1703401-2026 | Andijon shahri bosh rejasi',
    );
  });

  it('cuts to the 75-unit field', () => {
    const text = buildFeatureDescription(NUMBER, 'А'.repeat(200));
    expect(text).toHaveLength(DESCRIPTION_MAX_LENGTH);
  });

  it('never splits an emoji at the limit', () => {
    // 56 letters + emoji: the emoji would occupy units 75 and 76
    const text = buildFeatureDescription(NUMBER, `${'a'.repeat(56)}🏙️ rest`);
    expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(text.endsWith('a')).toBe(true);
    expect(/[\uD800-\uDBFF]$/.test(text)).toBe(false); // no lone high surrogate
  });

  it('drops a space left at the cut', () => {
    const text = buildFeatureDescription(NUMBER, `${'b'.repeat(56)} cdef`);
    expect(text).toBe(`${NUMBER} | ${'b'.repeat(56)}`);
  });
});
