module.exports = new Proxy(
  {},
  {
    get: (_target, property) => property,
  },
);
