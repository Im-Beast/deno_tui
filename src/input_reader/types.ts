// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Range } from "../types.ts";

/** Interface defining key press issued to stdin */
export interface KeyPressEvent {
  key: Key;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  buffer: Uint8Array;
}

export interface MouseEvent {
  key: "mouse";
  buffer: Uint8Array;
  x: number;
  y: number;
  movementX: number;
  movementY: number;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
}

export interface MousePressEvent extends MouseEvent {
  drag: boolean;
  release: boolean;
  // undefined when release
  button: 0 | 1 | 2 | undefined;
}

export interface MouseScrollEvent extends MouseEvent {
  drag: boolean;
  /**
   * Whether user scroll
   *  - 1 - Scrolls downwards
   *  - 0 - Doesn't scroll
   *  - -1 - Scrolls upwards)
   */
  scroll: 1 | 0 | -1;
}

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
