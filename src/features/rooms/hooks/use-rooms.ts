import { useCallback, useState } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import type { Room } from "../types/room"
import {
  addProposal,
  applyProposal,
  createRoom as buildRoom,
  dismissProposal,
  generateRoomCode,
  joinRoom as joinRoomLib,
  leaveRoom as leaveRoomLib,
} from "../lib/room"

/** Toàn bộ phòng của máy này — key chia sẻ giữa các tab để demo "nhiều người". */
const ROOMS_KEY = "danang-rooms-v1"
/** Phòng đang mở của tab hiện tại — sessionStorage, mỗi tab một người. */
const ACTIVE_ROOM_KEY = "danang-room-active"
/** Danh tính thành viên của tab hiện tại — sessionStorage, mỗi tab một người. */
const MY_MEMBER_KEY = "danang-room-member-id"

export interface UseRoomsResult {
  rooms: Record<string, Room>
  /** Mã phòng đang hoạt động; `""` = chưa vào phòng nào. */
  activeCode: string
  setActiveCode: (code: string) => void
  /** Id thành viên của tab này — mỗi tab một người trong demo (sessionStorage per tab). */
  myMemberId: string
  getRoom: (code: string) => Room | undefined
  createRoom: (name: string) => Room
  joinRoom: (code: string, displayName: string) => Room | undefined
  /** Thêm đề xuất cho thành viên hiện tại. */
  addMyProposal: (
    code: string,
    input: {
      kind: "include" | "exclude"
      field: "category" | "district" | "priceMax" | "keyword"
      value: string
    },
  ) => void
  applyProposal: (code: string, proposalId: string) => void
  dismissProposal: (code: string, proposalId: string) => void
  leaveRoom: (code: string) => void
}

/**
 * Danh sách phòng lọc nhóm, lưu bền ở localStorage.
 *
 * `useLocalStorage` của `@uidotdev/usehooks` đăng ký `storage` event
 * (đã verify trong `node_modules/@uidotdev/usehooks/index.js`) nên mọi thay đổi
 * ở tab này tự cập nhật ở tab khác — đủ cho demo "nhiều thành viên cùng 1 máy".
 * Đa thiết bị thật cần backend (xem D-030/BACKLOG).
 */
export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useLocalStorage<Record<string, Room>>(ROOMS_KEY, {})
  /**
   * Phòng đang mở là trạng thái **của từng tab** (sessionStorage), không phải của
   * máy: dữ liệu phòng chia sẻ qua localStorage, nhưng mỗi tab là một người nên
   * tab mới mở link vẫn phải tham gia bằng tên trước khi thấy kết quả chung.
   */
  const [activeCode, setActiveCodeState] = useState<string>(
    () => sessionStorage.getItem(ACTIVE_ROOM_KEY) ?? "",
  )

  const setActiveCode = useCallback((code: string) => {
    sessionStorage.setItem(ACTIVE_ROOM_KEY, code)
    setActiveCodeState(code)
  }, [])
  /**
   * Danh tính của tab này: `sessionStorage` tách riêng từng tab nên mở 2 tab là
   * 2 thành viên khác nhau — đúng kịch bản demo "nhóm bạn cùng lọc".
   */
  const [myMemberId, setMyMemberId] = useState<string>(
    () => sessionStorage.getItem(MY_MEMBER_KEY) ?? "u-me",
  )

  const rememberMember = useCallback((memberId: string) => {
    sessionStorage.setItem(MY_MEMBER_KEY, memberId)
    setMyMemberId(memberId)
  }, [])

  const updateRoom = useCallback(
    (code: string, updater: (room: Room) => Room) => {
      setRooms((prev) => {
        const room = prev[code]
        if (!room) return prev
        return { ...prev, [code]: updater(room) }
      })
    },
    [setRooms],
  )

  const createRoom = useCallback(
    (name: string): Room => {
      const code = generateRoomCode()
      const room = buildRoom(name, code)
      setRooms((prev) => ({ ...prev, [code]: room }))
      setActiveCode(code)
      // Người tạo phòng luôn là ME trong mock — tab mới tham gia bằng tên riêng.
      rememberMember("u-me")
      return room
    },
    [setRooms, setActiveCode, rememberMember],
  )

  const joinRoom = useCallback(
    (code: string, displayName: string): Room | undefined => {
      const room = rooms[code]
      if (!room) return undefined
      const joined = joinRoomLib(room, displayName)
      setRooms((prev) => ({ ...prev, [code]: joined }))
      setActiveCode(code)
      // Ghi nhớ danh tính của tab này theo tên vừa tham gia.
      const member = joined.members.find(
        (candidate) => candidate.displayName.toLowerCase() === displayName.trim().toLowerCase(),
      )
      if (member) rememberMember(member.id)
      return joined
    },
    [rooms, setRooms, setActiveCode, rememberMember],
  )

  const getRoom = useCallback((code: string) => rooms[code], [rooms])

  const addMyProposal = useCallback(
    (
      code: string,
      input: {
        kind: "include" | "exclude"
        field: "category" | "district" | "priceMax" | "keyword"
        value: string
      },
    ) => {
      updateRoom(code, (room) => addProposal(room, { ...input, memberId: myMemberId }))
    },
    [updateRoom, myMemberId],
  )

  const applyProposalToRoom = useCallback(
    (code: string, proposalId: string) => {
      updateRoom(code, (room) => applyProposal(room, proposalId))
    },
    [updateRoom],
  )

  const dismissProposalInRoom = useCallback(
    (code: string, proposalId: string) => {
      updateRoom(code, (room) => dismissProposal(room, proposalId))
    },
    [updateRoom],
  )

  const leaveRoom = useCallback(
    (code: string) => {
      // Rời theo danh tính của tab này — không phải thành viên `isMe` (chủ phòng
      // có thể vẫn đang ở trong phòng từ tab khác).
      updateRoom(code, (room) => leaveRoomLib(room, myMemberId))
      setActiveCode("")
    },
    [updateRoom, setActiveCode, myMemberId],
  )

  return {
    rooms,
    activeCode,
    setActiveCode,
    myMemberId,
    getRoom,
    createRoom,
    joinRoom,
    addMyProposal,
    applyProposal: applyProposalToRoom,
    dismissProposal: dismissProposalInRoom,
    leaveRoom,
  }
}
