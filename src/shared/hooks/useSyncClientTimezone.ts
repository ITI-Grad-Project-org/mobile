import { useEffect, useRef } from 'react';

import {
  useGetClientProfileQuery,
  useUpdateClientProfileMutation,
} from '@/api/endpoints/profile.endpoints';
import { useAppSelector } from '@/store';

export function deviceTimezone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.includes('/') ? zone : null;
  } catch {
    // Some Hermes builds ship without full ICU; a missing zone is not an error.
    return null;
  }
}

/**
 * Keeps the global client profile's timezone matching the device.
 *
 * The activity graph dates every square in the zone stored on the client
 * profile, not the phone's and not the tenant's. Left unsent the backend falls
 * back to UTC, so a client in UTC+3 logging at 01:00 lands on the previous
 * day's square and breaks their streak. Mounted once for the client UI so the
 * zone is correct before any activity-producing action.
 */
export function useSyncClientTimezone() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const persona = useAppSelector((state) => state.auth.persona);
  const enabled = isAuthenticated && persona === 'customer';

  const { data } = useGetClientProfileQuery(undefined, { skip: !enabled });
  const [updateClientProfile] = useUpdateClientProfileMutation();
  // One attempt per zone per session — a rejected PATCH must not retry forever.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !data) return;

    const device = deviceTimezone();
    if (!device) return;

    const profile = (data as any)?.data ?? data;
    if (profile?.timezone === device) return;
    if (attempted.current === device) return;
    attempted.current = device;

    // Fire-and-forget: a failed sync degrades the graph's dates, it does not
    // block anything on screen, so there is nothing useful to show the client.
    updateClientProfile({ timezone: device })
      .unwrap()
      .catch((e) => console.warn('Timezone sync failed:', e));
  }, [enabled, data, updateClientProfile]);
}
