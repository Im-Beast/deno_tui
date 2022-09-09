/** Promise with `reject` and `resolve` functions */
export class Deffered<T = void> extends Promise<T> {
  resolve!: (value: T | PromiseLike<T>) => void;
  // deno-lint-ignore no-explicit-any
  reject!: (reason?: any) => void;
  state!: "pending" | "fulfilled" | "rejected";

  constructor() {
    let functions!: {
      resolve: Deffered<T>["resolve"];
      reject: Deffered<T>["reject"];
    };

    super((resolve, reject) => {
      functions = {
        resolve: (v) => {
          resolve(v);
          this.state = "fulfilled";
        },
        reject: (v) => {
          reject(v);
          this.state = "rejected";
        },
      };
    });

    this.state = "pending";
    Object.assign(this, functions);
  }

  static get [Symbol.species]() {
    return Promise;
  }
}
