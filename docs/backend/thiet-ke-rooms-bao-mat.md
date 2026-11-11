# Thiết kế sửa nhóm lỗi bảo mật rooms (chuẩn ngành, có tra cứu)

> Nguồn tra cứu (2026-11-11): opaque capability token + hash at rest + cookie HttpOnly
> (Auth0, Nordic APIs); SSE pattern "invalidation + refetch" vs per-user payload
> (speakeasy, seeitflow); Prisma không hỗ trợ expression index → migration SQL thủ công
> (Prisma docs, StackOverflow); CAS `UPDATE ... WHERE status='open'` + kiểm số dòng ảnh hưởng
> (Postgres/ORM chuẩn).

## 1. Danh tính guest — capability token (thay memberId-là-credential)

**Chuẩn ngành:** token mờ (opaque) 32 byte CSPRNG, client nhận **đúng 1 lần**, server chỉ lưu
**hash**; không bao giờ tin danh tính do client khai.

- Sinh: `crypto.randomBytes(32)` → base64url. Không dùng `Math.random()`.
- Lưu DB: `HMAC-SHA256(rawToken, BETTER_AUTH_SECRET)` vào cột `token_hash` (migration mới
  thêm `token_hash`, **drop** `guest_token` cũ — không sửa migration cũ). Không cần pepper
  riêng: secret đã có, token giá trị thấp và scope theo phòng.
- Trả client: chỉ trong response của `POST /rooms/:code/join` (và `POST /rooms` cho chủ phòng).
- Join trùng tên (case-insensitive):
  - token khớp member cũ → trả lại member đó (idempotent thật).
  - không có token / token không khớp → **409** "Tên đã có người dùng trong phòng".
- TTL: member guest hết hạn sau 24h không hoạt động (`last_seen_at` cập nhật khi resolve
  actor; dọn khi `loadRoom` — không cần job riêng).

## 2. Resolve actor — middleware duy nhất, không tin client

`resolveRoomActor(c, room)` trả `{ memberId, isOwner }` theo thứ tự:

1. Session user (better-auth) — nếu user có `roomMember` liên kết (`user_id`).
2. Guest token (cookie/header theo quyết định ở mục 1) — so hash, kiểm `room_id`.

Tuyệt đối: **không** đọc `memberId`/`actorId` từ query/body để quyết định quyền. `isOwner`
chỉ từ `room.ownerId === user.id`. Mọi mutation (proposal, apply, dismiss, leave, kick) đi qua
middleware này.

## 3. SSE — broadcast trung tính + client refetch (Pattern A)

- Server broadcast: `event: room-updated`, `data: {"version": <số tăng dần>}` — **không** có
  `isMe`, **không** có memberId/token của actor, không payload người dùng.
- Client nhận event → `refetch()` `GET /rooms/:code` (server tính `isMe` per-viewer từ
  session/token của chính request đó).
- Lý do chọn Pattern A: trạng thái phòng nhỏ (1 GET rẻ), reconnect an toàn tuyệt đối (không
  mất event), loại trừ hoàn toàn lỗi rò rỉ per-viewer. Pattern B (Last-Event-ID + buffer) là
  over-engineering cho phòng lọc nhóm.
- Fallback: SSE lỗi → polling 5s (cùng mô hình notifications G3).
- Nginx/Caddy: tắt buffering cho route SSE (đã có ở Caddyfile — kiểm lại).

## 4. Mã phòng — CSPRNG

`crypto.randomInt(0, 32**6)` → base32 Crockford (bỏ I, L, O, U), in hoa. Giữ retry 5 lần khi
trùng code. Rate-limit `GET /rooms/:code` và `join` theo IP (dùng bảng `rate_limits` có sẵn,
mô hình như `/session`).

## 5. Unique tên trong phòng — expression index (migration mới)

Prisma không khai được index biểu thức trong `schema.prisma` → migration SQL thủ công:

```sql
CREATE UNIQUE INDEX "room_members_room_display_lower_key"
  ON "room_members" ("room_id", LOWER("display_name"));
```

- `joinRoom` giữ check-then-create cho happy path; P2002 là lưới an toàn race → bắt và trả
  member cũ (lookup lại bằng `mode: "insensitive"`).
- Không dùng `citext` (cột phải `Unsupported` trong Prisma — mất type, không đáng).

## 6. Apply proposal — CAS trong 1 transaction

```
tx: updated = updateMany({ where: { id, roomId, status: "open" },
                           data: { status: "applied", appliedBy, appliedAt } })
if (updated.count === 0) → 409 "Đề xuất đã được áp dụng hoặc đã bị bỏ"
cập nhật filter + publish room-updated trong CÙNG transaction
```

Quy tắc quyền (quyết định, ghi DECISIONS): **tác giả đề xuất hoặc chủ phòng** được apply —
người khác không apply hộ đề xuất của người khác.

## 7. priceMax — không tự quy về 3

`describeProposal`/parse: giá trị không parse được → bỏ trường (undefined), FE hiển thị "—".
Một nguồn sự thật duy nhất ở backend; FE chỉ render dữ liệu server trả.

## 8. Frontend

- Hook chuyển sang query async: loading / error / not-found tách bạch. Bỏ hẳn
  localStorage/sessionStorage làm nguồn dữ liệu (sessionStorage chỉ giữ token guest nếu chọn
  phương án header — xem mục 1).
- `myMemberId` mặc định rỗng; chỉ set sau khi server trả. Không còn `"u-me"` cứng.
- Xoá nghiệp vụ lặp trong `lib/room.ts` (generateRoomCode, joinRoom, applyProposal,
  dismissProposal, leaveRoom); giữ tối đa type + helper hiển thị. `room.test.ts` cập nhật/xoá
  tương ứng — không giữ test kiểm logic đã xoá.
- Toast apply dùng `summary` từ response server.
- Copy "Dữ liệu phòng chỉ lưu trên máy này" bỏ (sai sau khi nối API).
- `api-contracts.ts` thêm schema cho `/rooms/**`.

## 9. Tài liệu

- `docs/backend/API.md`: mô tả token guest, mã lỗi mới (409 tên trùng, 409 apply trùng,
  401/403 actor), rate limit.
- `docs/DECISIONS.md`: mục mới đánh số tiếp theo — token guest hashed, SSE trung tính,
  CAS apply, quyền apply, base32 Crockford.
- `docs/BACKLOG.md`: các hạng mục chưa làm (nếu có).
