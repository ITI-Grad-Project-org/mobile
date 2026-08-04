import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useAppSelector } from "@/store";
import { canChat } from "./types";

export function useChatRole() {
  const { tenantId, role, status } = useActiveTenant();
  const persona = useAppSelector((s) => s.auth.persona);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const isCoach = role === "owner" || (role == null && persona === "coach");

  return {
    tenantId,
    isCoach,
    /** 'coach' | 'client' — compare against Message.senderType. */
    mySide: (isCoach ? "coach" : "client") as "coach" | "client",
    status,
    canChat: isCoach || canChat(status),
    isAuthenticated,
  };
}
