import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useAppSelector } from "@/store";
import { canChat } from "./types";

export function useChatRole() {
  const { tenantId, role, status } = useActiveTenant();
  const persona = useAppSelector((s) => s.auth.persona);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const isCoach = role === "owner" || (role == null && persona === "coach");

  // The chat API forks by SURFACE, not by role: `/chat/*` only accepts a coach
  // token and `/client/me/chat/*` only a customer one — the other side's token
  // comes back 401 "Invalid token type", forever, however often it is retried.
  // A route that reliably 401s is exactly what docs/08 warns about, so refuse
  // to call it rather than letting every focus of the chat tab fire one.
  const surfaceMatches = isCoach ? persona === "coach" : persona === "customer";

  return {
    tenantId,
    isCoach,
    /** 'coach' | 'client' — compare against Message.senderType. */
    mySide: (isCoach ? "coach" : "client") as "coach" | "client",
    status,
    canChat: surfaceMatches && (isCoach || canChat(status)),
    isAuthenticated,
  };
}
