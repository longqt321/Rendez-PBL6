export const RRF_K = 60

/**
 * Hiệu chuẩn hệ số k theo quy mô corpus N theo công thức EGRF:
 * k(N) = max(10, floor(2 * sqrt(N)))
 * Khi N không truyền vào hoặc <= 0, fallback về hằng số chuẩn RRF_K = 60.
 */
export function calculateEgrfK(corpusSize?: number): number {
  if (corpusSize === undefined || corpusSize <= 0) return RRF_K
  return Math.max(10, Math.floor(2 * Math.sqrt(corpusSize)))
}

export interface FusionBranch {
  ids: string[]
  weight?: number
}

/**
 * Hợp nhất xếp hạng EGRF (Evidence-Gated Rank Fusion).
 * Cho phép tuỳ biến hệ số làm mịn k (mặc định RRF_K = 60 nếu không chỉ định).
 */
export function fuseRrf(branches: FusionBranch[], k?: number): string[]
export function fuseRrf(...branches: (FusionBranch | undefined)[]): string[]
export function fuseRrf(
  first: FusionBranch[] | FusionBranch | undefined,
  ...rest: (FusionBranch | number | undefined)[]
): string[] {
  let branches: FusionBranch[] = []
  let k = RRF_K

  if (Array.isArray(first)) {
    branches = first.filter((b): b is FusionBranch => Boolean(b))
    if (typeof rest[0] === "number") {
      k = rest[0]
    }
  } else {
    const all = [first, ...rest]
    for (const item of all) {
      if (typeof item === "number") {
        k = item
      } else if (item && typeof item === "object" && "ids" in item) {
        branches.push(item)
      }
    }
  }

  const scores = new Map<string, number>()
  const add = ({ ids, weight = 1 }: FusionBranch) => {
    if (weight <= 0) return
    ids.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + weight / (k + index + 1))
    })
  }
  for (const branch of branches) add(branch)
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
}
