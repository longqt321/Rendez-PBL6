# PROMPTS: bộ prompt sửa lỗi và chống lặp lại

## Cài đặt (làm một lần)

1. Chép toàn bộ nội dung thư mục này vào gốc repo Rendez (giữ nguyên cấu trúc, kể cả thư mục ẩn `.claude/`).
2. Thêm vào `package.json`: `"lint:copy": "node scripts/check-copy.mjs"`.
3. Commit tất cả lên git để mọi phiên và mọi máy đều thấy.
4. Tùy chọn nhưng nên làm: chạy `npm run lint:copy` trong CI và trong pre-commit (husky hoặc lefthook) để chặn cả khi không dùng agent.
5. Mở phiên mới, chạy prompt P0 để xác nhận agent đã nạp quy tắc.

## Vì sao agent ở phiên khác vẫn tuân theo

| Tầng | File | Cơ chế |
|---|---|---|
| Tự nạp | `CLAUDE.md` (import VOICE, UX_RULES, LESSONS) và `AGENTS.md` | Agent đọc ở đầu mỗi phiên, không cần bạn nhắc |
| Tự kích hoạt | `.claude/skills/ui-copy-and-layout` | Skill kích hoạt khi tác vụ chạm tới UI, chữ, layout |
| Chặn bằng máy | `.claude/settings.json` + `scripts/check-copy.mjs` | Hook chạy sau mỗi lần ghi file, báo lỗi ngược lại cho agent; CI chặn ở bước commit |
| Ghi nhớ lỗi | `docs/LESSONS.md` + `docs/banned-phrases.json` | Mỗi lần bạn sửa, agent ghi thành luật vĩnh viễn |

Quy tắc viết bằng chữ thì agent có thể quên khi ngữ cảnh dài. Phần máy kiểm là lớp không quên, nên đừng bỏ nó.

---

## P0. Kích hoạt và xác nhận (đầu mỗi phiên nghi ngờ, hoặc ngay sau khi cài)

```
Đọc CLAUDE.md, docs/VOICE.md, docs/UX_RULES.md, docs/LESSONS.md.
Chưa sửa gì cả. Làm các việc sau:
1. Tóm tắt trong tối đa 10 dòng những luật cứng bạn sẽ tuân theo khi sửa UI.
2. Chạy `node scripts/check-copy.mjs` và cho tôi số lỗi, số cảnh báo hiện có, nhóm theo id luật.
3. Cho biết hook trong .claude/settings.json có đang hoạt động không (thử ghi một file tạm chứa cụm cấm rồi xóa đi).
Đừng đề xuất thiết kế mới. Chỉ báo cáo.
```

## P1. Nhóm A: lỗi chức năng và hiển thị

```
Làm các mục A1, A2, A3, A4 trong docs/BACKLOG.md.
Trước khi sửa: đọc VOICE.md, UX_RULES.md, LESSONS.md và các mục A1–A4.

Với từng mục:
- Tìm nguyên nhân gốc trong code, nêu rõ file và dòng, rồi mới sửa.
- Chỉ sửa đúng phạm vi mục đó.
- A1 phải có test: tìm "cà phê" + lọc "Cà phê" không ra ít kết quả hơn lọc "Cà phê" một mình; so khớp không phân biệt dấu và hoa thường.
- A2 phải kiểm ở 1280×720 và 390×844.

Không được: đổi thiết kế ngoài phạm vi, thêm tính năng, viết thêm copy mới ngoài chuỗi bắt buộc của empty state (lấy theo VOICE.md mục 4).
Xong khi: tick mục trong BACKLOG kèm cách đã kiểm; `node scripts/check-copy.mjs --changed` sạch lỗi.
Báo cáo theo mẫu ở CLAUDE.md.
```

```
Làm tiếp các mục A5, A6, A7, A8, A9 trong docs/BACKLOG.md.
Lưu ý A9: trước tiên xác định đây là lỗi của test e2e (gõ nối vào giá trị cũ) hay lỗi thật của app. Ghi kết luận vào BACKLOG, rồi mới sửa đúng nơi.
A8: ẩn input file gốc, cả dropzone bấm được, một nút "Chọn ảnh", không còn chữ tiếng Anh.
Các ràng buộc "Không được" và "Xong khi" giống prompt trước.
```

## P2. Nhóm B: dữ liệu test lọt ra UI

```
Làm các mục B1 và B2 trong docs/BACKLOG.md.

B1:
- Tìm mọi nơi sinh và hiển thị chuỗi fixture: "Quán E2E DEMO", "Địa chỉ giả để test", "— DEMO", "Fixture phát triển".
- Tách dữ liệu demo bằng cờ (ví dụ is_fixture) hoặc môi trường riêng; query dành cho người dùng thật phải loại chúng.
- Nếu cần dữ liệu demo để quay video e2e, tạo bộ dữ liệu giống thật: tên quán, địa chỉ, giờ mở cửa có thật ở Đà Nẵng. Hỏi tôi trước nếu không chắc dữ liệu thật nào được dùng.

B2:
- Địa điểm chưa có ảnh dùng placeholder trung tính có icon, không phải mảng màu phẳng cỡ cả thẻ.
- Thẻ chưa có ảnh xếp sau thẻ có ảnh.
- Áp dụng ở feed, tìm kiếm, bản đồ (panel chi tiết) và đã lưu.

Không được: tự bịa tên quán hoặc địa chỉ không có thật cho dữ liệu hiển thị.
Xong khi: không còn chuỗi fixture trong UI; check-copy sạch lỗi; BACKLOG được tick.
```

## P3. Nhóm C: câu chữ (dùng lệnh sẵn có)

```
/audit-copy
```

Nếu muốn giao cụ thể hơn:

```
Làm nhóm C (C1–C6) trong docs/BACKLOG.md bằng quy trình của lệnh /audit-copy.

Yêu cầu bổ sung:
- Trích xuất TOÀN BỘ chuỗi hiển thị trước, rồi mới sửa. Đưa tôi bảng giữ/xóa/viết lại.
- Mọi chuỗi marketing hoặc mô tả không mang thông tin mới: XÓA. Đừng viết lại cho hay hơn.
- Chỉ viết lại chuỗi chức năng bị sai thuật ngữ hoặc sai loại, dùng bảng trước/sau trong VOICE.md mục 4.
- Chưa chắc chuỗi nào có nên giữ không: liệt kê ở cuối báo cáo để tôi quyết, đừng tự đoán.

Không được: đổi layout, đổi logic, thêm chuỗi mới ngoài những chuỗi chức năng bắt buộc.
Xong khi: check-copy không còn lỗi; BACKLOG nhóm C được tick.
```

## P4. D1 và D2: auth và Khám phá

```
Làm D1 và D2 trong docs/BACKLOG.md.

D1 (đăng nhập, đăng ký):
- Bỏ panel khẩu hiệu bên trái. Nếu giữ panel, chỉ đặt ảnh địa điểm thật kèm tên, không có chữ khẩu hiệu.
- Thêm "Quên mật khẩu?" ở đăng nhập (nếu chưa có luồng thật, hỏi tôi trước khi tạo luồng).
- Đăng ký hiện quy tắc mật khẩu giống trang đổi mật khẩu.
- Hai liên kết phụ cùng kiểu và cùng căn lề.

D2 (Khám phá):
- Bỏ hero. Header trang không quá 15% chiều cao viewport. Danh sách địa điểm phải hiện trong màn hình đầu ở 1280×720.
- Sáu thẻ danh mục xếp không để lại hàng lẻ.
- Thẻ lớn "đáng một chuyến đi" không còn là mảng màu phẳng.

Không được: thêm mục điều hướng mới, đổi màu thương hiệu, đổi font.
Xong khi: ảnh chụp trước/sau ở 1280×720 và 390×844, sáng và tối; check-copy sạch lỗi; BACKLOG được tick.
```

## P5. D3, D4, D5: tìm kiếm, bản đồ, đăng ảnh

```
Làm D3, D4, D5 trong docs/BACKLOG.md.

D3:
- Mỗi màn hình có một ô tìm kiếm. Trang tìm kiếm dùng chính ô ở thanh trên cùng.
- Hợp nhất hai hệ bộ lọc "Loại địa điểm" và "Nhìn thấy trong ảnh" thành một. Trước khi sửa, đưa tôi bảng đối chiếu hai hệ và đề xuất hợp nhất để tôi duyệt.
- Tên bộ lọc là thuộc tính cụ thể (VOICE.md luật 6). Ghi rõ logic "Khớp tất cả" hay "Khớp một trong" tại bộ lọc.

D4 (bản đồ):
- Hàng chip không bị cắt cụt (wrap hoặc có dấu hiệu cuộn).
- Nút "Lưu địa điểm" không ngắt thành hai dòng.
- "Xem ảnh ↗" rõ nghĩa hoặc đổi nhãn; hỏi tôi nếu không rõ nó điều hướng đi đâu.
- Panel chi tiết không có khối màu phẳng khi chưa có ảnh.

D5 (đăng ảnh):
- "Đã chọn: ..." chỉ hiện ở một nơi.

Xong khi: kiểm 1280×720 và 390×844, sáng và tối; check-copy sạch lỗi; BACKLOG được tick.
```

## P6. D6 và D7: cài đặt và điều hướng

```
Làm D6 và D7 trong docs/BACKLOG.md.

D6: bỏ trùng tên section và nhãn ô ("Tên hiển thị" hai lần); thông báo thành công dạng toast hoặc chừa sẵn chỗ để layout không nhảy.
D7: bỏ trùng giữa sidebar và menu avatar. Mỗi đích đến một nơi chính. Chọn một nơi chính cho chuyển giao diện sáng/tối.

Trước khi sửa D7, đưa tôi sơ đồ điều hướng hiện tại và đề xuất sau khi gọn, để tôi duyệt.
Không được: xóa chức năng nào. Chỉ bỏ lối vào trùng lặp.
```

## P7. D8 và D9: truy cập và phần chưa kiểm

```
Làm D8 và D9 trong docs/BACKLOG.md.

D8: đo tương phản bằng công cụ (không ước lượng) cho chữ phụ, placeholder, nhãn nhỏ ở sáng và tối. Sửa mọi chỗ dưới 4.5:1 (chữ thường) hoặc 3:1 (chữ lớn). Chữ phụ không dưới 12px.
D9: chụp và kiểm dark mode, viewport 390×844, trạng thái đang tải, lỗi mạng cho từng màn hình. Lỗi tìm thấy thì thêm mục mới vào nhóm A của BACKLOG, đừng sửa lén trong cùng lượt.

Báo cáo: bảng màn hình × (sáng, tối, 390px, đang tải, lỗi mạng) với trạng thái đạt/không đạt.
```

## P8. Màn hình hoặc tính năng MỚI (dùng mỗi lần giao việc UI mới)

```
Tác vụ: <mô tả ngắn màn hình hoặc tính năng>.

Trước khi viết code:
1. Đọc CLAUDE.md, VOICE.md, UX_RULES.md, LESSONS.md.
2. Cho tôi: loại màn hình (công cụ hay giới thiệu), danh sách mọi chuỗi chữ bạn định hiển thị kèm loại theo VOICE.md mục 1, và các trạng thái (rỗng, đang tải, lỗi) sẽ có.
Chờ tôi duyệt rồi mới viết code.

Sau khi viết code: chạy check-copy, kiểm 1280×720 và 390×844 sáng/tối, báo cáo theo mẫu ở CLAUDE.md.
Không được: hero, eyebrow, mô tả phụ, tagline, dữ liệu bịa. Dùng dữ liệu thật hoặc giống thật.
```

## P9. Review thay đổi trước khi merge

```
/review-ui
```

## P10. Khi agent lặp lại một lỗi (hoặc bạn vừa chỉ ra lỗi mới)

```
Bạn vừa mắc lỗi: <mô tả cụ thể, dán chuỗi hoặc ảnh chụp>.
Việc cần làm ngay trong lượt này:
1. Sửa lỗi.
2. Thêm mục L-### mới vào cuối docs/LESSONS.md theo đúng định dạng (Lỗi, Vì sao sai, Luôn làm, Máy kiểm).
3. Nếu bắt được bằng máy: thêm luật vào docs/banned-phrases.json, chạy `node scripts/check-copy.mjs` để chắc luật hoạt động và không báo sai ở chỗ khác.
4. Nếu lỗi này cho thấy một quy tắc trong VOICE.md hoặc UX_RULES.md còn thiếu hoặc mơ hồ: đề xuất câu chữ bổ sung cho tôi duyệt, đừng tự sửa quy tắc.
Không được xóa hoặc làm yếu mục cũ.
```

## P11. Phiên mới, tiếp tục công việc dở

```
Tiếp tục sửa BACKLOG. Đọc CLAUDE.md và các file được nhắc trong đó trước.
Chạy `/fix-backlog next`. Báo cáo theo mẫu ở CLAUDE.md.
```
