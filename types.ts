export type Writer = Deno.Writer & { readonly rid: number };
export type Reader = Deno.Reader & { readonly rid: number };

// Modified version of https://stackoverflow.com/a/68633667/14053734
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

export type Key =
  | Alphabet
  | Chars
  | "return"
  | "enter"
  | "tab"
  | "backspace"
  | "escape"
  | "space"
  | `f${Range<1, 12>}`
  | `${Range<0, 10>}`
  | "up"
  | "down"
  | "left"
  | "right"
  | "clear"
  | "insert"
  | "delete"
  | `page${"up" | "down"}`
  | "home"
  | "end"
  | "tab";

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

export type Alphabet = aToZ | Uppercase<aToZ>;

type aToZ =
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
