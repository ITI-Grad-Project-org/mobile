import { useActiveTenant } from './useActiveTenant';

export type Role = 'owner' | 'client';

export function useRole() {
  const { role } = useActiveTenant();
  return {
    role,
    isCoach: role === 'owner',
    isClient: role === 'client',
  };
}

