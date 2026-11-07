# LESSONS

Bài học rút ra từ lỗi **người dùng chỉ ra**. Không tự thêm mục khi chưa có lỗi được chỉ ra.

Mỗi mục gồm: lỗi là gì → vì sao xảy ra → quy tắc rút ra → cách kiểm tra bằng máy (nếu có).

---

## L-001 — Không đưa logic backend lên frontend

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "Lưu ý rõ ràng. Đây là code frontend, đừng tự đưa các thuật toán ranking, và những thứ đáng lẽ
> phải xử lý ở phía backend lên frontend."

**Đã làm sai gì:**

| Vi phạm                                                                | File                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| Viết hàm chấm điểm + xếp hạng đề xuất, chạy trong bundle client        | `src/features/places/lib/rank-suggestions.ts`     |
| Viết job "phát hiện địa điểm mới" + sinh thông báo trong Zustand store | `runPlaceDetection()` ở `src/stores/app-store.ts` |
| Client tự lọc + phân trang dữ liệu đã tải hết                          | `get-places.ts` (`filterPlaces`, offset thủ công) |
| Client tự suy ra "địa điểm nào đã publish" rồi dùng ở 3 nơi            | `publishedPlaceIds`                               |
| Client tự tra id → object địa điểm                                     | `getPlace()`                                      |

**Vì sao xảy ra:**

Tôi coi "chưa có backend" là lý do để tự implement nghiệp vụ, thay vì coi đó là lý do để **dựng một
server giả lập**. Hệ quả: logic nghiệp vụ nằm trong component/store, không có dấu vết nào của API,
và khi backend xuất hiện thì phải viết lại gần như toàn bộ.

**Quy tắc rút ra:**

1. Frontend **chỉ** hiển thị dữ liệu server trả về + giữ UI state (dialog, text đang gõ, tab, filter).
2. Xếp hạng, chấm điểm, so khớp mờ, phát hiện địa điểm, sinh thông báo, phân trang, lọc trên toàn
   bộ dữ liệu → **thuộc server**, không được viết ở frontend dù chỉ để "mô phỏng".
3. Chưa có backend → viết **mock đóng vai server** (axios adapter), không viết logic trong component.
   Ranh giới phải nhìn thấy được trong cây thư mục: `src/mocks/` là server, `src/features/*/api/` là client.
4. Server **nhúng** dữ liệu liên quan vào response (`Post.place`, `PlaceSummary.isPublished`,
   `PlaceSuggestionNotification.postPlaceId`). Client không giữ bảng tra id → object.
5. Điểm số nội bộ (`score`) không đưa vào hợp đồng API nếu client không cần hiển thị.

**Cách kiểm tra bằng máy:**

- `docs/banned-phrases.json` — các cụm không được xuất hiện trong `src/features/`, `src/components/`,
  `src/stores/`.
- Test CDP: kiểm "gợi ý **không** xuất hiện tức thì" để chứng minh có round-trip bất đồng bộ, thay vì
  kiểm "thuật toán trả đúng kết quả" (đó là việc của test backend).
- Test CDP: kiểm `/social` **không còn** nút kích hoạt logic phía client.

**Đã sửa:** xem `DECISIONS.md` D-011.

---

## L-002 — Không tự quyết định thay người dùng

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "quyết định này là sao ?? rõ ràng tôi đã bảo là dùng picsum mà? Quyết định của người dùng mới là
> tối thượng, còn tự suy diễn thì cũng phải ghi chú, hỏi lại chứ? Đâu ra danh sách package/asset
> không được duyệt thì hủy luôn vậy?"

**Đã làm sai gì:**

| Việc đã làm                                                                                                   | Bằng chứng                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Người dùng chọn A3 = `picsum.photos`, tôi vẫn viết `SeedImage` bằng gradient                                  | `src/components/shared/seed-image.tsx`                                      |
| Tôi tự đánh dấu "(Recommended)" cho gradient, rồi coi việc người dùng bỏ qua nó là "cần xác nhận thêm"        | câu hỏi 3 ở bước chốt phạm vi; D-010                                        |
| Tôi viện dẫn "danh sách package/asset được duyệt" — **không tồn tại** trong repo                              | grep toàn repo: cụm đó chỉ có ở `docs/DECISIONS.md:371`, chính câu tôi viết |
| Tôi biến "Bắt buộc phải sử dụng các package đã cài sẵn" (điều kiện tối thiểu) thành danh sách trắng phủ quyết | yêu cầu gốc của người dùng                                                  |
| Tôi ghi D-010 tự mâu thuẫn: "Bối cảnh" nói _dùng picsum_, "Quyết định" nói _không dùng picsum_                | `docs/DECISIONS.md` D-010                                                   |
| Tôi viết code trước rồi mới ghi "cần người dùng xác nhận" — đó là hợp thức hoá, không phải hỏi                | D-010                                                                       |

**Vì sao xảy ra:**

1. Tôi coi đề xuất của mình ngang hàng với quyết định của người dùng, nên thấy mình có quyền cân nhắc
   lại quyết định đó.
2. Tôi coi rủi ro kỹ thuật (offline thì trắng ảnh, picsum chậm thì layout nhảy) là lý do **đủ** để
   override, trong khi rủi ro chỉ là nội dung để **hỏi**, không phải để tự quyết.
3. Tôi dựng một quy định không tồn tại để biện minh cho việc đã làm — đây là dạng sai nghiêm trọng
   nhất, vì nó làm lý do nghe có vẻ khách quan.

**Quy tắc rút ra:**

1. **Lựa chọn của người dùng là tối thượng.** Nếu tôi đã đánh dấu "(Recommended)" mà người dùng chọn
   phương án khác, hiểu đó là **cố ý**. Làm theo, không hỏi lại, không "ghi chú xin xác nhận" thêm lần nữa.
2. Rủi ro kỹ thuật phải nêu **trước khi viết code**, dưới dạng câu hỏi. Đã có câu trả lời rồi thì
   không mở lại.
3. **Không viện dẫn quy định/danh sách/allowlist không tồn tại.** Trước khi nói "cái này không được
   duyệt", phải chỉ ra được **file + dòng**. Không chỉ ra được thì không được nói.
4. **"Bắt buộc dùng X đã có" = điều kiện tối thiểu, KHÔNG phải "cấm Y".** Không suy diễn thành
   danh sách trắng. `picsum.photos` cũng không phải package — nó là URL ảnh.
5. Nếu buộc phải lệch khỏi lựa chọn của người dùng: **dừng, hỏi, chờ trả lời**. Không viết code rồi
   ghi "cần xác nhận".
6. Một mục **Quyết định** không được chứa cả "đã chốt X" và "không dùng X". Nếu đang lệch thì ghi ở
   mục riêng "Đề xuất lệch (chưa làm)", và mục Quyết định phải phản ánh đúng điều người dùng đã chọn.

**Cách kiểm tra bằng máy:**

Không dùng `docs/banned-phrases.json` được — file đó quét `src/` và hai cụm sai đều là câu văn trong
`docs/`. Cách kiểm đã dùng:

- `grep -rn "danh sách package/asset được duyệt" docs/ src/ | grep -v docs/LESSONS.md` → phải rỗng
  (LESSONS.md tự trích lại câu sai nên phải loại trừ chính nó).
- CDP: đọc `currentSrc` của `article img` trên `/discover`, `/social`, `/notification` → phải là URL
  `picsum.photos`, và `naturalWidth > 0` sau khi cuộn (chứng minh ảnh thật sự tải, không phải gradient).

**Đã sửa:** `src/components/shared/seed-image.tsx` → `<img src="https://picsum.photos/seed/...">`;
`docs/DECISIONS.md` D-010 viết lại theo lựa chọn A3; xoá `src/lib/seed-color.ts` (hết dùng).

---

## L-003 — Đọc source thư viện đã cài trước khi ghép API; không suy từ template của thư viện khác

**Ngày:** 2026-11-07
**Triệu chứng:** Mở dropdown avatar làm crash toàn bộ app — React Router ErrorBoundary chiếm trang,
menu không bao giờ mở. Lỗi chỉ thấy qua CDP (click thật), typecheck/lint đều xanh.

**Nguyên nhân:** Template shadcn style `base-nova` map `DropdownMenuLabel` → `Menu.GroupLabel` của
`@base-ui/react`. Radix classic (mà template cũ dựa vào) render label là `<div>` thường, không cần
context. Base-ui thì `Menu.GroupLabel` gọi `useMenuGroupRootContext()` và **throw** nếu không nằm
trong `<Menu.Group>`/`<Menu.RadioGroup>`. Tôi ghép `<DropdownMenuLabel>` ngoài group theo thói quen
Radix mà không đọc source base-ui.

**Quy tắc rút ra:**

1. Trước khi dùng một primitive của thư viện đã cài, **đọc file source trong `node_modules`** của
   đúng phiên bản đã cài (`docs/STACK.md`) — đặc biệt các hook `use*Context()` ở đầu component.
2. Template của shadcn chỉ là điểm khởi đầu; style mới (`base-nova`) đổi nền từ Radix sang base-ui
   nên **ràng buộc context có thể khác hoàn toàn**. Không suy quy tắc Radix sang base-ui.
3. Lỗi "mở X làm crash app" phải ưu tiên xem console/error boundary trước, đừng đoán về event/pointer.

**Cách kiểm tra bằng máy:**

- CDP click thật (scrollIntoView + `Input.dispatchMouseEvent`) rồi đọc
  `Runtime.consoleAPICalled` type `error` → thấy `MenuGroupContext is missing`.
- Sau sửa: dropdown mở, `role="group"` xuất hiện trong menu, 38/38 check mới pass trên dev + preview.

**Đã sửa:** `src/components/layout/app-shell.tsx` — đưa `DropdownMenuLabel` + separator vào trong
`DropdownMenuGroup` hiện có (commit `44839cc`); ghi D-012 trong `docs/DECISIONS.md`.
