import { useCallback, useEffect, useRef, useState } from "react"
import type { UpdateRoomFilterInput } from "@rendez/schema"
import { useSessionStorage } from "@uidotdev/usehooks"
import { ApiError, api } from "@/lib/axios"
import { env } from "@/lib/env"
import { ACTIVE_ROOM_KEY } from "../lib/room"
import type { Room, RoomProposalField } from "../types/room"

export type JoinRoomStatus = "joined" | "already" | "not-found" | "duplicate"

export type RoomStatus = "loading" | "ready" | "not-found" | "error"

const POLL_INTERVAL_MS = 5_000

export interface ProposalSubmitItem {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
  autoApply?: boolean
}

export interface UseRoomsResult {
  rooms: Record<string, Room>
  activeCode: string
  setActiveCode: (code: string) => void
  getRoom: (code: string) => Room | undefined
  getRoomStatus: (code: string) => RoomStatus
  storeRoom: (room: Room) => void
  retryRoom: (code: string) => void
  createRoom: (name: string) => Promise<string>
  joinRoom: (code: string, displayName: string) => Promise<JoinRoomStatus>
  addMyProposal: (code: string, input: ProposalSubmitItem) => Promise<void>
  addMyProposals: (
    code: string,
    inputs: Omit<ProposalSubmitItem, "autoApply">[],
    options?: { autoApply?: boolean; mode?: "append" | "replace" },
  ) => Promise<void>
  applyProposal: (code: string, proposalId: string) => Promise<string>
  dismissProposal: (code: string, proposalId: string) => Promise<void>
  updateRoomFilter: (code: string, input: UpdateRoomFilterInput) => Promise<void>
  updateMyLocation: (
    code: string,
    input: { lat: number | null; lng: number | null; locationLabel?: string | null },
  ) => Promise<Room>
  deleteProposal: (code: string, proposalId: string) => Promise<Room>
  leaveRoom: (code: string) => Promise<void>
}

interface JoinRoomResponse {
  room: Room
  memberId: string
  joined: boolean
}

interface ApplyProposalResponse {
  room: Room
  summary: string
}

export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useState<Record<string, Room>>({})
  const [activeCode, setActiveCode] = useSessionStorage<string>(ACTIVE_ROOM_KEY, "")
  const [missingCodes, setMissingCodes] = useState<ReadonlySet<string>>(new Set())
  const [errorCodes, setErrorCodes] = useState<ReadonlySet<string>>(new Set())

  const fetchedRef = useRef(new Set<string>())
  const seqRef = useRef(0)
  const mutationSeqRef = useRef(new Map<string, number>())

  const storeRoom = useCallback((room: Room) => {
    setRooms((prev) => {
      const existing = prev[room.code]
      if (existing && JSON.stringify(existing) === JSON.stringify(room)) return prev
      return { ...prev, [room.code]: room }
    })
    setMissingCodes((prev) => {
      if (!prev.has(room.code)) return prev
      const next = new Set(prev)
      next.delete(room.code)
      return next
    })
    setErrorCodes((prev) => {
      if (!prev.has(room.code)) return prev
      const next = new Set(prev)
      next.delete(room.code)
      return next
    })
  }, [])

  const fetchRoom = useCallback(
    async (code: string): Promise<Room | undefined> => {
      if (!code) return undefined
      const startedSeq = ++seqRef.current
      try {
        const { data } = await api.get<Room>(`/rooms/${code}`)
        if (startedSeq < (mutationSeqRef.current.get(code) ?? 0)) return undefined
        storeRoom(data)
        return data
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setMissingCodes((prev) => new Set(prev).add(code))
        } else {
          setErrorCodes((prev) => new Set(prev).add(code))
        }
        return undefined
      }
    },
    [storeRoom],
  )

  const getRoom = useCallback(
    (code: string) => {
      const cached = rooms[code]
      if (!cached && code && !fetchedRef.current.has(code)) {
        fetchedRef.current.add(code)
        void fetchRoom(code)
      }
      return cached
    },
    [rooms, fetchRoom],
  )

  const getRoomStatus = useCallback(
    (code: string): RoomStatus => {
      if (rooms[code]) return "ready"
      if (missingCodes.has(code)) return "not-found"
      if (errorCodes.has(code)) return "error"
      return "loading"
    },
    [rooms, missingCodes, errorCodes],
  )

  const retryRoom = useCallback(
    (code: string) => {
      fetchedRef.current.delete(code)
      setErrorCodes((prev) => {
        if (!prev.has(code)) return prev
        const next = new Set(prev)
        next.delete(code)
        return next
      })
      void fetchRoom(code)
    },
    [fetchRoom],
  )

  const markMutation = useCallback((code: string) => {
    mutationSeqRef.current.set(code, ++seqRef.current)
  }, [])

  const createRoom = useCallback(
    async (name: string): Promise<string> => {
      const { data } = await api.post<Room>("/rooms", { name })
      markMutation(data.code)
      storeRoom(data)
      fetchedRef.current.add(data.code)
      setActiveCode(data.code)
      return data.code
    },
    [markMutation, storeRoom, setActiveCode],
  )

  const joinRoom = useCallback(
    async (code: string, displayName: string): Promise<JoinRoomStatus> => {
      const normalized = code.trim().toUpperCase()
      try {
        const { data } = await api.post<JoinRoomResponse>(`/rooms/${normalized}/join`, {
          displayName: displayName.trim(),
        })
        markMutation(normalized)
        storeRoom(data.room)
        fetchedRef.current.add(normalized)
        setActiveCode(normalized)
        return data.joined ? "joined" : "already"
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return "not-found"
        if (error instanceof ApiError && error.status === 409) return "duplicate"
        throw error
      }
    },
    [markMutation, storeRoom, setActiveCode],
  )

  const addMyProposal = useCallback(
    async (code: string, input: ProposalSubmitItem) => {
      const { data } = await api.post<Room>(`/rooms/${code}/proposals`, input)
      markMutation(code)
      storeRoom(data)
    },
    [markMutation, storeRoom],
  )

  const addMyProposals = useCallback(
    async (
      code: string,
      inputs: Omit<ProposalSubmitItem, "autoApply">[],
      options?: { autoApply?: boolean; mode?: "append" | "replace" },
    ) => {
      if (options?.mode === "replace") {
        const { data } = await api.post<Room>(`/rooms/${code}/filter`, {
          action: "replace",
          items: inputs,
        })
        markMutation(code)
        storeRoom(data)
        return
      }
      const autoApply = options?.autoApply ?? true
      let latestRoom: Room | undefined
      for (const item of inputs) {
        const { data } = await api.post<Room>(`/rooms/${code}/proposals`, {
          ...item,
          autoApply,
        })
        latestRoom = data
      }
      if (latestRoom) {
        markMutation(code)
        storeRoom(latestRoom)
      }
    },
    [markMutation, storeRoom],
  )

  const applyProposal = useCallback(
    async (code: string, proposalId: string): Promise<string> => {
      const { data } = await api.post<ApplyProposalResponse>(
        `/rooms/${code}/proposals/${proposalId}/apply`,
      )
      markMutation(code)
      storeRoom(data.room)
      return data.summary
    },
    [markMutation, storeRoom],
  )

  const dismissProposal = useCallback(
    async (code: string, proposalId: string) => {
      const { data } = await api.post<Room>(`/rooms/${code}/proposals/${proposalId}/dismiss`)
      markMutation(code)
      storeRoom(data)
    },
    [markMutation, storeRoom],
  )

  const updateRoomFilter = useCallback(
    async (code: string, input: UpdateRoomFilterInput) => {
      const { data } = await api.post<Room>(`/rooms/${code}/filter`, input)
      markMutation(code)
      storeRoom(data)
    },
    [markMutation, storeRoom],
  )

  const leaveRoom = useCallback(
    async (code: string) => {
      const me = rooms[code]?.members.find((member) => member.isMe)
      if (!me) throw new ApiError("Bạn cần tham gia phòng trước khi rời", 403)
      await api.delete<Room>(`/rooms/${code}/members/${me.id}`)
      setRooms((prev) => {
        const next = { ...prev }
        delete next[code]
        return next
      })
      fetchedRef.current.delete(code)
      setActiveCode("")
    },
    [rooms, setActiveCode],
  )

  const updateMyLocation = useCallback(
    async (
      code: string,
      input: { lat: number | null; lng: number | null; locationLabel?: string | null },
    ) => {
      const { data } = await api.patch<Room>(`/rooms/${code}/me/location`, input)
      storeRoom(data)
      return data
    },
    [storeRoom],
  )

  const deleteProposal = useCallback(
    async (code: string, proposalId: string) => {
      const { data } = await api.delete<Room>(`/rooms/${code}/proposals/${proposalId}`)
      storeRoom(data)
      return data
    },
    [storeRoom],
  )

  useEffect(() => {
    if (!activeCode) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | undefined
    let source: EventSource | undefined

    const pull = async () => {
      if (cancelled) return
      await fetchRoom(activeCode)
    }

    const startPolling = () => {
      if (pollTimer || cancelled) return
      void pull()
      pollTimer = setInterval(() => void pull(), POLL_INTERVAL_MS)
    }

    if (env.enableMocks) {
      startPolling()
    } else {
      const base = env.apiBaseUrl.replace(/\/$/, "")
      source = new EventSource(`${base}/rooms/${activeCode}/events`)
      source.addEventListener("room-updated", () => {
        void pull()
      })
      source.onerror = () => {
        source?.close()
        source = undefined
        startPolling()
      }
    }

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      source?.close()
    }
  }, [activeCode, fetchRoom])

  return {
    rooms,
    activeCode,
    setActiveCode,
    getRoom,
    getRoomStatus,
    storeRoom,
    retryRoom,
    createRoom,
    joinRoom,
    addMyProposal,
    addMyProposals,
    applyProposal,
    dismissProposal,
    updateRoomFilter,
    updateMyLocation,
    deleteProposal,
    leaveRoom,
  }
}
