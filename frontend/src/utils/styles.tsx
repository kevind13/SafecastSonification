export const cls = (...arr: any) => {
  return [...arr].filter((i) => !!i).join(' ');
};
