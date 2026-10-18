/** {documentType}-{soatoCode}-{year}, year is taken from the approval date. Example: БР-1703401-2026. */
export function buildRegistrationNumber(
  documentType: string,
  soatoCode: string,
  approvalDate: Date,
): string {
  return `${documentType}-${soatoCode}-${approvalDate.getUTCFullYear()}`;
}
