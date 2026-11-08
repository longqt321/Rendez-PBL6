# Agent 8 — Chia hóa đơn (nhập tay)

> Góc nghiên cứu: **chia hóa đơn sau bữa ăn nhóm — nhập tay tên + giá, KHÔNG chụp ảnh bill.**
> Trọng tâm: một người trả tiền → tính nhanh **ai nợ ai bao nhiêu**, tối thiểu số giao dịch,
> xuất ra text gửi Zalo/Messenger. Toàn bộ tính toán chạy trên client, không cần backend.
>
> Phạm vi loại trừ (đã giao): lịch trình ngày (agent 6), sở thích nhóm (agent 7), cơ chế phiên
> nhóm (agent 9), nhiều ngày (agent 10). Bài này không đụng tới.

## Kế thừa từ đợt trước (không lặp lại)

- **DX-4.4** (ghi chú cá nhân + "Đã đi" trong bộ sưu tập) — kế thừa: khi có trạng thái "Đã đi",
  nút "Chia hóa đơn" có thể được gợi ý ngay tại địa điểm vừa đi (giai đoạn sau, không đề xuất lại).
- **DX-3.3** (review có giá món — _đề xuất, chưa làm_) — kế thừa: khi có dữ liệu giá món thật,
  danh sách món của bill có thể được điền sẵn từ review; hôm nay phải nhập tay. Không thiết kế
  tính năng này dựa trên dữ liệu chưa tồn tại.
- **Agent 4 đã loại "Ngân sách chuyến đi"** vì dữ liệu chỉ có `priceLevel: 1|2|3` — đúng, nhưng
  lý do đó **không** áp dụng cho chia hóa đơn: ở đây tiền do người dùng tự nhập (số thật của bữa
  ăn thật), không dựng ngân sách từ dữ liệu mock.

## Hiện trạng (bằng chứng code)

| Cần cho tính năng          | Hiện trạng                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Bằng chứng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format tiền VNĐ            | **Không có.** `@/lib/format` chỉ có `formatRelativeTime`, `formatCount`, `formatNumber`, `formatDate`, `formatRating`, `formatCoordinate`, `formatDistance`. `formatNumber` cho `1.234` (đúng dấu phân cách VN) nhưng không có hậu tố `₫` và không có khái niệm làm tròn nghìn.                                                                                                                                                                              | [format.ts:29-96](file:///home/longtran/Projects/frontend/src/lib/format.ts#L29-L96)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Chia sẻ **text**           | `shareLink` chỉ gửi `{ title, url }`, fallback clipboard cũng chỉ copy URL — không thể gửi danh sách "Bình → An 120k" bằng đường này.                                                                                                                                                                                                                                                                                                                        | [share.ts:11-43](file:///home/longtran/Projects/frontend/src/lib/share.ts#L11-L43)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Hằng số nghiệp vụ          | `constants.ts` chỉ có giới hạn ký tự caption/review/collection và toạ độ; không có gì về tiền.                                                                                                                                                                                                                                                                                                                                                               | [constants.ts:33-49](file:///home/longtran/Projects/frontend/src/lib/constants.ts#L33-L49)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Lưu trạng thái trên máy    | Dự án chỉ dùng `localStorage` một chỗ (skin). Không có helper lưu/nạp — feature phải tự viết file nhỏ của mình.                                                                                                                                                                                                                                                                                                                                              | [skin-provider.tsx:8-23](file:///home/longtran/Projects/frontend/src/app/providers/skin-provider.tsx#L8-L23)                                                                                                                                                                                                                                                                                                                                                                                               |
| Debounce khi tự lưu        | Đã có `useDebouncedValue` (uỷ thác `@uidotdev/usehooks`) — dùng lại được cho nháp bill.                                                                                                                                                                                                                                                                                                                                                                      | [use-debounced-value.ts:11](file:///home/longtran/Projects/frontend/src/hooks/use-debounced-value.ts#L11)                                                                                                                                                                                                                                                                                                                                                                                                  |
| Mock server                | Mọi route là `{ method, pattern: RegExp, handler }` trong mảng `routes`; "database" là object `db` trong bộ nhớ, reset khi tải lại trang. Chưa có route nào về bill.                                                                                                                                                                                                                                                                                         | [server.ts:47-56](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L47-L56), [server.ts:744](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L744), [server.ts:1070-1080](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L1070-L1080)                                                                                                                                                                                                                                  |
| Người dùng                 | Chỉ có `ME` (`u-me`, Minh Anh). Các user khác (`u-1`…) là người lạ trong feed, không có khái niệm "bạn bè". Thành viên bill phải là **tên gõ tay**, không thể là tài khoản.                                                                                                                                                                                                                                                                                  | [users.ts:97](file:///home/longtran/Projects/frontend/src/mocks/fixtures/users.ts#L97)                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Component UI có sẵn        | `Input` (base-ui, nhận props input thường), `InputGroup`/`InputGroupInput`/`InputGroupText` (ô tiền có hậu tố `₫`), `Field`/`FieldLabel`/`FieldError`/`FieldDescription`, `Item`/`ItemGroup`/`ItemActions`, `Card`, `Dialog`, `Drawer`, `Tabs`, `ToggleGroup`, `Badge`, `Separator`, `Empty`, `Alert`. Không cần cài thêm gì.                                                                                                                                | [input.tsx:2-7](file:///home/longtran/Projects/frontend/src/components/ui/input.tsx#L2-L7), [input-group.tsx:9-137](file:///home/longtran/Projects/frontend/src/components/ui/input-group.tsx#L9-L137), [field.tsx:67-215](file:///home/longtran/Projects/frontend/src/components/ui/field.tsx#L67-L215), [item.tsx:9-177](file:///home/longtran/Projects/frontend/src/components/ui/item.tsx#L9-L177), [drawer.tsx:24-194](file:///home/longtran/Projects/frontend/src/components/ui/drawer.tsx#L24-L194) |
| ToggleGroup nhiều lựa chọn | Đã xác minh trong `.d.ts` bản cài: `value?: readonly Value[]`, `onValueChange?: (groupValue: Value[], …)`, có prop `multiple` — đúng dạng cần cho "ai ăn món này" (chọn nhiều người).                                                                                                                                                                                                                                                                        | [ToggleGroup.d.ts:32-45](file:///home/longtran/Projects/frontend/node_modules/@base-ui/react/toggle-group/ToggleGroup.d.ts#L32-L45)                                                                                                                                                                                                                                                                                                                                                                        |
| Điểm vào UI                | Hàng nút hành động trên trang địa điểm hiện có đúng 2 nút (Lưu, Check-in) — chỗ tự nhiên để thêm "Chia hóa đơn". Nav chính chỉ có 3 mục; `/saved`, `/settings` vào từ menu avatar ([app-shell.tsx:211-225](file:///home/longtran/Projects/frontend/src/components/layout/app-shell.tsx#L211-L225)) — `/bill` nên theo đúng precedent này, không thêm mục nav thứ 4 (mobile bottom bar dùng `flex-1`, thêm mục sẽ ép nhãn ngắn lại và đổi trọng số cả thanh). | [place-detail-page.tsx:129-142](file:///home/longtran/Projects/frontend/src/features/places/pages/place-detail-page.tsx#L129-L142), [nav-items.ts:9-13](file:///home/longtran/Projects/frontend/src/components/layout/nav-items.ts#L9-L13), [app-shell.tsx:272-284](file:///home/longtran/Projects/frontend/src/components/layout/app-shell.tsx#L272-L284)                                                                                                                                                 |
| Test runner                | Không có (không có `*.test.*`, không có vitest/jest trong `package.json`). Kiểm chứng thuật toán phải bằng script chạy trực tiếp.                                                                                                                                                                                                                                                                                                                            | `package.json` (toàn bộ `scripts` + `devDependencies`)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Khoảng trống sản phẩm:** app trả lời được "đi đâu, ăn gì, ai khen" nhưng không trả lời được câu
hỏi cuối cùng của mọi bữa ăn nhóm: _"ai trả, ai chuyển cho ai bao nhiêu?"_. Người Việt giải quyết
bằng cách mở app máy tính, chia 480.000 cho 5, tự xử lý phần lẻ, rồi nhắn từng người — 5–10 phút
dễ sai. Đây là tính năng thuần logic, không cần dữ liệu mới, không cần backend.

## Đề xuất

Nguyên tắc xuyên suốt: **một mô hình dữ liệu duy nhất `Bill`**, mọi chế độ nhập đều đổ vào nó —
"chia đều" chỉ là bill có đúng 1 món "Tổng bill" gán cho tất cả. Không có hai thuật toán song song
(quy tắc "một nghiệp vụ một chỗ xử lý"). Tiền luôn là **số nguyên đồng** (`type Vnd = number`),
cấm số thực — 480.000/3 phải chia bằng số nguyên dư, không phải `160000.00000000003`.

### DX-8.1: Chia đều nhanh — tổng bill + số người + ai trả, kết quả hiện tức thì

- **Vấn đề.** 80% bữa ăn nhóm không cần nhập từng món: "bún chả 480k, 5 người". Mở app máy tính,
  chia, xử lý phần lẻ, tự nhớ ai trả — chậm và dễ lệch vài nghìn.
- **Hiện trạng.** Không có gì cả (xem bảng trên). App có trang địa điểm nhưng dừng ở "đã đi".
- **UX (ít chạm nhất).** Route `/bill` (vào từ menu avatar + nút "Chia hóa đơn" trên trang địa
  điểm, truyền `?place=<id>` để điền sẵn tên quán làm tiêu đề):
  1. Tab mặc định "Chia đều". Ô **Tổng bill** (`InputGroup` + `InputGroupText` hậu tố `₫`,
     `inputMode="numeric"`).
  2. Hàng chip **người tham gia**: chip đầu là "Tôi (Minh Anh)" lấy từ `useMe`; bấm "Thêm" không
     gõ tên → tự đặt "Người 2", "Người 3" (1 chạm/người); gõ tên rồi Enter thì dùng tên đó.
  3. Chọn **ai trả trước** — `ToggleGroup` single-select trên chính các chip người (mặc định "Tôi").
  4. Kết quả hiện **ngay khi gõ**, không cần nút "Tính": dòng "Mỗi người 96.000 ₫" + danh sách
     chuyển khoản. Nút "Sao chép để gửi" (DX-8.4).
     Tổng ~3 thao tác nhập cho ca phổ biến nhất.
- **Mô hình dữ liệu.** Chính là `Bill` của DX-8.2 với `items = [{ name: "Tổng bill", amount:
total, sharedBy: tất cả }]`, `fees = []`. Không có type `QuickSplit` riêng.
- **Thuật toán.** Chia số nguyên kiểu "phần dư về đầu danh sách": `base = floor(total / n)`,
  `rem = total - base·n`, `rem` người đầu tiên (theo thứ tự thêm) nhận thêm 1 đồng. Tổng luôn
  khớp tuyệt đối — không bao giờ hiện "còn thiếu 2 ₫".
- **Giá trị thực.** Câu hỏi được trả lời trong <30 giây, số luôn cộng đúng bằng tổng bill (điều
  máy tính thường làm sai vì phần lẻ), và kết quả gửi được ngay.
- **Phạm vi.** FE · **S**. Không đụng mock server.
- **Rủi ro.** Thấp. Duy nhất: người dùng hiểu "mỗi người 96.000 ₫" là số đã gồm phí — ở chế độ này
  chưa có phí, nhãn phải ghi rõ "chưa gồm phí/tip" để không gây hiểu nhầm với DX-8.2.

### DX-8.2: Nhập theo món + gán người, phí phục vụ/VAT/tip/gửi xe, nhiều người ứng tiền

- **Vấn đề.** "Trời ơi tôi không ăn nem", "bia chỉ hai đứa uống", "gửi xe ai cũng phải trả" —
  chia đều cho cả bàn là không công bằng, nhưng gán tay từng món lại phải nhanh hơn mở Excel.
- **Hiện trạng.** Không có. Điểm vào duy nhất là nút trên trang địa điểm.
- **UX.** Tab "Theo món" trên cùng trang `/bill`, **dùng lại** danh sách người đã nhập ở tab Chia đều:
  1. Mỗi món là một hàng `Item`: `Input` tên + `InputGroup` giá. **Enter ở ô giá → tự thêm hàng
     mới và focus ô tên** — nhập cả bill không cần chạm nút "Thêm món".
  2. Gán người: mỗi hàng có chip "Cả bàn (5)" — **mặc định là tất cả**, bấm mở `Popover` chứa
     `ToggleGroup multiple` các chip tên để bỏ người không ăn. Mặc định-tất-cả là quyết định UX
     quan trọng: đa số món cả bàn ăn cùng, chỉ bấm khi có ngoại lệ.
  3. Khối "Phí & tip": nút nhanh `VAT 8%` · `Phục vụ 5%` · `Gửi xe` · `Tip` — chỉ là **giá trị điền
     sẵn vào ô số**, người dùng sửa được; mỗi khoản chọn "chia đều" hay "theo phần đã ăn".
  4. "Ai ứng tiền": mỗi người có ô số tiền đã trả (mặc định 0). Phủ được cả ca "An trả món, Bình
     trả gửi xe" mà không cần khái niệm riêng.
  5. Kết quả: `ItemGroup` từng người (đã ăn / đã trả / còn nợ) + khối "Quyết toán" của DX-8.4.
- **Mô hình dữ liệu.**
  ```ts
  type Vnd = number // số nguyên đồng

  interface Participant {
    id: string
    name: string
  } // id nội bộ "p-1", KHÔNG phải userId

  interface BillItem {
    id: string
    name: string
    amount: Vnd
    sharedBy: string[] // rỗng = chưa gán — UI chặn xuất kết quả
  }

  type FeeSplit = "equal" | "proportional"

  interface BillFee {
    id: string
    label: string // "Phí phục vụ", "Gửi xe", "Tip"
    amount: Vnd
    split: FeeSplit // equal: chia đều mọi người; proportional: theo phần món đã ăn
  }

  interface Bill {
    id: string
    title: string // "Bún chả 8/11", mặc định = tên quán nếu mở từ trang địa điểm
    placeId?: string
    participants: Participant[]
    items: BillItem[]
    fees: BillFee[]
    paidBy: Record<string, Vnd> // nhiều người ứng tiền được
    roundingStep: 0 | 1_000 | 5_000
    createdAt: string
    updatedAt: string
  }

  interface PersonShare {
    participantId: string
    owed: Vnd
    paid: Vnd
    net: Vnd
  } // net = paid - owed
  interface Settlement {
    fromId: string
    toId: string
    amount: Vnd
  } // from chuyển cho to
  ```
- **Thuật toán (chia số nguyên, có kiểm chứng).**
  1. **Món:** mỗi món chia cho `sharedBy` — `base = floor(amount/n)`, phần dư `1..n-1` đồng cộng
     cho các người đầu theo thứ tự thêm (xác định, không ngẫu nhiên).
  2. **Phí:** `equal` — chia đều như trên cho mọi người; `proportional` — phân bổ theo trọng số
     `owed[i]/Σowed` bằng largest-remainder (lấy phần nguyên của `amount·owed[i]/Σowed`, phần dư
     đồng ưu tiên phần thập phân lớn nhất, hòa thì theo thứ tự thêm). Nếu `Σowed = 0` (bill chỉ
     có phí) thì fallback về `equal`.
  3. **Làm tròn:** `rounded[i] = round(owed[i]/step)·step` (step = 1.000 hoặc 5.000, tiền Việt
     không có xu lẻ). Hiệu số `delta = Σrounded − total` **cộng gộp vào người trả tiền trước**
     (người có `paidBy` lớn nhất) — đúng lệ "thôi khỏi thối": phần lẻ về phía người cầm tiền, chứ
     không ai bị đòi 334 ₫. Chặn `rounded[i] < 0`: nếu hiệu chỉnh làm âm thì kẹp về 0 và dồn phần
     còn lại cho người có phần lớn tiếp theo.
  4. **Kiểm chứng ví dụ** (tổng 500.000 ₫, 4 người, làm tròn 1.000): nem 200k/4, bún chả 160k/3,
     bia 120k/2, gửi xe 20k/4 → owed An 108.334 · Bình 168.333 · Cường 168.333 · Dung 55.000
     (tổng đúng 500.000). Sau làm tròn: 108.000 · 168.000 · 168.000 · 55.000 = 499.000, thiếu
     1.000 → An (người trả) nhận thêm → **An 109.000, Bình 168.000, Cường 168.000, Dung 55.000**.
- **Giá trị thực.** Đây là phần mà máy tính không làm được: nhớ ai không ăn món nào, xử lý phí và
  phần lẻ theo đúng lệ Việt, ra kết quả ai nợ ai trong một màn hình.
- **Phạm vi.** FE · **M** (thuần client; nếu muốn lưu/chia link thì tăng thành L — xem mục
  "Thuần client vs cần backend").
- **Rủi ro.** (1) Form động nhiều hàng — phải theo CONVENTIONS §8 (`react-hook-form` + `zod` +
  `Controller` cho `ToggleGroup`, vì base-ui không nhận `ref`/`onChange`); danh sách món dùng
  `useFieldArray`. (2) Người dùng quên gán món nào cho ai → phải có hàng cảnh báo "2 món chưa gán"
  (`Alert`) thay vì âm thầm tính sai. (3) Nhầm `from`/`to` trong quyết toán — nhãn UI phải là câu
  đầy đủ "Bình chuyển Minh Anh 168.000 ₫", không chỉ mũi tên.

### DX-8.3: Nhập siêu nhanh một dòng — gõ "phở 45k, trà đá 5k" là thành danh sách món

- **Vấn đề.** Ngồi giữa quán, cầm bill giấy, muốn nhập 8 món mà bấm từng ô tên + từng ô giá là
  16 lần chạm — đủ để người dùng bỏ cuộc và mở máy tính.
- **Hiện trạng.** Không có. Đây là câu trả lời cho yêu cầu "nhập số kèm tên" với số chạm ít nhất.
- **UX.** Nút "Gõ nhanh" mở `Textarea` một khối: _"Mỗi món một dòng: `tên giá`. Ví dụ: phở bò
  45k, nem 60k, bia 120k"_. Gõ xong bấm "Xem trước" → bảng món đã tách, **mỗi ô vẫn sửa được** →
  "Dùng danh sách này" đổ vào bill của DX-8.2. Không bao giờ tự commit — luôn có bước xem trước.
- **Mô hình dữ liệu.** Không thêm gì — parser chỉ sinh `BillItem[]` rồi đổ vào `Bill.items`.
- **Thuật toán parse** (`src/features/bill/lib/parse-bill-text.ts`, thuần hàm, không state):
  1. Tách segment theo xuống dòng, `,`, `;`, `+`, `và`.
  2. Trong mỗi segment, **token cuối cùng** phải "trông như tiền" mới được coi là giá: có hậu tố
     `k/K/nghìn/ng`, dạng `1tr2`/`1,2tr`/`1.2 triệu`, hoặc số ≥ 4 chữ số, hoặc có dấu `.`/`,`
     phân cách nghìn; các ký tự `đ ₫ vnd` cuối bị bỏ.
     Quy tắc "token cuối" là bắt buộc vì tên quán/món ở Đà Nẵng có thể chứa số ("Bún 24") — nếu
     lấy số đầu tiên sẽ nuốt luôn tên quán.
  3. Phần còn lại là tên (trim). Segment không có token tiền → món thiếu giá, hiện lỗi ngay tại
     dòng "Thiếu giá" thay vì đoán.
  4. Quy ước: `45k` = 45.000, `1tr2` = 1.200.000, `45.000` = 45.000 (dấu chấm là phân cách nghìn,
     không phải thập phân — VNĐ không có đơn vị nhỏ hơn đồng).
- **Giá trị thực.** Nhập cả bill 8 món trong ~20 giây, đúng cách người Việt gõ tin nhắn giá cả
  hàng ngày ("45k", "1tr2"). Đây là điểm khác biệt lớn nhất so với "chia đều bằng máy tính".
- **Phạm vi.** FE · **M**. Phụ thuộc DX-8.2 (đổ dữ liệu vào bill).
- **Rủi ro.** Parse sai là rủi ro số 1 của tính năng này → mọi đường đều qua bước xem trước có
  thể sửa; ca khó ("45 000" có phải 2 số?) xử lý theo quy tắc token-cuối + luôn cho sửa tay.
  Không dùng AI/LLM — cần deterministic để tin được.

### DX-8.4: Quyết toán tối thiểu giao dịch + text gửi Zalo/Messenger

- **Vấn đề.** 5 người, 1 người trả → "mỗi người chuyển An 96k" là 4 giao dịch. Nhưng khi có nhiều
  người ứng tiền, chia từng người một sẽ sinh 7–8 giao dịch thừa ("Bình chuyển Cường 20k rồi
  Cường chuyển An 20k" là vô nghĩa).
- **Hiện trạng.** Không có; `shareLink` không gửi được text (xem Hiện trạng).
- **UX.** Khối "Quyết toán" cuối trang: danh sách `Settlement` dạng câu đầy đủ, sắp theo số tiền
  giảm dần; nút "Sao chép" (clipboard) và "Gửi" (`navigator.share` với `text`). Text mẫu:
  ```
  Bún chả — 08/11
  Tổng 500.000 ₫ · 4 người · An trả trước

  Đã ăn:
  • An 109.000 ₫ (đã trả đủ)
  • Bình 168.000 ₫
  • Cường 168.000 ₫
  • Dung 55.000 ₫

  Chuyển khoản cho An:
  • Bình → An 168.000 ₫
  • Cường → An 168.000 ₫
  • Dung → An 55.000 ₫
  ```
- **Mô hình dữ liệu.** `Settlement { fromId, toId, amount }` (đã khai ở DX-8.2). Chỉ là **kết quả
  tính**, không lưu — sinh lại bất cứ lúc nào từ `Bill`.
- **Thuật toán giảm số giao dịch.**
  1. `net[i] = paid[i] − rounded[i]`; bỏ người có `net = 0`.
  2. **Bước huỷ cặp bằng nhau (O(n), rẻ và hiệu quả nhất):** người nợ −x khớp người cho +x → 1
     giao dịch, bỏ cả hai khỏi bài toán. Xử lý luôn ca 2 người chia đôi.
  3. **Greedy:** xếp chủ nợ giảm dần, người nợ tăng dần (âm nhiều nhất trước); lặp: chuyển
     `min(dư nợ, dư cho)` giữa hai đầu hàng, ai về 0 thì rời hàng. Cho tối đa `n−1` giao dịch với
     n = số người còn `net ≠ 0`.
  4. **Không đòi tối ưu tuyệt đối:** số giao dịch ít nhất tương đương bài toán chia tập con
     (subset-sum, NP-hard). Greedy + huỷ cặp là cách Splitwise làm; với bàn ăn n ≤ 12 chênh lệch
     nhiều nhất 1–2 giao dịch. Ghi rõ trong code để người sau không "tối ưu" thêm.
  5. Bất biến bắt buộc (kiểm bằng script, xem mục "Cách thử"): `Σowed = Σitems + Σfees`,
     `Σrounded = total`, `Σnet = 0`, `Σtransfer = Σ(net > 0)`, `số giao dịch ≤ n − 1`.
- **Giá trị thực.** Đây là **sản phẩm cuối** người dùng mang đi: một khối text dán được vào Zalo.
  Không có bước này thì mọi tính toán phía trên chỉ tồn tại trên màn hình của một người.
- **Phạm vi.** FE · **S** (nhưng **cần thêm `shareText` vào `src/lib/share.ts`** — lib nằm ngoài
  allowlist đợt này; là thay đổi ~20 dòng, mirror `ShareResult`, và DX-2.3/DX-4.2 sẽ dùng lại).
- **Rủi ro.** `navigator.share({ text })` không có trên desktop → fallback clipboard đã có sẵn
  pattern trong `share.ts`; text quá dài bị Zalo cắt — giữ ≤ 15 dòng, số tiền format gọn.

### DX-8.5: Lưu bill gần đây trên máy + nháp tự lưu

- **Vấn đề.** Tính xong, chuyển khoản xong, tuần sau nhóm hỏi lại "hôm đó ai trả bao nhiêu?" —
  và bill đang nằm đâu đó trong Zalo. Hoặc gõ dở 8 món thì lỡ tay tắt trang.
- **Hiện trạng.** Không có cơ chế lưu nào ngoài skin (`localStorage` dùng 1 chỗ duy nhất).
- **UX.** (1) Nháp tự lưu khi đang nhập (debounce 400 ms bằng `useDebouncedValue` đã có) — mở lại
  `/bill` là thấy bill dở. (2) Danh sách "Gần đây" trên `/bill`: `Item` hàng = tiêu đề + ngày
  (`formatDate`) + tổng + số người; bấm để mở lại/sửa/tính lại; nút "Xoá tất cả" có `AlertDialog`.
- **Mô hình dữ liệu.** `SavedBill { id, savedAt, bill: Bill }`, key `danang-an-di:bills:v1`,
  tối đa 20 bản (LRU). Không thêm type mới ngoài wrapper.
- **Thuật toán.** Không có — chỉ serialize JSON. Giới hạn 20 bản là để key không phình vô hạn.
- **Giá trị thực.** Biến kết quả một lần tính thành tài liệu nhóm tra lại được, với chi phí gần
  bằng 0 và không đụng backend.
- **Phạm vi.** FE · **S**.
- **Rủi ro.** (1) Riêng tư: tên + số tiền nằm trên máy — phải có nút xoá và ghi chú rõ "chỉ lưu
  trên máy này". (2) Đổi schema sau này → có `:v1` trong key để bỏ nháp cũ an toàn.

## Thuần client vs cần backend

**Thuần client (DX-8.1 → 8.5, toàn bộ giai đoạn 1):** mọi phép tính (chia món, phí, làm tròn,
quyết toán), parse text, sinh text chia sẻ, nháp + lịch sử `localStorage`. Không một request nào
cần thiết — tính tức thì, dùng được khi mất mạng trong quán, và không có gì để "sai đồng bộ".

**Cần backend (không làm trong giai đoạn này):**

- **Lưu bill lên server + link chia sẻ** (`POST /bills`, `GET /bills/:id`): chỉ cần khi muốn
  thành viên khác mở link xem bill thay vì đọc text. Với mock chỉ có `ME`, link này chỉ đọc được
  bởi chính người tạo — vô nghĩa trong môi trường hiện tại. Text Zalo (DX-8.4) phủ đúng nhu cầu
  mà không cần server.
- **Trạng thái "đã chuyển khoản"**: cần nhiều tài khoản thật + auth. Mock không có; làm bây giờ
  là dựng UI cho dữ liệu không tồn tại.
- **Gắn bill vào địa điểm/bài đăng** (`placeId` đã chừa trong model): chỉ có giá trị khi backend
  thật lưu được và có nhiều người dùng cùng nhìn thấy.

## Cách thử với mock hiện tại

Giai đoạn 1 **không cần đổi mock server** — toàn bộ là client. Kịch bản thử tay trên `/bill`:

1. **Ca chuẩn:** tổng 480.000, 5 người, làm tròn 1.000 → mỗi người 96.000, tổng vẫn 480.000.
2. **Không chia hết có phần lẻ:** 500.000/3 → 166.667/166.667/166.666, tổng đúng 500.000.
3. **Làm tròn 5.000 với tổng lẻ:** 47.000, 3 người, step 5.000 → 15.000/15.000/17.000 (phần lẻ
   về người trả), tổng đúng 47.000.
4. **Người trả cũng ăn:** An trả 500.000 và cũng phải nợ 109.000 (ví dụ DX-8.2) — net đúng
   +391.000, không bị tính hai lần.
5. **Hai người ứng tiền:** An trả món 480k, Bình trả gửi xe 20k → quyết toán ra đúng 3 dòng,
   không có dòng "Bình → An 20.000 ₫" thừa.
6. **Món chưa gán:** bill có món `sharedBy` rỗng → `Alert` "1 món chưa gán", nút xuất bị khoá.
7. **Parse:** "phở 45k, Bún 24, nem 60k" → "Bún 24" phải bị đánh dấu thiếu giá, không bị nuốt
   thành "Bún" giá 24 ₫.
8. **Edge:** 1 người (không có gì để quyết toán), tổng 0, 20 người (chặn trên
   `MAX_BILL_PARTICIPANTS`), tên trùng ("Hà" × 2 — phải phân biệt bằng chip, không phải bằng id).

Vì repo không có test runner, thuật toán chia/quyết toán nên kèm một script kiểm chứng kiểu
`scratch/bill-settle.mjs` (mô hình đã có precedent `scratch/size-parity.mjs` trong D-025) chạy
5 bất biến ở DX-8.4 trên ~20 bill ngẫu nhiên — exit 0 mới tính xong phần thuật toán.

**Thay đổi ngoài allowlist mà đề xuất này cần khi implement** (ghi rõ để đợt sau chốt):

- `src/lib/format.ts`: thêm `formatCurrency(vnd)` → `120.000 ₫` (3 dòng, tái dùng `numberFormat`
  sẵn có ở dòng 12; DX-3.3 sẽ dùng lại). Không viết formatter tiền trong feature — vi phạm §5.
- `src/lib/share.ts`: thêm `shareText({ title, text })` mirror `ShareResult`.
- `src/lib/constants.ts`: `MAX_BILL_PARTICIPANTS = 20`, `MAX_BILL_ITEMS = 100`,
  `MAX_BILL_ITEM_NAME_LENGTH = 60`, `BILL_ROUNDING_STEPS = [1000, 5000]`.
- `src/app/router/routes.tsx`: route `/bill`.

## Không đề xuất và lý do

- **Chụp ảnh bill / OCR** — người dùng loại rõ ràng ngay từ yêu cầu gốc; ngoài ra cần dịch vụ
  OCR (đám mây, chi phí, sai số với chữ viết tay và hóa đơn Việt Nam), và kết quả OCR vẫn phải
  qua bước sửa tay y hệt DX-8.3 mà không nhanh hơn gõ.
- **Ví điện tử / tạo mã VietQR chuyển khoản trong app** — cần backend, tài khoản đối tác thanh
  toán và ràng buộc pháp lý; số tài khoản cũng không có trong dữ liệu mock. Là follow-up riêng
  nếu sau này có backend thật, không thuộc phạm vi "nhập tay".
- **Sổ nợ dài hạn ("Cường còn nợ 300k từ tháng trước")** — cần nhiều người dùng + auth + lịch sử
  giữa các bill; và biến app ăn uống thành app tài chính cá nhân, sai định vị sản phẩm. Bill ở
  đây sống và chết trong một bữa ăn.
- **Chia theo hệ số suất (trẻ em nửa suất, "tôi không uống bia nên trừ bớt")** — thêm một chiều
  phức tạp UI (mỗi người một hệ số) cho ca ít gặp; "không ăn món đó" đã xử lý bằng gán món
  (DX-8.2), "không uống rượu bia" xử lý được bằng cách tách bia thành món riêng. Để lại sau khi
  có phản hồi người dùng thật.
- **Nhập chung realtime cả nhóm đang ngồi (mỗi người tự tick món mình ăn)** — trùng ranh giới
  với cơ chế phiên nhóm (agent 9) và cần backend realtime; với 1 người dùng mock thì không kiểm
  chứng được gì. Người trả tiền nhập một mình + gửi text là đủ cho bữa ăn thường.
- **Tự động điền bill từ review có giá món** — chờ DX-3.3 có dữ liệu thật; thiết kế bây giờ là
  thiết kế trên dữ liệu không tồn tại.
- **Thêm mục nav thứ 4 "Chia tiền"** — mobile bottom bar chia `flex-1`, thêm mục ép nhãn ngắn và
  đổi trọng số cả thanh cho một tính năng dùng vài lần/tuần; `/saved`, `/settings` đã đi đường
  menu avatar, `/bill` đi cùng đường đó + nút bối cảnh trên trang địa điểm.
- **Thêm store toàn cục (zustand) cho bill** — `zustand` có trong `package.json` nhưng chưa được
  dùng ở đâu trong `src/`; state của bill chỉ sống trong 1 trang, `useState` + tự lưu localStorage
  là đủ. Thêm store cho một trang là overengineering.

## Chưa xác minh

- Toàn bộ đề xuất dựa trên **đọc code**, chưa chạy app trong trình duyệt; chưa đo cảm giác "3
  chạm" trên thiết bị thật.
- Mức VAT 8% cho dịch vụ ăn uống được nêu như **giá trị điền sẵn người dùng sửa được**, không
  phải khẳng định luật; mức áp dụng thực tế tại thời điểm triển khai cần xác minh lại.
- Chưa thử `navigator.share({ text })` trên Android/iOS thật và trong webview Zalo — chỉ biết
  API tồn tại; fallback clipboard là đường chắc chắn chạy.
- Giả định "80% bữa ăn chỉ cần chia đều" là suy luận từ kinh nghiệm, không có số liệu hành vi.
