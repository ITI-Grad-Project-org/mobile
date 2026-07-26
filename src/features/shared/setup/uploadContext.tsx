import { createContext, useContext, type ReactNode } from "react";

export type UploadPersona = "coach" | "client";

const UploadPersonaContext = createContext<UploadPersona>("client");

export function UploadPersonaProvider({
  persona,
  children,
}: {
  persona: UploadPersona;
  children: ReactNode;
}) {
  return (
    <UploadPersonaContext.Provider value={persona}>
      {children}
    </UploadPersonaContext.Provider>
  );
}

export function useUploadPersona(): UploadPersona {
  return useContext(UploadPersonaContext);
}
