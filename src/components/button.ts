import { Box } from "./box.ts";

export class Button extends Box {
  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }
}
