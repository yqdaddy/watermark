/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface UnsavedChangesGuardValue {
  hasUnsavedChanges: boolean;
  navigationBlocked: boolean;
  confirmNavigation: () => boolean;
  setHasUnsavedChanges: (next: boolean) => void;
  setNavigationBlocked: (next: boolean) => void;
}

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardValue | null>(null);

export function useUnsavedChangesGuard() {
  const value = useContext(UnsavedChangesGuardContext);
  if (!value) {
    throw new Error("useUnsavedChangesGuard must be used within UnsavedChangesGuardContext");
  }
  return value;
}

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [navigationBlocked, setNavigationBlocked] = useState(false);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const value = useMemo<UnsavedChangesGuardValue>(
    () => ({
      hasUnsavedChanges,
      navigationBlocked,
      confirmNavigation: () => {
        if (navigationBlocked) {
          return false;
        }
        if (!hasUnsavedChanges) return true;
        const confirmed = window.confirm("有尚未保存的更改，要放弃更改吗？");
        if (confirmed) {
          setHasUnsavedChanges(false);
        }
        return confirmed;
      },
      setHasUnsavedChanges,
      setNavigationBlocked,
    }),
    [hasUnsavedChanges, navigationBlocked],
  );

  return (
    <UnsavedChangesGuardContext.Provider value={value}>
      {children}
    </UnsavedChangesGuardContext.Provider>
  );
}
