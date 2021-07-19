export const requireFromString = (src: string, filename = "") => {
  const Module = module.constructor as any;
  const m = new Module();
  m._compile(src, filename);
  return m.exports;
};
