import type { ApplicationStatus } from './types';

// Design tokens of the ShGAT screens that the MUI palette does not cover.

export const MONO_FONT = '"JetBrains Mono Variable", ui-monospace, monospace';

export const NAVY = { main: '#10233B', hover: '#18304D', active: '#203C60', deep: '#0A1828', text: '#C9D3DF', muted: '#93A3B8' };

export const PAGE_BG = '#F5F6F8';

/** pill colours plus the map fill/outline of each status (RGB for ArcGIS symbols) */
export const STATUS_STYLE: Record<ApplicationStatus, { bg: string; fg: string; fill: [number, number, number]; line: [number, number, number] }> = {
  SUBMITTED: { bg: '#FFF3D6', fg: '#7A4A00', fill: [217, 154, 30], line: [184, 122, 10] },
  REGISTERED: { bg: '#E3F4EA', fg: '#1C6B3F', fill: [46, 139, 87], line: [46, 139, 87] },
  RETURNED: { bg: '#EFEAFB', fg: '#5B3BA6', fill: [122, 91, 199], line: [122, 91, 199] },
};

export const OVERDUE_COLOR = '#A12A1F';
