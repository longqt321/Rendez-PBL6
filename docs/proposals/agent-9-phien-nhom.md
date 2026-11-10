# Agent 9 — Phiên nhóm: mời, tham gia, chốt quyết định

> Góc nghiên cứu: **"keo dính" của tính năng nhóm** — làm sao 4 người bạn vào cùng một phiên,
> thấy cùng dữ liệu, và chốt được một quán trong vài phút thay vì cãi nhau 20 phút trong nhóm chat.
> Chỉ đọc code, không sửa gì ngoài file này.

## Kế thừa từ đợt trước (không lặp lại)

- **DX-2.1** feed "Đang theo dõi" — không đụng.
- **DX-5.3** đề xuất địa điểm có lối thoát — không đụng.
- **DX-4.x** bộ sưu tập (đã triển khai một phần theo D-021/D-024) — phiên nhóm sẽ **tái dùng**
  `Collection` làm nguồn danh sách quán ứng viên thay vì dựng model riêng (xem DX-9.1).
- **DX-7** sở thích nhóm và **DX-8** chia hóa đơn (agent khác, cùng đợt) — cả hai đều **cần một
  phiên nhóm tồn tại trước**. Đề xuất dưới đây chỉ làm phần "hạ tầng phiên": mời, tham gia,
  trạng thái chung, chốt. Thuật toán lọc theo sở thích (DX-7) và tính tiền (DX-8) nằm ngoài phạm vi.

## Hiện trạng (bằng chứng code + giới hạn hạ tầng)

| #   | Thực tế                                                                        | Bằng chứng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mock là **axios adapter chạy trong bộ nhớ của từng tab trình duyệt**           | `mockAdapter` — [server.ts:1069-1083](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L1069-L1083); db in-memory [server.ts:42-50](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L42-L50)                                                                                                                                                                                                                                                                            |
| 2   | **Chỉ có 1 người dùng** `ME`/`CURRENT_USER`, không có auth                     | import `CURRENT_USER, ME, MOCK_USERS` — [server.ts:16](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L16); mọi mutation gắn cứng `CURRENT_USER` (ví dụ [server.ts:237](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L237), `isMine` ở [server.ts:269](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L269))                                                                                                                                          |
| 3   | **Không có polling nào** trong toàn bộ `src/`                                  | grep `refetchInterval` → 0 kết quả; duy nhất `staleTime: 60_000` ở [use-place-suggestions.ts:17](file:///home/longtran/Projects/frontend/src/features/places/hooks/use-place-suggestions.ts#L17)                                                                                                                                                                                                                                                                                               |
| 4   | `QueryClient` **không cấu hình option nào** → dùng default                     | [query-provider.tsx:4](file:///home/longtran/Projects/frontend/src/app/providers/query-provider.tsx#L4) — `new QueryClient()` trống; nghĩa là `refetchInterval` dùng được **ngay ở cấp query** mà không phải sửa provider                                                                                                                                                                                                                                                                      |
| 5   | Hạ tầng chia sẻ link đã hoàn chỉnh                                             | `shareLink` (Web Share + clipboard fallback, trả enum) — [share.ts:24-43](file:///home/longtran/Projects/frontend/src/lib/share.ts#L24-L43); `ShareButton` — [share-button.tsx](file:///home/longtran/Projects/frontend/src/components/shared/share-button.tsx); hiện chỉ dùng cho bộ sưu tập (TONG-HOP §1)                                                                                                                                                                                    |
| 6   | Mẫu Dialog/Drawer responsive đã có sẵn để copy                                 | `useMediaQuery("(min-width: 768px)")` chọn Dialog (PC) / Drawer (mobile) — [comment-thread.tsx:31](file:///home/longtran/Projects/frontend/src/features/social/components/comment-thread.tsx#L31); Drawer hỗ trợ `snapPoints`, chiều rộng 24rem trên desktop — [drawer.tsx:115](file:///home/longtran/Projects/frontend/src/components/ui/drawer.tsx#L115); `DialogContent` giới hạn `sm:max-w-sm` — [dialog.tsx:51](file:///home/longtran/Projects/frontend/src/components/ui/dialog.tsx#L51) |
| 7   | Job "nền" phía server mô phỏng bằng cách chạy lúc GET (lazy)                   | `syncPlaceSuggestions()` chạy trong handler `GET /notifications` — [server.ts:172-198](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L172-L198), [server.ts:1043](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L1043) — cùng pattern dùng được cho hết hạn phiên                                                                                                                                                                                                  |
| 8   | Route gom dưới `AppShell`, thêm route mới là 1 dòng                            | [routes.tsx:20-37](file:///home/longtran/Projects/frontend/src/app/router/routes.tsx#L20-L37)                                                                                                                                                                                                                                                                                                                                                                                                  |
| 9   | Giới hạn ký tự tập trung ở `@/lib/constants`, client và server khớp nhau       | [constants.ts](file:///home/longtran/Projects/frontend/src/lib/constants.ts) — phiên nhóm cần thêm hằng số vào đây                                                                                                                                                                                                                                                                                                                                                                             |
| 10  | Form chuẩn: react-hook-form + zod + zodResolver, `Field`/`FieldLabel`          | Đã là quy ước dự án (D-012, D-014) — form "tham gia bằng tên" dùng đúng bộ này                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 11  | Thông báo toàn cục là union có thể mở rộng, nhưng **không nên dùng** cho phiên | `AppNotification` — [notification.ts](file:///home/longtran/Projects/frontend/src/features/notification/types/notification.ts) — đẩy sự kiện phiên vào đây sẽ spam tab Thông báo (lý do ở DX-9.5)                                                                                                                                                                                                                                                                                              |

**Giới hạn hạ tầng phải nói thẳng:** vì adapter mock nằm trong bộ nhớ của từng tab (bằng chứng #1),
**hai thiết bị khác nhau không thể thấy cùng một phiên** — dù UI có hoàn chỉnh. Mock chỉ demo được
phiên nhóm theo 1 trong 2 cách (chi tiết ở mục "Cách thử với mock hiện tại"):

1. **Thành viên khác là bot do "server" mô phỏng** (đủ để demo toàn luồng trên 1 máy).
2. **Đồng bộ mock db giữa các tab cùng máy** qua `localStorage` + `BroadcastChannel` (demo 2 tab
   cạnh nhau, thuyết phục hơn nhưng phải sửa `src/mocks/`).

Cả hai đều là **đường dây demo**, không phải sản phẩm thật. Phiên nhóm đa thiết bị thật sự **bắt
buộc có backend thật** (ít nhất: REST + polling, lý tưởng: WebSocket/SSE).

## Đề xuất

> Ký hiệu phạm vi: **BE** = thêm route/logic ở mock (hợp đồng API chốt trước) · **FE** = chỉ frontend.
> Mọi đề xuất đều **không thêm dependency**.

### DX-9.1: Tạo phiên nhóm + link mời, khách tham gia bằng tên

- **Vấn đề:** muốn đi ăn cùng nhóm thì phải chụp màn hình gửi qua Zalo, mỗi người tự nhớ tên quán.
  Không có "nơi chung" nào để cả nhóm nhìn cùng một danh sách.
- **Hiện trạng:** không có bất kỳ khái niệm "nhóm/phiên" nào trong code (grep `session|group` trong
  `src/` → chỉ có `ToggleGroup` của UI). Hạ tầng chia sẻ link đã sẵn sàng (bằng chứng #5) nhưng
  chỉ chia sẻ nội dung tĩnh (bộ sưu tập), không chia sẻ trạng thái động.
- **UX:**
  1. Nút **"Rủ nhóm đi ăn"** ở `/saved` (kế bên tab Bộ sưu tập) hoặc trong trang bộ sưu tập →
     `CreateSessionDialog`: chọn bộ sưu tập làm danh sách ứng viên (hoặc để trống để thêm sau),
     đặt tên phiên ("Đi ăn tối thứ 7"), thời hạn (mặc định 2 giờ).
  2. Tạo xong → `DialogContent` hiện **mã 6 ký tự** + nút `ShareButton` (dùng lại nguyên si,
     chỉ truyền `/sessions/:code`). Người không cài app mở link trên browser vẫn vào được —
     vì app là SPA chạy trên web.
  3. Mở link khi chưa tham gia → `JoinSessionDialog`: nhập **tên hiển thị** (1–40 ký tự,
     zod validate) → vào thẳng phiên. Không cần tài khoản, không cần cài.
- **Mô hình dữ liệu:**

  ```ts
  interface GroupSession {
    id: string
    /** Mã mời 6 ký tự (A–Z, 2–9, bỏ ký tự dễ nhầm I/O/0/1) — dùng trong URL /sessions/:code */
    code: string
    hostId: string // memberId của người tạo
    title: string
    /** Nguồn ứng viên: tái dùng Collection đã có (DX-4.x), không dựng model mới */
    collectionId: string | null
    members: SessionMember[]
    status: "voting" | "decided" | "closed"
    /** Lazy-expiry: server kiểm lúc GET, giống pattern syncPlaceSuggestions */
    expiresAt: string
    createdAt: string
  }

  interface SessionMember {
    id: string // memberId nội bộ của phiên, KHÔNG phải user id toàn cục
    displayName: string
    isGuest: boolean // true = vào bằng tên, không có tài khoản
    joinedAt: string
    /** Server cập nhật mỗi lần member này GET phiên → nguồn cho "đang xem" */
    lastSeenAt: string
  }
  ```

  Hợp đồng API (ghi `DECISIONS.md` trước khi implement, theo quy ước D-011):

  | Method | Path                   | Response                                          |
  | ------ | ---------------------- | ------------------------------------------------- |
  | POST   | `/sessions`            | `GroupSession`                                    |
  | GET    | `/sessions/:code`      | `GroupSession` (+ state bỏ phiếu, xem DX-9.2/9.3) |
  | POST   | `/sessions/:code/join` | `GroupSession` (body `{ displayName }`)           |
  | POST   | `/sessions/:id/leave`  | `GroupSession`                                    |

- **Cơ chế đồng bộ (không có WebSocket):**
  - Query `["session", code]` với `refetchInterval: 5000` — **chỉ khi trang phiên đang mở**
    (query unmount là dừng, không tốn gì khi rời trang). 5 giây là đủ cho quyết định ăn uống,
    không đủ nhanh để gây cảm giác realtime giả.
  - `refetchIntervalInBackground: false` (default) — tab ẩn thì ngừng polling, tiết kiệm pin.
  - Join/vote là mutation **optimistic** theo pattern đã chuẩn hoá ở D-024 (like bộ sưu tập),
    rollback khi lỗi.
  - Không cần `refetchOnWindowFocus` riêng — default đã bật, và polling đã phủ nó.
- **Giá trị thực:** đây là cửa vào của cả DX-7 và DX-8. Không có phiên thì "sở thích nhóm" và
  "chia hóa đơn" không có chỗ để gắn.
- **Phạm vi:** BE · **M** (feature `src/features/session/`: types, api, hooks, 3 component dialog,
  1 trang `/sessions/:code`; mock thêm ~6 route + 2 fixture rỗng).
- **Rủi ro:** mã 6 ký tự có thể đoán — chấp nhận được vì nội dung phiên chỉ là quán ăn, không có
  dữ liệu nhạy cảm; nếu lo, tăng lên 8 ký tự. Trùng tên khách — xử lý ở DX-9.2.

### DX-9.2: Trạng thái chung — ai đã vào, ai đã bỏ phiếu, ai chưa

- **Vấn đề:** trong nhóm chat, không ai biết ai đã xem, ai đồng ý. Người chốt phải hỏi từng người.
- **Hiện trạng:** không có gì. Nhưng model ở DX-9.1 đã chứa `lastSeenAt` — chỉ cần server trả
  trạng thái dẫn xuất và client render.
- **UX:** đầu trang phiên là một hàng thành viên: avatar chữ cái (`Avatar` + `AvatarFallback`,
  dùng cho guest bằng 2 chữ cái đầu tên) + chấm trạng thái: **đang xem** (GET trong 15 giây qua) /
  **đã tham gia, offline** / **đã bỏ phiếu** (dấu sao khi đã reveal, dấu chấm khi chưa).
  Guest trùng tên: server phân biệt bằng `memberId`, hiển thị "Hà (2)" — không chặn trùng tên vì
  chặn sẽ làm khách không vào được, phiền hơn lợi.
- **Mô hình dữ liệu:** không thêm bảng — `GET /sessions/:code` trả kèm:

  ```ts
  interface SessionMemberState extends SessionMember {
    hasVoted: boolean // đã bỏ phiếu (không lộ nội dung phiếu — xem DX-9.3)
    presence: "viewing" | "away" // server suy từ lastSeenAt, client không tự tính
  }
  ```

- **Cơ chế đồng bộ:** dùng chung polling 5 giây của DX-9.1 — **không thêm query nào**. `presence`
  do server suy từ `lastSeenAt` (giống `isMine`/`isPublished` là kết luận của server, client chỉ
  hiển thị — đúng nguyên tắc D-025(e)).
- **Giá trị thực:** "ai đã bỏ phiếu" chính là áp lực xã hội nhẹ khiến mọi người bấm xong trong
  1 phút thay vì để phiên treo cả tối.
- **Phạm vi:** BE · **S** (nếu DX-9.1 đã làm, cái này chỉ là mở rộng DTO + 1 component hàng
  thành viên).
- **Rủi ro:** polling 5 giây × N thành viên = N request/5s lên server thật — với nhóm 4–8 người
  vẫn không đáng kể; nếu sau này có backend thật nên nâng lên SSE. Ghi chú vào DECISIONS.

### DX-9.3: Cơ chế chốt — bỏ phiếu kín 3 quán, một phiếu phủ quyết, host chốt

- **Vấn đề:** cãi nhau 20 phút trong nhóm chat vì không có cơ chế quyết định; ai to tiếng hơn thì
  thắng. Cần quy tắc rõ ràng, áp dụng cho tất cả, không ai phải "ra đề".
- **Hiện trạng:** không có gì. Ứng viên lấy từ bộ sưu tập gắn với phiên (DX-9.1).
- **UX:**
  1. Giai đoạn **chọn ứng viên**: mỗi thành viên đề cử tối đa 3 quán từ bộ sưu tập (hoặc tìm thêm
     qua `GET /places?q=`). Server gộp và khử trùng, giữ tối đa 5 ứng viên; nhiều hơn thì lấy 5
     quán điểm cao nhất.
  2. Giai đoạn **bỏ phiếu kín**: mỗi thành viên chọn 1 quán + **tùy chọn bấm "Phủ quyết"** trên
     đúng 1 quán (lý do: ai cũng có quyền loại hẳn một quán mà không cần giải thích — quy tắc
     "một người phủ quyết" là cách nhanh nhất tránh đi ăn quán mà một người ghét). Phiếu của người
     khác **chỉ hiện "đã bỏ phiếu"**, không hiện chọn gì — bỏ phiếu kín tránh hiệu ứng bầy đàn.
  3. Khi **tất cả đã phiếu** hoặc host bấm **"Chốt ngay"** → server reveal: quán có nhiều phiếu
     nhất thắng; quán bị phủ quyết bị loại trước khi đếm; hoà → host chọn trong 30 giây
     (hoặc phiếu sớm hơn thắng). Kết quả chốt thành banner lớn + nút "Mở chỉ đường" (kế thừa
     DX-4.2 deep link Google Maps) và "Lưu vào bộ sưu tập" (kế thừa DX-4.x).
- **Mô hình dữ liệu:**

  ```ts
  interface SessionVote {
    memberId: string
    placeId: string
    isVeto: boolean // tối đa 1 phiếu phủ quyết / thành viên / phiên
    votedAt: string
  }
  // GET /sessions/:code trả votes[] CHỈ KHI status === "decided"
  // hoặc phiếu của chính mình; trước đó trả hasVoted (DX-9.2).
  ```

  | Method | Path                     | Response                                               |
  | ------ | ------------------------ | ------------------------------------------------------ |
  | POST   | `/sessions/:id/nominate` | `GroupSession` (body `{ placeId }`, tối đa 5 ứng viên) |
  | POST   | `/sessions/:id/vote`     | `{ hasVoted: true }` (body `{ placeId, isVeto }`)      |
  | POST   | `/sessions/:id/close`    | `GroupSession` (chỉ host, hoặc bất kỳ khi đã hết hạn)  |

  Logic đếm phiếu, loại phủ quyết, xử lý hoà nằm **toàn bộ ở server** (mock) — client chỉ render
  kết quả, đúng nguyên tắc "frontend chỉ gọi API" (D-011).

- **Cơ chế đồng bộ:** vote = mutation optimistic (người vote thấy phiếu của mình tức thì qua
  response). Reveal xảy ra phía server → tất cả client thấy cùng kết quả ở nhịp polling kế tiếp
  (tối đa 5 giây trễ). Chấp nhận được: khoảnh khắc "mở phiếu" trễ vài giây còn tạo kịch tính.
- **Giá trị thực:** biến "cãi nhau 20 phút" thành "60 giây bấm chọn". Đây là tính năng có khoảnh
  khắc chia sẻ được (mở phiếu) — thứ giữ chân tự nhiên, không cần gamification (ràng buộc TONG-HOP §5).
- **Phạm vi:** BE · **M**.
- **Rủi ro:** phủ quyết có thể bị lạm dụng (một người chặn hết). Giới hạn 1 phiếu phủ quyết/phiên/
  người đã đủ cho nhóm bạn; không thêm cơ chế "phủ quyết có lý do" — overengineering.

### DX-9.4: Host offline và phiên hết hạn — phiên không được chết theo host

- **Vấn đề:** nếu chỉ host chốt được mà host để điện thoại vào túi / mất mạng, cả nhóm đứng hình.
  Và phiên để quên mãi mãi là rác.
- **Hiện trạng:** không có gì (chưa có phiên). Pattern xử lý đã có sẵn: lazy job lúc GET
  (bằng chứng #7 — `syncPlaceSuggestions`).
- **UX:**
  1. **Hết hạn:** `expiresAt` (mặc định 2 giờ, tối đa 24 giờ). Server kiểm lúc mỗi GET:
     quá hạn → `status = "closed"`, tự reveal phiếu nếu đang voting (không để phiếu mất vô nghĩa).
     Client hiện banner "Phiên đã kết thúc" + nút "Lưu kết quả vào bộ sưu tập".
  2. **Host offline:** nếu `lastSeenAt` của host > 10 phút và phiên đang voting, **mọi thành viên**
     đều thấy nút "Chốt thay host" — đơn giản hơn host-migration (không cần thứ tự kế vị, không
     cần tranh chấp quyền). Host quay lại vẫn thấy kết quả.
  3. Thành viên chủ động "Rời phiên" bất cứ lúc nào; phiên còn ≥ 1 thành viên thì tiếp tục.
- **Mô hình dữ liệu:** không thêm gì — chỉ thêm logic server: kiểm `expiresAt` và `lastSeenAt`
  trong handler `GET /sessions/:code` (lazy, đúng pattern #7). Trường `hostId` giữ nguyên —
  "chốt thay host" là quyền có điều kiện, không phải chuyển quyền.
- **Cơ chế đồng bộ:** không thêm — mọi thứ chạy trên polling của DX-9.1 và logic lazy phía server.
- **Giá trị thực:** phiên nhóm mà chết theo host là phiên nhóm chết trong lần dùng đầu — đúng lúc
  cả nhóm đang đông người nhất.
- **Phạm vi:** BE · **S**.
- **Rủi ro:** "chốt thay host" khi host thật sự chỉ đi vệ sinh có thể chốt sai ý. Giảm nhẹ: nút
  chỉ hiện sau 10 phút im lặng + `AlertDialog` xác nhận (component đã có).

### DX-9.5: Hoạt động trong phiên — thông báo trong phiên, không spam ra ngoài

- **Vấn đề:** cần biết "Bảo vừa bỏ phiếu", "Hà vừa vào" — nhưng nếu mỗi sự kiện này thành một
  thông báo trong tab Thông báo toàn cục thì tab đó chết vì spam, và người không mở phiên nhận
  thông báo vô nghĩa.
- **Hiện trạng:** `AppNotification` là union toàn cục — [notification.ts](file:///home/longtran/Projects/frontend/src/features/notification/types/notification.ts). Đẩy sự kiện phiên vào đây là
  con đường ngắn nhất nhưng sai: thông báo toàn cục là thứ **tồn tại sau phiên**, sự kiện phiên là
  thứ **chỉ có nghĩa khi đang trong phiên**.
- **UX:** trong trang phiên có một dòng sự kiện gọn (tối đa 5 mục mới nhất, mới trên cùng):
  "Hà đã tham gia · 2 phút trước", "Bảo đã bỏ phiếu", "Phiên được chốt: Bún mắm bà Điền".
  Toàn bộ **suy ra từ chính state phiên** (`joinedAt`, `votedAt`, `status`) — không có bảng
  `SessionEvent` riêng, không có route riêng.
- **Mô hình dữ liệu:** **không có model mới.** Server trả `members[].joinedAt`, `votes[].votedAt`,
  `decidedAt` (thêm 1 trường vào `GroupSession`); client merge + sort + `formatRelativeTime`
  (từ `@/lib/format` — bắt buộc theo D-025, không tự format ngày).
- **Cơ chế đồng bộ:** dùng chung polling. Vì sự kiện suy từ state, không có sự kiện nào bị "lỡ"
  khi polling trễ — đây là lợi ích chính của việc không làm event stream riêng.
- **Giá trị thực:** cảm giác "có người đang cùng bấm" mà không cần realtime, và giữ tab Thông báo
  sạch cho những thứ thật sự cần nhìn lại (bằng chứng: TONG-HOP §4 đã cảnh báo spam thông báo là
  cách nhanh nhất giết giữ chân).
- **Phạm vi:** FE · **S** (thuần render từ DTO đã có).
- **Rủi ro:** gần như không có. Rủi ro duy nhất là làm màu mè kiểu feed — giữ nó là một dòng text
  nhỏ, không phải timeline nhiều màu.

## Cách thử với mock hiện tại

1. **Luồng đầy đủ trên 1 máy (khuyên dùng, không sửa gì ngoài thêm route):** thành viên khác là
   **bot phía "server"** — mock thêm 2–3 `SessionMember` giả với `joinedAt` lệch nhau và bỏ phiếu
   sau khoảng thời gian ngẫu nhiên khi bị GET (cùng pattern lazy job #7). Host thật là `ME`.
   Demo được: vào phiên → thấy người khác vào dần → bỏ phiếu → ai chưa vote → chốt → reveal.
   Hạn chế phải ghi rõ trong UI demo: "thành viên khác là mô phỏng".
2. **2 tab cùng máy (bước tiếp, phải sửa `src/mocks/`):** persist `db` vào `localStorage` và sync
   qua `BroadcastChannel` trong adapter. Khi đó mở 2 tab, 1 tab tạo phiên 1 tab join bằng link —
   demo được đa "người" thật (mỗi tab 1 `memberId` trong `sessionStorage`). Đây là thay đổi mock
   có chủ đích, cần ghi DECISIONS riêng vì ảnh hưởng mọi route chứ không chỉ phiên.
3. **Không thể thử với mock hiện tại:** 2 thiết bị thật. Adapter nằm trong bộ nhớ tab (bằng chứng
   #1) — không có cách nào quanh nó ngoài backend thật. Đây phải là điều kiện chặn trước khi hứa
   tính năng này cho người dùng cuối.

## Không đề xuất và lý do

| Ý tưởng bị loại                                      | Lý do                                                                                                                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WebSocket / SSE cho phiên**                        | Chưa có backend thật; mock adapter không chạy được WebSocket. Polling 5 giây đủ cho use case "chốt quán trong vài phút". Ghi backlog cho giai đoạn có backend.              |
| **Chat trong phiên**                                 | Nhóm chat đã có Zalo/Messenger — app này không thắng cuộc đua chat, chỉ cần chỗ chốt quyết định. Thêm chat là feature creep và cần đồng bộ tin nhắn realtime.               |
| **Đẩy sự kiện phiên vào tab Thông báo toàn cục**     | Spam — ngược trực tiếp với ràng buộc TONG-HOP §4/§5. Sự kiện phiên chỉ có nghĩa khi đang trong phiên (DX-9.5 xử lý đúng chỗ).                                               |
| **Hệ thống quyền trong phiên (admin/phó nhóm/kick)** | Nhóm bạn 4–8 người không cần phân quyền; "host chốt + ai cũng chốt được khi host offline" (DX-9.4) phủ đủ. Phân quyền là overengineering cho nhu cầu chưa có.               |
| **QR code mời**                                      | Cần thư viện sinh QR (dependency mới — phải ghi DECISIONS + khảo sát) trong khi link + mã 6 ký tự đã đủ: nhóm bạn gửi link qua Zalo là con đường thật.                      |
| **Nhiều phiên song song + danh sách phiên của tôi**  | Chưa có bằng chứng nhu cầu; một phiên đang mở là đủ cho vòng đầu. Danh sách phiên là bảng mới + route mới + empty state — làm khi có người dùng thật phàn nàn phiên bị mất. |
| **Đồng bộ vị trí GPS của cả nhóm trên bản đồ phiên** | Dữ liệu nhạy cảm (vị trí realtime), cần backend thật + quyền vị trí liên tục; và không cần thiết để chốt quán. Ghi backlog nếu sau này có backend.                          |
| **Bỏ phiếu công khai (không kín)**                   | Hiệu ứng bầy đàn: người đầu bấm kéo theo phần còn lại, mất đúng giá trị của việc bỏ phiếu. Bỏ phiếu kín là mặc định, không phải tùy chọn.                                   |

---

**Chưa xác minh:** toàn bộ đề xuất dựa trên đọc code, chưa chạy app; chưa đo chi phí polling 5 giây
thật trên thiết bị; chưa kiểm `refetchInterval` hoạt động đúng với axios adapter có delay 320 ms
(kỳ vọng: có, vì interval độc lập với từng request); chưa có backend thật để kiểm hợp đồng API.
