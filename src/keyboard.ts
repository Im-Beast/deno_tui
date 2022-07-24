import { KeypressEvent, MousePressEvent, MultiKeyPressEvent } from "./events.ts";
import { MultiKeyPress, readKeypresses } from "./key_reader.ts";
import { Tui } from "./tui.ts";

export async function handleKeypresses(tui: Tui): Promise<void> {
  for await (const keyPresses of readKeypresses(tui.stdin)) {
    const multiKeyPress: MultiKeyPress = {
      keys: [],
      buffer: [],
      ctrl: false,
      meta: false,
      shift: false,
    };

    for (const keyPress of keyPresses) {
      tui.dispatchEvent(keyPress.key === "mouse" ? new MousePressEvent(keyPress) : new KeypressEvent(keyPress));

      multiKeyPress.keys.push(keyPress.key);
      multiKeyPress.buffer.push(keyPress.buffer);
      multiKeyPress.shift ||= keyPress.shift;
      multiKeyPress.meta ||= keyPress.meta;
      multiKeyPress.ctrl ||= keyPress.ctrl;
    }

    if (multiKeyPress.keys.length > 1) {
      tui.dispatchEvent(new MultiKeyPressEvent(multiKeyPress));
    }
  }
}
