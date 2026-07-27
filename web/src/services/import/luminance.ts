export function calculateLuminance(
  red: number,
  green: number,
  blue: number,
): number {
  const value = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  if (value <= Number.EPSILON) return 0
  if (value >= 255 - Number.EPSILON * 255) return 255
  return Math.min(255, Math.max(0, value))
}
