/** Sinh màu nền ổn định từ một chuỗi seed — cùng seed luôn ra cùng màu. */
function seedToHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

/** Dải màu đất, khớp ngôn ngữ thị giác của skin retro. */
const EARTH_HUES = [18, 32, 42, 78, 96, 118, 24, 8]

export function seedToGradient(seed: string): string {
  const hue = EARTH_HUES[seedToHue(seed) % EARTH_HUES.length]
  const second = (hue + 28) % 360
  return `linear-gradient(135deg, hsl(${hue} 42% 62%), hsl(${second} 38% 44%))`
}
