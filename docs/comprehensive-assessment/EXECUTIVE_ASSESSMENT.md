# Executive Assessment

Date: 2026-10-31. HEAD: 3003eae. Scope: full repo + Internet research.

## Rendez hiện đang là gì?
Một ứng dụng web visual-first place discovery, triển khai đầy đủ: Django 5.2 modular monolith (places, photos, accounts, favorites) + React 19 SPA + PostgreSQL 17 (unaccent, pg_trgm, btree_gist) + MapLibre. Có feed masonry, search accent-insensitive, map bbox, favorite, photo submission idempotent, moderation admin, media bảo vệ. 14 places / 39 photos / 6 categories trong dev DB (Đà Nẵng).

## Rendez nên trở thành gì?
Nền tảng khám phá địa điểm dựa trên ảnh thực tế do cộng đồng đóng góp, bắt đầu từ một thành phố (Đà Nẵng) với taxonomy đa loại hình, mở rộng địa lý khi có dữ liệu. Giá trị khác biệt: **ảnh thực địa chân thực gắn với địa điểm**, không phải ảnh quảng cáo hay review văn bản.

## Sản phẩm có vấn đề gì?
1. **Cold-start content**: chỉ 14 places. Giá trị discovery phụ thuộc mật độ ảnh; đây là rủi ro lớn nhất, không phải kỹ thuật.
2. **UI copy hardcode Đà Nẵng/cà phê** ở ~20 chỗ frontend (cosmetic nhưng cản trở mở rộng).
3. **Định vị sản phẩm chưa sắc**: chưa trả lời "tại sao dùng Rendez thay vì Google Maps/TikTok".
4. **Không có vòng đóng góp người dùng thực**: chưa có bằng chứng ai sẽ đóng góp ảnh.

## Giá trị khác biệt nằm ở đâu?
- **Visual Truth**: ảnh chuẩn hóa (EXIF strip, derivative), attribution rõ, moderation workflow — nền tảng dữ liệu sạch khó sao chép.
- **Attribute-based discovery** (cây xanh, ổ cắm, view biển) qua PhotoAttribute — Google Maps không có.
- Bản đồ + feed đồng bộ URL state.

## Điểm tốt cần giữ
- Kiến trúc modular monolith, constraints/indexes chặt.
- Image pipeline an toàn (magic bytes, EXIF strip, decompression bomb guard).
- Test coverage (182 backend, 56 frontend, 22/23 E2E).
- Không AI — đúng ràng buộc hiện tại.

## Điểm cần thay đổi
- Generalize UI copy (P2).
- Bổ sung content seeding chiến lược (P1) — quan trọng hơn mọi cải tiến kỹ thuật.
- Generalize geocoding fallback (P3).

## Đánh giá tổng thể
**PASS WITH CONDITIONS** — kỹ thuật vững, sản phẩm chưa được kiểm chứng với người dùng thật.

## Strategic recommendation
**Option B — Strategic Refinement** (giữ kiến trúc, tập trung content acquisition + UX validation + copy generalization). Không cần rearchitecture. Không thêm tính năng mới trước khi có bằng chứng người dùng thật.
