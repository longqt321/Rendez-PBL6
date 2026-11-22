import { useState } from "react"
import { api } from "@/lib/axios"
import type { CastRoomVoteInput, Room, RoomVotingMode } from "@rendez/schema"

export function useRoomVoting(code: string, onUpdated?: (room: Room) => void) {
  const [pending, setPending] = useState(false)

  async function addCandidate(placeId: string): Promise<Room> {
    setPending(true)
    try {
      const { data } = await api.post<Room>(`/rooms/${code}/candidates`, { placeId })
      onUpdated?.(data)
      return data
    } finally {
      setPending(false)
    }
  }

  async function removeCandidate(candidateId: string): Promise<Room> {
    setPending(true)
    try {
      const { data } = await api.delete<Room>(`/rooms/${code}/candidates/${candidateId}`)
      onUpdated?.(data)
      return data
    } finally {
      setPending(false)
    }
  }

  async function startVoting(votingMode: RoomVotingMode, votingDeadlineAt?: string): Promise<Room> {
    setPending(true)
    try {
      const { data } = await api.post<Room>(`/rooms/${code}/voting/start`, {
        votingMode,
        ...(votingDeadlineAt ? { votingDeadlineAt } : {}),
      })
      onUpdated?.(data)
      return data
    } finally {
      setPending(false)
    }
  }

  async function castVote(input: CastRoomVoteInput): Promise<Room> {
    setPending(true)
    try {
      const { data } = await api.post<Room>(`/rooms/${code}/votes`, input)
      onUpdated?.(data)
      return data
    } finally {
      setPending(false)
    }
  }

  async function finalizeVoting(winnerPlaceId?: string): Promise<Room> {
    setPending(true)
    try {
      const { data } = await api.post<Room>(`/rooms/${code}/voting/finalize`, {
        ...(winnerPlaceId ? { winnerPlaceId } : {}),
      })
      onUpdated?.(data)
      return data
    } finally {
      setPending(false)
    }
  }

  return {
    pending,
    addCandidate,
    removeCandidate,
    startVoting,
    castVote,
    finalizeVoting,
  }
}
