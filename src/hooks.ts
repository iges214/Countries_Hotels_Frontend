import { useEffect, useState } from "react";
import { api, DEMO } from "./api";
import { useHotel } from "./context";
import { categories, validateStay } from "./stay";
import type { Room, Stay } from "./types";
export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined);
    setError(undefined);
    setLoading(true);
    load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, revision]);
  return {
    data,
    error,
    loading,
    retry: () => setRevision((v) => v + 1),
    setData,
  };
}
export function useRooms(s: Stay, multiple = false, grid = false) {
  const { branch } = useHotel();
  return useData<Room[]>(async () => {
    if (validateStay(s, branch).length) return [];
    if (grid) {
      return (
        await Promise.all(
          categories.map((c) => api.rooms({ ...s, category: c.key }, multiple)),
        )
      ).flat();
    }
    return (await api.rooms(s, multiple)).filter(
      (r) => r.category.toLowerCase() !== "platinum",
    );
  }, [s.branchId, s.checkIn, s.checkOut, s.guests, s.category, multiple, grid]);
}
export function useImagery() {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    if (DEMO) import("./demo").then((d) => setPhotos(d.photos));
  }, []);
  return photos;
}
