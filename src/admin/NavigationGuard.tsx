import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";

type Guard = {
  setDirty: (id: string, dirty: boolean) => void;
  remove: (id: string) => void;
  markClean: (id: string) => boolean;
  confirmDiscard: (id?: string) => boolean;
};
const NavigationGuard = createContext<Guard>(null!);

export function AdminNavigationGuard({ children }: { children: ReactNode }) {
  const forms = useRef(new Map<string, boolean>());
  const hasChanges = useCallback(
    (id?: string) =>
      id === undefined
        ? [...forms.current.values()].some(Boolean)
        : forms.current.get(id) === true,
    [],
  );
  const guard = useMemo<Guard>(
    () => ({
      setDirty: (id, dirty) => {
        forms.current.set(id, dirty);
      },
      remove: (id) => {
        forms.current.delete(id);
      },
      markClean: (id) => {
        if (!forms.current.has(id)) return false;
        forms.current.set(id, false);
        return true;
      },
      confirmDiscard: (id) =>
        !hasChanges(id) || window.confirm("Discard unsaved changes?"),
    }),
    [hasChanges],
  );
  // One router blocker covers all active forms, including pages with multiple drafts.
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        hasChanges() &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search),
      [hasChanges],
    ),
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (guard.confirmDiscard()) blocker.proceed();
    else blocker.reset();
  }, [blocker, guard]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasChanges]);
  return (
    <NavigationGuard.Provider value={guard}>
      {children}
    </NavigationGuard.Provider>
  );
}

export const useAdminNavigationGuard = () => useContext(NavigationGuard);

export function useDirtyGuard(dirty: boolean) {
  const guard = useAdminNavigationGuard();
  const id = useId();
  useLayoutEffect(() => {
    guard.setDirty(id, dirty);
    return () => guard.remove(id);
  }, [guard, id, dirty]);
  return {
    // Update synchronously before navigation after a successful save. Waiting for a
    // state/effect update can incorrectly block the save's own redirect.
    markClean: () => guard.markClean(id),
    confirmDiscard: () => guard.confirmDiscard(id),
  };
}
