import { CanvasStyler } from "./canvas.ts";
import { TuiInstance } from "./tui.ts";
import { ExtendedTuiComponent } from "./tui_component.ts";

export type Range<From extends number, To extends number> = number extends From
  ? number
  : _Range<From, To, []>;

type _Range<
  From extends number,
  To extends number,
  R extends unknown[],
> = R["length"] extends To ? To
  : 
    | (R["length"] extends Range<0, From> ? From : R["length"])
    | _Range<From, To, [To, ...R]>;

// deno-lint-ignore no-explicit-any
type _any = any;
// deno-fmt-ignore
export type AnyComponent = ExtendedTuiComponent< _any,  { [x: string | number | symbol]: unknown;  },  _any, _any >;

export type TuiObject = TuiInstance | AnyComponent;

export interface Writer extends Deno.Writer {
  readonly rid: number;
}

export interface Reader extends Deno.Reader {
  readonly rid: number;
}

export interface TuiStyler extends CanvasStyler {
  active?: CanvasStyler;
  focused?: CanvasStyler;
  frame?: CanvasStyler & {
    active?: CanvasStyler;
    focused?: CanvasStyler;
  };
}

export interface TextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

export interface TuiRectangle {
  column: number;
  row: number;
  width: number;
  height: number;
}

export interface ConsoleSize {
  columns: number;
  rows: number;
}

export type Dynamic<T> = T | (() => T);
