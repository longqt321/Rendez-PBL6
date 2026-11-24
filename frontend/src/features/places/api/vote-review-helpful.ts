import { api } from "@/lib/axios"

export interface VoteHelpfulResult {
  helpfulCount: number
  helpfulByMe: boolean
}

export async function voteReviewHelpful(reviewId: string): Promise<VoteHelpfulResult> {
  const { data } = await api.post<VoteHelpfulResult>(`/reviews/${reviewId}/helpful`)
  return data
}
