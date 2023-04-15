import { capitalize } from "./strings.ts";

export type Dynamic<T> = () => T;
export type PossibleDynamic<T> = T | Dynamic<T>;

export function isDynamic(item: unknown): item is Dynamic<unknown> {
  return typeof item === "function" && item.length === 0;
}

export function getStatic<T>(item: PossibleDynamic<T>): T {
  return isDynamic(item) ? item() : item;
}

export function setPossibleDynamicProperty<
  ValueType,
  Property extends string,
  DynamicProperty extends `dynamic${Capitalize<Property>}`,
  ObjectType extends (
    & {
      [key in Property]: ValueType | undefined;
    }
    & {
      [key in DynamicProperty]?: Dynamic<ValueType>;
    }
  ),
>(
  object: ObjectType,
  propertyName: Property,
  value: PossibleDynamic<ValueType>,
): void {
  const overwriteType = object as Record<Property | DynamicProperty, ValueType | Dynamic<ValueType>>;

  if (isDynamic(value)) {
    overwriteType[propertyName] = value();
    overwriteType[`dynamic${capitalize(propertyName)}` as DynamicProperty] = value;
  } else {
    overwriteType[propertyName] = value;
  }
}
