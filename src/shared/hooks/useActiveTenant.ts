import { useAppSelector } from '@/store';
import { membershipsSelectors } from '@/store/membershipsSlice';

export function useActiveTenant() {
  const tenantId = useAppSelector((state) => state.activeTenant.tenantId);
  const membership = useAppSelector((state) =>
    tenantId ? membershipsSelectors.selectById(state.memberships, tenantId) : undefined
  );

  return {
    tenantId,
    membership,
    role: membership?.role || null,
    status: membership?.status || null,
  };
}
