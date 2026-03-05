"use client";

import { SessionProvider } from "next-auth/react";
import { ChunkLoadErrorHandler } from "./ChunkLoadErrorHandler";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChunkLoadErrorHandler />
      {children}
    </SessionProvider>
  );
}
