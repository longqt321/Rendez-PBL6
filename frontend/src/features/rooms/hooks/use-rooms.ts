import { useCallback, useEffect, useRef, useState } from "react"
import { useSessionStorage } from "@uidotdev/usehooks"
import { ApiError, api } from "@/lib/axios"
import { env } from "@/lib/env"
import type { Room } from "../types/room"

/** Kết quả của `joinRoom` — UI đọc để hiện toast đúng nguyên nhân. */
export type JoinRoomStatus = "joined" | "already" | "not-found" | "duplicate"

/** Trạng thái tải của một phòng — tách bạch loading/not-found/error/ready. */
export type RoomStatus = "loading" | "ready" | "not-found" | "error"

/** Phòng đang mở của tab hiện tại — sessionStorage, mỗi tab một người. */
const ACTIVE_ROOM_KEY = "danang-room-active"

/** Nhịp polling khi mock bật hoặc SSE hỏng (ms). */
const POLL_INTERVAL_MS = 5_000

export interface UseRoomsResult {
  /** Cache phòng theo mã — chỉ trong bộ nhớ, nguồn sự thật là server. */
  rooms: Record<string, Room>
  /** Mã phòng đang hoạt động; `""` = chưa vào phòng nào. */
  activeCode: string
  setActiveCode: (code: string) => void
  /** Trả phòng đã cache; lần đầu chưa có thì fetch nền và trả `undefined`. */
  getRoom: (code: string) => Room | undefined
  /** Trạng thái tải của phòng — UI dùng để phân biệt đang tải/không tồn tại/lỗi. */
  getRoomStatus: (code: string) => RoomStatus
  /** Thử tải lại phòng sau lỗi mạng. */
  retryRoom: (code: string) => void
  /** Tạo phòng trên server; trả mã phòng. Ném `ApiError` (vd 401) khi thất bại. */
  createRoom: (name: string) => Promise<string>
  /**
   * Tham gia phòng. `"already"` khi cookie token khớp thành viên cũ (server trả
   * 200 + `joined:false` — người dùng đã ở trong phòng, KHÔNG phải trùng tên);
   * `"duplicate"` chỉ khi server trả 409 (tên đã có người khác dùng);
   * `"not-found"` khi mã phòng sai.
   */
  joinRoom: (code: string, displayName: string) => Promise<JoinRoomStatus>
  /** Thêm đề xuất cho thành viên hiện tại (danh tính do cookie/session). */
  addMyProposal: (
    code: string,
    input: {
      kind: "include" | "exclude"
      field: "category" | "district" | "priceMax" | "keyword"
      value: string
    },
  ) => Promise<void>
  /** Áp đề xuất vào bộ lọc chung; trả mô tả từ server cho toast. */
  applyProposal: (code: string, proposalId: string) => Promise<string>
  dismissProposal: (code: string, proposalId: string) => Promise<void>
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

/**
 * Phòng lọc nhóm — trạng thái lấy từ API backend (`/rooms`), đồng bộ realtime
 * qua SSE (hoặc polling khi mock bật / SSE hỏng).
 *
 * Danh tính guest nằm trong cookie HttpOnly theo phòng do server đặt — hook
 * KHÔNG giữ `memberId`/token. `isMe` luôn do server tính theo người gọi.
 * `activeCode` vẫn ở sessionStorage: mỗi tab mở một phòng riêng.
 */
export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useState<Record<string, Room>>({})
  const [activeCode, setActiveCode] = useSessionStorage<string>(ACTIVE_ROOM_KEY, "")
  const [missingCodes, setMissingCodes] = useState<ReadonlySet<string>>(new Set())
  const [errorCodes, setErrorCodes] = useState<ReadonlySet<string>>(new Set())

  /** Mã đã thử fetch — tránh gọi lặp mỗi lần render. */
  const fetchedRef = useRef(new Set<string>())
  /**
   * Chống race "GET cũ ghi đè mutation mới": mỗi response mutation tăng số
   * thứ tự của phòng; GET bắt đầu TRƯỚC mutation đó (số thứ tự nhỏ hơn) bị bỏ
   * qua khi về — nếu không, GET polling đang bay có thể xoá đề xuất vừa thêm
   * khỏi UI trong vài giây (bắt được trong e2e).
   */
  const seqRef = useRef(0)
  const mutationSeqRef = useRef(new Map<string, number>())

  /** Ghi phòng vào cache; bỏ qua khi dữ liệu không đổi để tránh render thừa. */
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
        // GET bắt đầu trước một mutation đã hoàn tất → dữ liệu cũ, bỏ qua.
        if (startedSeq < (mutationSeqRef.current.get(code) ?? 0)) return undefined
        storeRoom(data)
        return data
      } catch (error) {
        // 404 = phòng không tồn tại; lỗi khác (mạng/5xx) là "error" để UI cho thử lại.
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
      // Chưa fetch xong (hoặc chưa bắt đầu) — `getRoom` sẽ khởi động.
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

  /** Đánh dấu phòng vừa nhận response mutation — GET cũ hơn sẽ bị bỏ qua. */
  const markMutation = useCallback((code: string) => {
    mutationSeqRef.current.set(code, ++seqRef.current)
  }, [])

  const createRoom = useCallback(
    async (name: string): Promise<string> => {
      // 401 khi chưa đăng nhập — để lỗi nổi lên cho UI hiện toast.
      const { data } = await api.post<Room>("/rooms", { name })
      markMutation(data.code)
      storeRoom(data)
      fetchedRef.current.add(data.code)
      setActiveCode(data.code)
      return data.code
    },
    [storeRoom, setActiveCode],
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
        // `joined:false` = token cũ khớp thành viên (đã ở trong phòng) — thành
        // công, không phải trùng tên. Trùng tên thật do server trả 409.
        return data.joined ? "joined" : "already"
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return "not-found"
        if (error instanceof ApiError && error.status === 409) return "duplicate"
        throw error
      }
    },
    [storeRoom, setActiveCode],
  )

  const addMyProposal = useCallback(
    async (
      code: string,
      input: {
        kind: "include" | "exclude"
        field: "category" | "district" | "priceMax" | "keyword"
        value: string
      },
    ) => {
      const { data } = await api.post<Room>(`/rooms/${code}/proposals`, input)
      markMutation(code)
      storeRoom(data)
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

  /**
   * Đồng bộ phòng đang mở.
   *
   * Mock bật → polling qua axios adapter (EventSource không đi qua adapter).
   * Mock tắt → SSE thật: server chỉ phát `room-updated` + `{version}`, client
   * refetch để nhận DTO tính `isMe` theo đúng cookie/session của mình.
   * SSE lỗi → đóng stream và chuyển sang polling 5s.
   */
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
    retryRoom,
    createRoom,
    joinRoom,
    addMyProposal,
    applyProposal,
    dismissProposal,
    leaveRoom,
  }
}
