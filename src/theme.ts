// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/** Function that's supposed to return styled text given string as parameter */
export type Style = (text: string) => string;

/** Used as placeholder style when one is not supplied, returns the input */
export function emptyStyle(text: string): string {
  return text;
}

/** Returns {replacement} if {style} is an {emptyStyle} otherwise returns {style} back */
export function replaceEmptyStyle(style: Style, replacement: Style): Style {
  return style === emptyStyle ? replacement : style;
}

/** Applies default values to properties (lower one hierarchy or `emptyStyle`) that aren't set */
export function hierarchizeTheme<
  T extends Theme = Theme,
  Y extends Partial<T> = Partial<T>,
>(input: Y): T {
  let { base, active, focused } = input;

  base ??= emptyStyle;
  focused ??= base;
  active ??= focused ?? base;

  const obj: Record<string, unknown> = {};

  const otherKeys = Object
    .getOwnPropertyNames(input)
    .filter((key) => !["base", "focused", "active"].includes(key));

  for (const key of otherKeys) {
    const property = input[key as keyof Y];
    if (typeof property !== "object") {
      obj[key] ??= emptyStyle;
      continue;
    }

    // deno-lint-ignore no-explicit-any
    obj[key] = hierarchizeTheme<any, any>(property);
  }

  return { ...obj, base, focused, active } as T;
}

/** Base theme used to style components, can be expanded upon */
export interface Theme {
  /** Default style */
  base: Style;
  /** Style when component is focused */
  focused: Style;
  /** Style when component is active */
  active: Style;
}
