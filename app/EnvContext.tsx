"use client";

import { createContext, useContext, useState } from "react";
import type { Environment } from "@/lib/types";

interface EnvCtx {
  env: Environment;
  setEnv: (e: Environment) => void;
}

const Ctx = createContext<EnvCtx | null>(null);

export function EnvProvider({ children }: { children: React.ReactNode }) {
  const [env, setEnv] = useState<Environment>("cxm");
  return <Ctx.Provider value={{ env, setEnv }}>{children}</Ctx.Provider>;
}

export function useEnv(): EnvCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEnv must be used within EnvProvider");
  return c;
}
