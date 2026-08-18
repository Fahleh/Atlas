// __esModule must resolve falsy, or TS's import interop skips wrapping and
// `styles` ends up as the literal string "default" on the importing side.
module.exports = new Proxy(
  {},
  {
    get: (_target, property) =>
      property === "__esModule" ? undefined : property,
  },
);
