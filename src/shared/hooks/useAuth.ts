import { useAppSelector } from '@/store';

export function useAuth() {
  return useAppSelector((state) => state.auth);
}
