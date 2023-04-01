export type Dynamic<T> = () => T;
export type PossibleDynamic<T> = T | Dynamic<T>;

export function isDynamic(item: unknown): item is Dynamic<unknown> {
  return typeof item === "function" && item.length === 0;
}

export function getStatic<T>(item: PossibleDynamic<T>): T {
  return isDynamic(item) ? item() : item;
}
