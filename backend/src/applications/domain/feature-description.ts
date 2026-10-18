/** Length of the `description` field in the ArcGIS layer (UTF-16 code units). */
export const DESCRIPTION_MAX_LENGTH = 75;

/**
 * "{registrationNumber} | {documentName}" cut to the layer field without splitting a character
 * (an emoji is two code units) and without a trailing space. The retry lookup compares this exact text,
 * so it must be what ArcGIS actually stores.
 */
export function buildFeatureDescription(
  registrationNumber: string,
  documentName: string,
): string {
  let text = '';
  for (const char of `${registrationNumber} | ${documentName}`) {
    if (text.length + char.length > DESCRIPTION_MAX_LENGTH) break;
    text += char;
  }
  return text.trimEnd();
}
