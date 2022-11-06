// Copyright 2022 Im-Beast. All rights reserved. MIT license.
// This module works only on Windows

import type { Alphabet, Key, KeyPress } from "./types.ts";

/** Decode buffer to {KeyPress} object. */
export function decodeWindowsBuffer(buffer: number, specialCharCode?: number): KeyPress {
  const decodedBuffer = String.fromCharCode(buffer);

  const keyPress: KeyPress = {
    buffer,
    key: "" as Key,
    meta: false,
    shift: false,
    ctrl: false,
  };

  if (typeof specialCharCode !== "undefined") {
    switch (buffer) {
      // F1-F10 = 59-68
      // shift:   +25
      // ctrl:    +35
      // meta:    +45
      case 59:
        keyPress.key = "f1";
        break;
      case 59 + 25:
        keyPress.key = "f1";
        keyPress.shift = true;
        break;
      case 59 + 35:
        keyPress.key = "f1";
        keyPress.ctrl = true;
        break;
      case 59 + 45:
        keyPress.key = "f1";
        keyPress.meta = true;
        break;
      case 60:
        keyPress.key = "f2";
        break;
      case 60 + 25:
        keyPress.key = "f2";
        keyPress.shift = true;
        break;
      case 60 + 35:
        keyPress.key = "f2";
        keyPress.ctrl = true;
        break;
      case 60 + 45:
        keyPress.key = "f2";
        keyPress.meta = true;
        break;
      case 61:
        keyPress.key = "f3";
        break;
      case 61 + 25:
        keyPress.key = "f3";
        keyPress.shift = true;
        break;
      case 61 + 35:
        keyPress.key = "f3";
        keyPress.ctrl = true;
        break;
      case 61 + 45:
        keyPress.key = "f3";
        keyPress.meta = true;
        break;
      case 62:
        keyPress.key = "f4";
        break;
      case 62 + 25:
        keyPress.key = "f4";
        keyPress.shift = true;
        break;
      case 62 + 35:
        keyPress.key = "f4";
        keyPress.ctrl = true;
        break;
      case 62 + 45:
        keyPress.key = "f4";
        keyPress.meta = true;
        break;
      case 63:
        keyPress.key = "f5";
        break;
      case 63 + 25:
        keyPress.key = "f5";
        keyPress.shift = true;
        break;
      case 63 + 35:
        keyPress.key = "f5";
        keyPress.ctrl = true;
        break;
      case 63 + 45:
        keyPress.key = "f5";
        keyPress.meta = true;
        break;
      case 64:
        keyPress.key = "f6";
        break;
      case 64 + 25:
        keyPress.key = "f6";
        keyPress.shift = true;
        break;
      case 64 + 35:
        keyPress.key = "f6";
        keyPress.ctrl = true;
        break;
      case 65:
        keyPress.key = "f7";
        break;
      case 65 + 25:
        keyPress.key = "f7";
        keyPress.shift = true;
        break;
      case 65 + 35:
        keyPress.key = "f7";
        keyPress.ctrl = true;
        break;
      case 65 + 45:
        keyPress.key = "f7";
        keyPress.meta = true;
        break;
      case 66:
        keyPress.key = "f8";
        break;
      case 66 + 25:
        keyPress.key = "f8";
        keyPress.shift = true;
        break;
      case 66 + 35:
        keyPress.key = "f8";
        keyPress.ctrl = true;
        break;
      case 66 + 45:
        keyPress.key = "f8";
        keyPress.meta = true;
        break;
      case 67:
        keyPress.key = "f9";
        break;
      case 67 + 25:
        keyPress.key = "f9";
        keyPress.shift = true;
        break;
      case 67 + 35:
        keyPress.key = "f9";
        keyPress.ctrl = true;
        break;
      case 67 + 45:
        keyPress.key = "f9";
        keyPress.meta = true;
        break;
      case 68:
        keyPress.key = "f10";
        break;
      case 68 + 25:
        keyPress.key = "f10";
        keyPress.shift = true;
        break;
      case 68 + 35:
        keyPress.key = "f10";
        keyPress.ctrl = true;
        break;
      case 68 + 45:
        keyPress.key = "f10";
        keyPress.meta = true;
        break;
      // F11-F12 = 133-134
      // shift:    +2
      // ctrl:     +4
      // meta:     +6
      case 133:
        keyPress.key = "f11";
        break;
      case 135:
        keyPress.key = "f11";
        keyPress.shift = true;
        break;
      case 137:
        keyPress.key = "f11";
        keyPress.ctrl = true;
        break;
      case 139:
        keyPress.key = "f11";
        keyPress.meta = true;
        break;
      case 134:
        keyPress.key = "f12";
        break;
      case 136:
        keyPress.key = "f12";
        keyPress.shift = true;
        break;
      case 138:
        keyPress.key = "f12";
        keyPress.ctrl = true;
        break;
      case 140:
        keyPress.key = "f12";
        keyPress.meta = true;
        break;

      case 72:
        keyPress.key = "up";
        break;
      case 141:
        keyPress.key = "up";
        keyPress.ctrl = true;
        break;
      case 152:
        keyPress.key = "up";
        keyPress.meta = true;
        break;

      case 80:
        keyPress.key = "down";
        break;
      case 145:
        keyPress.key = "down";
        keyPress.ctrl = true;
        break;
      case 160:
        keyPress.key = "down";
        keyPress.meta = true;
        break;

      case 75:
        keyPress.key = "left";
        break;
      case 115:
        keyPress.key = "left";
        keyPress.ctrl = true;
        break;
      case 155:
        keyPress.key = "left";
        keyPress.meta = true;
        break;

      case 77:
        keyPress.key = "right";
        break;
      case 116:
        keyPress.key = "right";
        keyPress.ctrl = true;
        break;
      case 157:
        keyPress.key = "right";
        keyPress.meta = true;
        break;

      case 82:
        keyPress.key = "insert";
        break;
      case 146:
        keyPress.key = "insert";
        keyPress.ctrl = true;
        break;
      case 162:
        keyPress.key = "insert";
        keyPress.meta = true;
        break;

      case 83:
        keyPress.key = "delete";
        break;
      case 147:
        keyPress.key = "delete";
        keyPress.ctrl = true;
        break;
      case 163:
        keyPress.key = "delete";
        keyPress.meta = true;
        break;

      case 71:
        keyPress.key = "home";
        break;
      case 119:
        keyPress.key = "home";
        keyPress.ctrl = true;
        break;
      case 151:
        keyPress.key = "home";
        keyPress.meta = true;
        break;

      case 79:
        keyPress.key = "end";
        break;
      case 117:
        keyPress.key = "end";
        keyPress.ctrl = true;
        break;
      case 159:
        keyPress.key = "end";
        keyPress.meta = true;
        break;

      case 73:
        keyPress.key = "pageup";
        break;
      // Windows is so dumb, F12 is the same as pageup with ctrl held
      // case 134:
      //   keyPress.key = "pageup";
      //   keyPress.ctrl = true;
      //   break;
      case 153:
        keyPress.key = "pageup";
        keyPress.meta = true;
        break;

      case 81:
        keyPress.key = "pagedown";
        break;
      case 118:
        keyPress.key = "pagedown";
        keyPress.ctrl = true;
        break;
      case 161:
        keyPress.key = "pagedown";
        keyPress.meta = true;
        break;
    }
  } else {
    switch (buffer) {
      case 13:
        keyPress.key = "return";
        break;
      case 32:
        keyPress.key = "space";
        break;
      case 9:
        keyPress.key = "tab";
        break;
      case 27:
        keyPress.key = "escape";
        break;
      case 8:
        keyPress.key = "backspace";
        break;
      default:
        {
          const offset96 = String.fromCharCode(buffer + 96);
          if (/[a-z]/.test(offset96)) {
            keyPress.key = offset96 as Alphabet;
            keyPress.ctrl = true;
          } else {
            keyPress.key = decodedBuffer.toLowerCase() as Key;
            keyPress.shift = keyPress.key !== decodedBuffer;
          }
        }
        break;
    }
  }

  return keyPress;
}
