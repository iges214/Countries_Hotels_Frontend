let pending = 0;
const listeners = new Set<() => void>();

export const requestActivity = {
  getSnapshot: () => pending,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function beginRequest() {
  pending += 1;
  listeners.forEach((listener) => listener());
}

export function finishRequest() {
  pending -= 1;
  listeners.forEach((listener) => listener());
}
