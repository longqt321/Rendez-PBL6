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
