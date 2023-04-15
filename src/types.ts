// Copyright 2022 Im-Beast. All rights reserved. MIT license.

//#region key_reader
// Copyright 2022 Im-Beast. All rights reserved. MIT license.
/** Type defining keys that `key_reader.ts` can distinguish */
// TODO: throw these key types to key_reader
export type Key =
  | Alphabet
  | Chars
  | SpecialKeys
  | `${Range<0, 10>}`
  | `f${Range<1, 12>}`;

/** Type defining letters from the latin alphabet */
export type Alphabet =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

/** Type defining special keys */
export type SpecialKeys =
  | "return"
  | "tab"
  | "backspace"
  | "escape"
  | "space"
  | "up"
  | "down"
  | "left"
  | "right"
  | "clear"
  | "insert"
  | "delete"
  | "pageup"
  | "pagedown"
  | "home"
  | "end"
  | "tab";

/** Type defining interpunction characters */
export type Chars =
  | "!"
  | "@"
  | "#"
  | "$"
  | "%"
  | "^"
  | "&"
  | "*"
  | "("
  | ")"
  | "-"
  | "_"
  | "="
  | "+"
  | "["
  | "{"
  | "]"
  | "}"
  | "'"
  | '"'
  | ";"
  | ":"
  | ","
  | "<"
  | "."
  | ">"
  | "/"
  | "?"
  | "\\"
  | "|";

/** Interface defining key press issued to stdin */
export interface KeyPress {
  /** Raw data which was sent to stdin */
  buffer: Uint8Array | number;
  /** Key id */
  key: Key;
  /** Whether meta button (most often alt) was pressed/held when key was pressed */
  meta: boolean;
  /** Whether shift button was pressed/held when key was pressed */
  shift: boolean;
  /** Whether ctrl button was pressed/held when key was pressed */
  ctrl: boolean;
}

/** Interface defining key press issued to stdin using a mouse */
export interface MousePress extends Omit<KeyPress, "key"> {
  /** Mouse key id */
  key: "mouse";
  /** Column on which mouse was when action was taken */
  x: number;
  /** Row on which mouse was when action was taken */
  y: number;
  /** Column relative to last mousePress */
  movementX: number;
  /** Row relative to last mousePress */
  movementY: number;
  /**
   *  Mouse button that has been used
   *  - 0 - Left
   *  - 1 - Middle
   *  - 2 - Right
   */
  button: 0 | 1 | 2 | undefined;
  /** Whether mouse button has been released */
  release: boolean;
  /** Whether mouse cursor is dragged */
  drag: boolean;
  /**
   * Whether user scroll
   *  - 1 - Scrolls downwards
   *  - 0 - Doesn't scroll
   *  - -1 - Scrolls upwards)
   */
  scroll: 1 | 0 | -1;
}

/** Interface defining multiple key presses (both {KeyPress} and {MousePress}) that have been issued to stdin at once */
export interface MultiKeyPress extends Omit<KeyPress, "buffer" | "key"> {
  /** MultiKeyPress id */
  key: "multi";
  /** Raw data which was sent to stdin about every key */
  buffer: KeyPress["buffer"][];
  /** Array storing KeyPress information about keys */
  keys: (KeyPress["key"] | MousePress["key"])[];
}
//#endregion

/** Type for Standard Output – where data gets written */
export type Stdout = typeof Deno.stdout;

/** Type for Standard Input - from where data is read */
export type Stdin = typeof Deno.stdin;

/** Type defining terminal's (console) available size measured in columns and rows */
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
  columns: number;
  rows: number;
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
export type DeepPartial<Object, OmitKeys extends keyof Object = never> =
  & {
    // deno-lint-ignore ban-types
    [key in Exclude<keyof Object, OmitKeys>]?: Object[key] extends object
      // deno-lint-ignore ban-types
      ? Object[key] extends Function ? Object[key] : DeepPartial<Object[key]>
      : Object[key];
  }
  & {
    [key in OmitKeys]: DeepPartial<Object[key]>;
  };
