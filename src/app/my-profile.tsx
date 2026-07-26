import { ProfileScreen } from "@/features/shared/profile";

// Root-level (not under `(client)`) so it renders over the whole window, clear
// of the app header. Can't be named `profile` — `(coach)/profile` owns that path.
export default function MyProfileRoute() {
  return <ProfileScreen />;
}
