// Copyright 2023 Im-Beast. All rights reserved. MIT license.
/** Decode code sequence to {KeyPress} object. */
import type { Alphabet, Key, KeyPressEvent } from "../types.ts";

const alphabetRegex = /[a-z]/;

export function decodeKey(buffer: Uint8Array, code: string): KeyPressEvent {
  if (code[0] === "\x1b") code = code.slice(1);

  const keyPress: KeyPressEvent = {
    buffer,
    key: code as Key,
    meta: false,
    shift: false,
    ctrl: false,
  };

  switch (code) {
    case "\r":
    case "\n":
      keyPress.key = "return";
      break;
    case "\t":
      keyPress.key = "tab";
      break;
    case "\b":
    case "\x7f":
      keyPress.key = "backspace";
      break;
    case "\x1b":
      keyPress.key = "escape";
      break;
    case " ":
      keyPress.key = "space";
      break;
    default:
      {
        if (buffer[0] !== 27) {
          const offset96 = String.fromCharCode(buffer[0] + 96);
          if (alphabetRegex.test(offset96)) {
            keyPress.key = offset96 as Alphabet;
            keyPress.ctrl = true;
            break;
          }
        }

        if (code.length === 1) {
          keyPress.shift = code !== code.toLowerCase();
          keyPress.meta = buffer[0] === 27;
          break;
        } else if (buffer.length === 1) {
          keyPress.key = "escape";
          break;
        }

        const modifier = code.match(/\d+.+(\d+)/)?.[1] ?? "";
        switch (modifier) {
          case "5":
            keyPress.ctrl = true;
            break;
          case "3":
            keyPress.meta = true;
            break;
          case "2":
            keyPress.shift = true;
            break;
        }

        code = code.replace(`1;${modifier}`, "").replace(`;${modifier}`, "").replace("1;", "");
        switch (code) {
          case "OP":
          case "[P":
            keyPress.key = "f1";
            break;
          case "OG":
          case "[Q":
            keyPress.key = "f2";
            break;
          case "OR":
          case "[R":
            keyPress.key = "f3";
            break;
          case "OS":
          case "[S":
            keyPress.key = "f4";
            break;
          case "[15~":
            keyPress.key = "f5";
            break;
          case "[17~":
            keyPress.key = "f6";
            break;
          case "[18~":
            keyPress.key = "f7";
            break;
          case "[19~":
            keyPress.key = "f8";
            break;
          case "[20~":
            keyPress.key = "f9";
            break;
          case "[21~":
            keyPress.key = "f10";
            break;
          case "[23~":
            keyPress.key = "f11";
            break;
          case "[24~":
            keyPress.key = "f12";
            break;

          case "[A":
            keyPress.key = "up";
            break;
          case "[B":
            keyPress.key = "down";
            break;
          case "[C":
            keyPress.key = "right";
            break;
          case "[D":
            keyPress.key = "left";
            break;

          case "[2~":
            keyPress.key = "insert";
            break;
          case "[3~":
            keyPress.key = "delete";
            break;

          case "[5~":
            keyPress.key = "pageup";
            break;
          case "[6~":
            keyPress.key = "pagedown";
            break;

          case "[H":
            keyPress.key = "home";
            break;
          case "[F":
            keyPress.key = "end";
            break;

          case "[E":
            keyPress.key = "clear";
            break;
        }
      }
      break;
  }

  return keyPress;
}
