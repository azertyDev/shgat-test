import type { Holat } from '../types';
import type { LabelColor } from 'src/components/label';

import { useTranslate } from 'src/locales';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const RANG: Record<Holat, LabelColor> = {
  yuborilgan: 'info',
  hisobga_olingan: 'success',
  qaytarilgan: 'warning',
};

export function HolatLabel({ holat }: { holat: Holat }) {
  const { t } = useTranslate();
  return (
    <Label variant="soft" color={RANG[holat]}>
      {t(`holat.${holat}`)}
    </Label>
  );
}
