# Báo cáo Sửa chữa Kỹ thuật Frontend (Frontend Engineering Recovery)

**Thời điểm thực hiện:** `2026-11-03`  
**Vai trò:** Senior Frontend Engineer & Quality Auditor  
**Chế độ thực thi:** Subtractive Refactoring & Quality Remediation (Không redesign, không thay đổi hành vi sản phẩm)  
**Tập tin mục tiêu:** `docs/audits/FRONTEND_REPAIR.md`  

---

## 1. Tóm tắt Đợt Cải tiến Frontend

Đợt cải tiến này tập trung giải quyết toàn diện các vấn đề nợ kỹ thuật, mã chết, trùng lặp implementation và chuẩn hóa văn phong giao diện (UX Copy) trên toàn bộ lớp frontend của Rendez theo các nguyên tắc:
1. **Reuse Existing UI First:** Không tạo thêm page hoặc component mới; tái sử dụng các component và API hooks hiện có (`src/features/*`, `src/lib/api/*`).
2. **Subtractive Refactoring First:** Loại bỏ dead code, unexport các hàm nội bộ không có consumer, triệt tiêu component trùng lặp (`PlaceCard` trong `shared.tsx`, `PlaceRow` trong `PlaceCard.tsx`).
3. **Voice & Copy Compliance:** Xử lý triệt để 11 lỗi vi phạm thuật ngữ cấm và marketing tagline cũ, đưa `node scripts/check-copy.mjs` về **0 lỗi**.
4. **Bảo toàn 100% Quality Gates:** Toàn bộ test unit, component tests, typecheck, linting, formatting và production build đều vượt qua (`10/10 PASS`).

---

## 2. Danh mục Pages & Components Giữ lại (Preserved Components)

Toàn bộ 13 màn hình người dùng cốt lõi được bảo toàn cấu trúc và hành vi nghiệp vụ:
- `DiscoverPage` (`/discover`): Feed gợi ý cá nhân hóa, bộ lọc danh mục và thuộc tính không gian.
- `SearchPage` (`/search`): Tìm kiếm địa điểm, gợi ý từ khóa, lọc danh mục và thuộc tính.
- `MapPage` (`/map`): Bản đồ số MapLibre GL v5 nạp lười (`React.lazy`), định vị GPS, đồng bộ bounding box và tra cứu marker.
- `ExperiencesPage` & `PostDetailPage` (`/posts`, `/posts/:id`): Bảng tin trải nghiệm cộng đồng, trình xem ảnh và tương tác (Like, Comment, Save, Share).
- `PlaceDetailPage` (`/places/:id`): Thông tin chi tiết quán cà phê, bản đồ thu nhỏ, giờ mở cửa và thư viện ảnh.
- `PhotoDetailPage` (`/photos/:id`): Xem chi tiết ảnh đóng góp, bình luận và ảnh tương tự.
- `CreateExperiencePage` (`/create`): Luồng tải ảnh, gắn thẻ thuộc tính và chọn địa điểm.
- `SavedPage` (`/saved`): Quản lý địa điểm và bài viết đã lưu theo 2 tab rõ ràng.
- `ActivityPage` (`/activity`): Dòng thời gian hoạt động tương tác gần đây.
- `ProfilePage` & `SettingsPage` (`/profile`, `/settings`): Thông tin tài khoản, cài đặt phiên và đổi mật khẩu.
- `TermsPage` (`/terms`): Điều khoản sử dụng và chính sách nội dung.
- `Auth` (`/login`, `/register`): Màn hình đăng nhập / tạo tài khoản tinh gọn một cột theo `docs/VOICE.md`.

---

## 3. Danh mục Components & Code Bị Xóa hoặc Hợp Nhất (Eliminated & Consolidated)

### 3.1. Components & Exports đã Xóa (Deleted)
1. **`frontend/src/app/shared.tsx`:**
   - Xóa bỏ component `PlaceCard` (L273-L300) cũ — hợp nhất 100% sang `src/features/places/PlaceCard.tsx`.
   - Đổi `AttributeIcon` từ export công khai sang private scope.
2. **`frontend/src/features/places/PlaceCard.tsx`:**
   - Xóa bỏ variant `PlaceRow` không sử dụng.
3. **`frontend/src/components/ui/safe-image.tsx`:**
   - Xóa bỏ helper `ratioOf` không sử dụng.
4. **`frontend/src/lib/api/queries.ts`:**
   - Xóa query hook `usePosts` (đã thay thế hoàn toàn bằng `useInfiniteQuery` trong `ExperiencesPage`).
   - Xóa helper `isNotFound`.
   - Xóa query hook `useMapPlaces` (màn hình Map đã dùng query riêng đồng bộ theo viewport bounds).
5. **`frontend/src/lib/format.ts`:**
   - Chuyển `formatDate` thành private helper trong file.
   - Xóa bỏ các helper không có consumer: `formatCount`, `countLabel`.

### 3.2. Components & Hooks được Hợp nhất & Tái sử dụng (Reused & Consolidated)
1. **Google Maps Directions:** Tái sử dụng trực tiếp `directionsUrl` trong `src/lib/format.ts` cho `googleMapsDirectionsUrl` tại `src/app/shared.tsx`, loại bỏ mã nguồn sinh URL trùng lặp.
2. **Creator Screen (`src/app/creator.tsx`):**
   - Hợp nhất việc nạp dữ liệu hồ sơ và danh sách ảnh đóng góp về 2 hooks chính quy trong `src/lib/api/queries.ts` (`useCreator` và `useCreatorPhotos`), thay vì tự viết `useQuery` và gọi `api(...)` thủ công.
3. **Navigation Data Scope (`src/app/layouts/nav.tsx`):**
   - Chuyển `PRIMARY_NAV` và `SECONDARY_NAV` thành module-private scope, bảo vệ cấu trúc định tuyến nội bộ của shell.
4. **States Scope (`src/components/ui/states.tsx`):**
   - Chuyển `LoadingState` và `ErrorState` thành private functions trong file, khuyến khích các consumer sử dụng component tích hợp `AsyncState`.

---

## 4. Chuẩn hóa Văn phong & UI Copy (Voice & Copy Audit Fixes)

Đã khắc phục triệt để **11 lỗi** vi phạm thuật ngữ theo `docs/VOICE.md` và `docs/banned-phrases.json`:
1. **Màn hình Đăng nhập / Tạo tài khoản (`src/app/auth.tsx`):**
   - Loại bỏ panel quảng cáo bên trái (`auth-page__story`, `auth-page__pitch`) chứa các câu tagline cũ vi phạm LESSONS L-001/L-002: "Khám phá thành phố qua...", "nơi bạn muốn ghé...", "sổ tay thành phố...".
   - Chuyển layout sang dạng form đơn cột căn giữa (`auth-page__panel`) đúng chuẩn màn hình công cụ.
   - Sửa `meta[name="description"]`: đổi cụm cấm "chia sẻ trải nghiệm" thành "đăng ảnh".
   - Đổi "Một tài khoản để lưu địa điểm và đăng trải nghiệm của bạn" thành câu chức năng rõ ràng.
   - Đổi "Đăng nhập trải nghiệm nhanh" thành "Đăng nhập nhanh".
2. **Màn hình Đóng góp (`src/features/contribute/CreateExperiencePage.tsx`):**
   - Đổi "Cần đăng nhập để đăng trải nghiệm" -> "Cần đăng nhập để đăng ảnh".
   - Xóa thẻ eyebrow trang trí `<p className="eyebrow">Đóng góp</p>`.
3. **Màn hình Cá nhân (`src/features/profile/ProfilePage.tsx`):**
   - Đổi "Đăng trải nghiệm đầu tiên" -> "Đăng ảnh đầu tiên".
4. **Màn hình Đóng góp kế thừa (`src/app/contributions.tsx`):**
   - Xóa thẻ eyebrow trang trí `<span className="eyebrow">Ảnh cộng đồng</span>`.

**Kết quả kiểm tra từ ngữ:** `node scripts/check-copy.mjs` trả về **0 lỗi** (chỉ còn 3 cảnh báo hợp lệ cho danh mục dữ liệu thật).

---

## 5. Kết quả Kiểm thử & Quality Gates Toàn diện

Đã thực thi toàn bộ kịch bản kiểm tra chất lượng `./scripts/check.sh all`:

```text
backend-lint            PASS
backend-format          PASS
backend-import-linter   PASS
migrations              PASS
backend-tests           PASS (223/223 tests passed)
django-check            PASS
frontend-lint           PASS (0 ESLint errors)
frontend-format         PASS (100% Prettier verified)
frontend-tests          PASS (61/61 Vitest tests passed)
frontend-build          PASS (1809 modules transformed, tsc -b sạch)
```

Kiểm tra từ ngữ giao diện:
```text
node scripts/check-copy.mjs -> check-copy: 42 file, 0 lỗi, 3 cảnh báo (PASS)
```

---

## 6. Những vấn đề tồn tại & Đề xuất tiếp theo

1. **Thống nhất Backend Model SavedPlace (Batch 3):** Frontend hiện đã sẵn sàng tích hợp đồng nhất với endpoint `/api/v1/places/<id>/saved/` khi backend hoàn tất deprecate bảng `Favorite`.
2. **Insights Dynamic Aggregation (Batch 4):** Trang `InsightsPage.tsx` hiện hiển thị các chỉ số tính toán từ session; khi backend bổ sung endpoint tổng hợp time-series thực tế, biểu đồ SVG sẽ được liên kết trực tiếp với dữ liệu lịch sử view/like.
