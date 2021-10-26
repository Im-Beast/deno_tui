import { CanvasStyler } from "./canvas.ts";
import { TuiInstance } from "./tui.ts";
import { AnyComponent } from "./tui_component.ts";

export type Writer = Deno.Writer & { readonly rid: number };
export type Reader = Deno.Reader & { readonly rid: number };

export type TuiRectangle = {
  column: number;
  row: number;
  width: number;
  height: number;
};

export type TuiStyler<T = void> = CanvasStyler<T> & {
  active?: CanvasStyler<T>;
  focused?: CanvasStyler<T>;
  border?: CanvasStyler<T> & {
    active?: CanvasStyler<T>;
    focused?: CanvasStyler<T>;
  };
};

export type TuiObject = TuiInstance | AnyComponent;
