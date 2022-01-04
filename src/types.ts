// Copyright 2021 Im-Beast. All rights reserved. MIT license.
// In this module should be served types that aren't specific to only one function or module
import { Tui } from "./tui.ts";
import { ExtendedComponent } from "./tui_component.ts";

type _Range<
  From extends number,
  To extends number,
  R extends unknown[],
> = R["length"] extends To ? To
  : 
    | (R["length"] extends Range<0, From> ? From : R["length"])
    | _Range<From, To, [To, ...R]>;

/** Returns type for numbers between given range */
export type Range<From extends number, To extends number> = number extends From
  ? number
  : _Range<From, To, []>;

/** Any possible component */
// deno-fmt-ignore
// deno-lint-ignore no-explicit-any
export type AnyComponent = ExtendedComponent<any, { [x in any]: any }, any, any>;

/** Object which can be used as a parent to create other component */
export type TuiObject = Tui | AnyComponent;

/** stdin */
export interface Reader extends Deno.Reader {
  readonly rid: number;
}

/** stdout */
export interface Writer extends Deno.Writer {
  readonly rid: number;
}

/** Positioning of text */
export interface TextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

/** Position and size of TuiObject */
export interface Rectangle {
  column: number;
  row: number;
  width: number;
  height: number;
}

/** Console/Terminal size measured in columns and rows */
export interface ConsoleSize {
  columns: number;
  rows: number;
}

/** Generic Type for creating dynamic typings for values */
export type Dynamic<T> = T | (() => T);
