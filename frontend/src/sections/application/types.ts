export const DOCUMENT_TYPES = ['БСХ', 'ҲРС', 'ТРЛ', 'БР', 'БРЛ', 'ҚР', 'ЛШ'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const APPLICATION_STATUSES = ['SUBMITTED', 'REGISTERED', 'RETURNED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const FILE_FIELDS = ['mainDrawing', 'explanatoryNote', 'approvalDocument'] as const;
export type FileField = (typeof FILE_FIELDS)[number];

export type Role = 'APPLICANT' | 'REVIEWER';

type Position = [number, number];
export type Boundary =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export type SoatoRegion = { code: string; name: string };

export type ApplicationSummary = {
  id: number;
  registrationNumber: string | null;
  documentName: string;
  documentType: string;
  soatoCode: string;
  regionName: string | null;
  status: ApplicationStatus;
  submittedAt: string;
  /** review deadline (YYYY-MM-DD) while the application waits for review */
  reviewDeadline: string | null;
};

export type ApplicationFile = { field: FileField; name: string; mimeType: string; size: number; url: string };

export type Application = ApplicationSummary & {
  approvalDate: string;
  approvalDecree: string;
  boundary: Boundary;
  arcgisObjectId: number | null;
  returnReason: string | null;
  files: ApplicationFile[];
};

export type ApplicationPage = { items: ApplicationSummary[]; total: number };

export type ListQuery = {
  status?: ApplicationStatus;
  documentType?: string;
  soatoCode?: string;
  page?: number;
  pageSize?: number;
};

export type Approval = { registrationNumber: string; arcgisObjectId: number };
