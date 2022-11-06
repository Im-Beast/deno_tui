import type { Range } from "../types.ts";

/** Type defining keys that `key_reader.ts` can distinguish */
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
