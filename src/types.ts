// Copyright 2022 Im-Beast. All rights reserved. MIT license.

export type Stdout = typeof Deno.stdout;
export type Stdin = typeof Deno.stdin;
export type ConsoleSize = ReturnType<typeof Deno.consoleSize>;

/**
 * Type describing time of something happening
 *  - Pre - before it happened
 *  - Post - after it happened
 */
export enum Timing {
  Pre = "pre",
  Post = "post",
}

/** Type that describes offset */
export interface Offset {
  x: number;
  y: number;
}

/** Type that describes empty edge around Rectangle */
export interface Margin {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** Type that describes position and size */
export interface Rectangle {
  column: number;
  row: number;
  width: number;
  height: number;
}

/** Generates number types that range from {From} to {To}  */
export type Range<From extends number, To extends number> = number extends From ? number
  : _Range<From, To, []>;
type _Range<From extends number, To extends number, R extends unknown[]> = R["length"] extends To ? To
  : 
    | (R["length"] extends Range<0, From> ? From : R["length"])
    | _Range<From, To, [To, ...R]>;

/** Partial that makes all properties optional, even those within other object properties */
export type DeepPartial<Object> = {
  // deno-lint-ignore ban-types
  [key in keyof Object]?: Object[key] extends object
    // deno-lint-ignore ban-types
    ? Object[key] extends Function ? Object[key] : DeepPartial<Object[key]>
    : Object[key];
};
