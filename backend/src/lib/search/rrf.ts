export const RRF_K = 60

export function fuseRrf(...branches: { ids: string[]; weight?: number }[]): string[] {
  const scores = new Map<string, number>()
  const add = ({ ids, weight = 1 }: { ids: string[]; weight?: number }) => {
    if (weight <= 0) return
    ids.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + weight / (RRF_K + index + 1))
    })
  }
  for (const branch of branches) add(branch)
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
}
