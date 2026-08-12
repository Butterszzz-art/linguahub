import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>;
}
