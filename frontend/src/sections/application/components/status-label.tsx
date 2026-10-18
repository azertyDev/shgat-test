import type { ApplicationStatus } from '../types';
import type { LabelColor } from 'src/components/label';

import { useTranslate } from 'src/locales';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<ApplicationStatus, LabelColor> = {
  SUBMITTED: 'info',
  REGISTERED: 'success',
  RETURNED: 'warning',
};

export function StatusLabel({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslate();
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {t(`status.${status}`)}
    </Label>
  );
}
