import { TestEnvironment as JSDOMEnvironment } from "jest-environment-jsdom";

// jsdom has no fetch-family globals. Copied from the outer Node process
// (already has them natively, Node 18+), not a new polyfill dependency.
const GLOBALS_TO_COPY = [
  "fetch",
  "Headers",
  "Request",
  "Response",
  "FormData",
  "Blob",
  "TextEncoder",
  "TextDecoder",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "MessageChannel",
  "MessagePort",
  "BroadcastChannel",
  "structuredClone",
];

type MutableGlobal = Record<string, unknown>;

class HookTestEnvironment extends JSDOMEnvironment {
  openBroadcastChannels: BroadcastChannel[] = [];

  async setup() {
    await super.setup();
    const target = this.global as unknown as MutableGlobal;
    const source = globalThis as unknown as MutableGlobal;
    for (const name of GLOBALS_TO_COPY) {
      if (typeof target[name] === "undefined") {
        target[name] = source[name];
      }
    }
    // jsdom's XMLHttpRequest makes @mswjs/interceptors pull in an
    // untransformed browser bundle. Nothing here uses XHR, only fetch.
    delete target.XMLHttpRequest;

    // GoTrueClient opens one of these per client and never closes it here.
    // Tracked so teardown() below can close them.
    const RealBroadcastChannel = target.BroadcastChannel as typeof BroadcastChannel;
    const openBroadcastChannels = this.openBroadcastChannels;
    target.BroadcastChannel = class extends RealBroadcastChannel {
      constructor(name: string) {
        super(name);
        openBroadcastChannels.push(this);
      }
    };
  }

  async teardown() {
    for (const channel of this.openBroadcastChannels) {
      channel.close();
    }
    this.openBroadcastChannels = [];
    await super.teardown();
  }
}

export default HookTestEnvironment;
