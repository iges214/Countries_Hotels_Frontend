import { createContext, useContext } from "react";
import type { AdminAccess, AdminBranch } from "./api";
export const AdminContext = createContext<{
  access: AdminAccess;
  branches: AdminBranch[];
  branch?: AdminBranch;
  refreshAccess: () => void;
  refreshBranches: () => void;
  to: (path?: string) => string;
}>(null!);
export const useAdmin = () => useContext(AdminContext);
