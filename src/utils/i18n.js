export const t = (key) => {
  const dict = { 'units.cm': 'cm' }
  return dict[key] || key
}
