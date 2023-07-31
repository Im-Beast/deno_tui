# ⌨️ Tui

<img src="https://raw.githubusercontent.com/Im-Beast/deno_tui/main/docs/logo-transparent.png" align="right" width="250" height="250" alt="Deno mascot made as ASCII art" />

[![Deno](https://github.com/Im-Beast/deno_tui/actions/workflows/deno.yml/badge.svg)](https://github.com/Im-Beast/deno_tui/actions/workflows/deno.yml)
[![Deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https://deno.land/x/tui/mod.ts)

Simple [Deno](https://github.com/denoland/deno/) module that allows easy creation of
[Terminal User Interfaces](https://en.wikipedia.org/wiki/Text-based_user_interface).

### 🔩 Features

- 🔰 Ease of use
- 👁️‍🗨️ Reactivity
- 🖇️ No dependencies
- 📄 Decent documentation
- [📦 Multiple ready-to-use components](./src/components/)
- 🎨 Styling framework agnostic
  - This means you can use whatever terminal styling module you want
  - [🖍️ Crayon](https://github.com/crayon-js/crayon) is recommended _but not imposed_ as it greatly integrates with Tui
- 🪶 Relatively lightweight

## 🖥️ OS Support

| Operating system     | Linux | macOS | Windows¹<sup>,</sup>² | WSL  |
| -------------------- | ----- | ----- | --------------------- | ---- |
| Base                 | ✔️     | ✔️     | ✔️                     | ✔️    |
| Keyboard support     | ✔️     | ✔️     | ✔️                     | ✔️    |
| Mouse support        | ✔️     | ✔️     | ✔️                     | ✔️    |
| Required permissions | none  | none  | none                  | none |

¹ - [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) is a heavily recommended way to run Tui on Windows, if
you need to stick to clean Windows, please consider using [Windows Terminal](https://github.com/Microsoft/Terminal).
Windows without WSL is slower at writing to the console, so performance might be worse on it.

² - If unicode characters are displayed incorrectly type `chcp 65001` into the console to change active console code
page to use UTF-8 encoding.

## 🎓 Get started

#### Replace {version} with relevant module versions

1. Create Tui instance

```ts
import { crayon } from "https://deno.land/x/crayon@version/mod.ts";
import { Canvas, Tui } from "https://deno.land/x/tui@version/mod.ts";

const tui = new Tui({
  style: crayon.bgBlack, // Make background black
  refreshRate: 1000 / 60, // Run in 60FPS
});

tui.dispatch(); // Close Tui on CTRL+C
```

2. Enable interaction using keyboard and mouse

```ts
import { handleInput, handleKeyboardControls, handleMouseControls } from "https://deno.land/x/tui@version/mod.ts";
...

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
```

3. Add some components

```ts
import { Button } from "https://deno.land/x/tui@version/src/components/mod.ts";
import { Signal, Computed } from "https://deno.land/x/tui@version/mod.ts";

...

// Create signal to make number automatically reactive
const number = new Signal(0);

const button = new Button({
  parent: tui,
  zIndex: 0,
  label: {
    text: new Computed(() => number.value.toString()), // cast number to string
  },
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgLightRed,
    active: crayon.bgYellow,
  },
  rectangle: {
    column: 1,
    row: 1,
    height: 5,
    width: 10,
  },
});

  // If button is active (pressed) make number bigger by one
button.state.when("active", (state) => {
  ++number.value;
});

// Listen to mousePress event
button.on("mousePress", ({ drag, movementX, movementY }) => {
  if (!drag) return;

  // Use peek() to get signal's value when it happens outside of Signal/Computed/Effect
  const rectangle = button.rectangle.peek();
  // Move button by how much mouse has moved while dragging it
  rectangle.column += movementX;
  rectangle.row += movementY;
});
```

4. Run Tui

```ts
...

tui.run();
```

## 🤝 Contributing

**Tui** is open for any contributions.
<br /> If you feel like you can enhance this project - please open an issue and/or pull request.
<br /> Code should be well document and easy to follow what's going on.

This project follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.
<br /> If your pull request's code can be hard to understand, please add comments to it.

## 📝 Licensing

This project is available under **MIT** License conditions.
