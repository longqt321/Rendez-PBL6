---
id: "ERPF-TOOL-ASSESS-002"
title: "Bộ Kịch Bản Kiểm Định Năng Lực Thực Chiến (Practical Assessment Scenarios)"
version: "1.0.0"
category: "TOOL"
track: "CORE"
concept_type: "ASSESS"
intended_audience:
  - "Engineering Candidates"
  - "AI Coding & Research Agents"
  - "Technical Evaluators"
  - "Interviewers & Assessors"
prerequisites:
  - "ERPF/foundation/competencies.md"
  - "ERPF/toolkit/assessments/competency-evaluation-framework.md"
related_concepts:
  - "ERPF-TOOL-ASSESS-000"
  - "ERPF-TOOL-ASSESS-001"
applicable_contexts:
  - "Kiểm định năng lực chuyên môn thực tế của kỹ sư và nhà nghiên cứu qua các ca phân tích đánh đổi phức tạp"
  - "Kiểm thử tự động hóa đánh giá năng lực tự chủ (Benchmark Scenarios) cho AI Coding & Research Agents"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "assessment"
  - "practical-scenarios"
  - "reasoning-tests"
  - "failure-cases"
  - "rubrics"
---

# Bộ Kịch Bản Kiểm Định Năng Lực Thực Chiến
# Practical Professional Assessment Scenarios

> **Nguyên tắc thiết kế:** Bộ kịch bản này kiểm tra khả năng lập luận kỹ thuật, phát hiện lỗ hổng và ra quyết định thực tế của ứng viên/tác nhân. Không có câu hỏi nào kiểm tra việc nhắc lại định nghĩa. Mỗi kịch bản đưa ra một tình huống chân thực, đầy đủ dữ kiện mâu thuẫn để đo lường năng lực chuyên môn quan sát được.

---

## Kịch Bản 1: Phán Đoán Quyết Định Kiến Trúc Sai Lầm (Poor Architectural Decision)

### 1. Mô Tả Tình Huống (Scenario)
Một nhóm kỹ sư đang xây dựng tính năng xử lý đơn đặt bàn và thanh toán cọc cho chuỗi quán cà phê. Trưởng nhóm đề xuất: *"Để tăng tính mở rộng, chúng ta tách dịch vụ `ReservationService` và `PaymentService` thành 2 microservices độc lập với 2 cơ sở dữ liệu PostgreSQL riêng biệt. Giao tiếp giữa 2 dịch vụ thực hiện qua HTTP REST synchronous call: Khi người dùng bấm 'Đặt bàn', ReservationService gọi sang PaymentService để trừ tiền cọc; nếu trừ tiền thành công thì ReservationService mới ghi nhận trạng thái CONFIRMED vào DB của mình"*.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Phân tích quyết định kiến trúc trên. Chỉ ra các lỗi kiến trúc cốt tử trong điều kiện mạng thực tế, phân tích bán kính nổ, và đề xuất kiến trúc thay thế tối ưu.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Nhận diện lỗi **Phân tán giao dịch nhưng gọi đồng bộ (Synchronous Distributed Transaction Anti-Pattern)**.
2. Nhận diện lỗ hổng **Thiếu tính nguyên tử (Atomicity Loss)**: Nếu `PaymentService` đã trừ tiền thành công, nhưng kết nối mạng bị rớt (Network Drop / Timeout) trước khi phản hồi HTTP 200 về tới `ReservationService`, thì `ReservationService` sẽ báo lỗi cho người dùng trong khi tiền của người dùng đã bị trừ! Hệ thống rơi vào trạng thái bất nhất nghiêm trọng (Inconsistent State).
3. Đánh giá tính cần thiết: Với quy mô một chuỗi quán cà phê, việc chia 2 cơ sở dữ liệu riêng biệt là một quyết định tồi tệ, làm phức tạp hóa vận hành mà không mang lại lợi ích quy mô.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- **Phương án tối ưu:** Giữ nguyên trong một **Clean Monolith**, gom cả 2 bảng `Reservation` và `Payment` trong cùng một cơ sở dữ liệu PostgreSQL, và bọc toàn bộ chu trình trong một khối giao dịch nguyên tử `transaction.atomic()` duy nhất.
- **Phương án chấp nhận được nếu bắt buộc phải tách service:** Sử dụng mô hình **Saga Pattern** bất đồng bộ qua Message Queue (hoặc Outbox Pattern) kèm cơ chế giao dịch bù trừ (Compensating Transactions) và xử lý lặp lại an toàn (Idempotency Key).

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Khuyên dùng `try-catch` bọc cuộc gọi HTTP để retry mà không nhận thức được nguy cơ trừ tiền 2 lần (Double Charge).
- Đồng tình với đề xuất chỉ vì "microservices là xu hướng chuẩn của ngành".

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Không phát hiện được nguy cơ mất tiền của khách khi timeout mạng; chỉ góp ý về timeout hoặc định dạng JSON.
- **Competent:** Phát hiện được lỗi mất tính nguyên tử của giao dịch phân tán; đề xuất dùng Saga hoặc giữ monolith.
- **Proficient:** Phân tích toàn diện bán kính nổ, chỉ ra chi phí vận hành 2 DB vượt xa lợi ích, đề xuất Clean Monolith với transaction atomic.
- **Advanced:** Thiết kế hoàn chỉnh cơ chế Outbox Pattern và Idempotent Consumer nếu trong bối cảnh thanh toán với ngân hàng bên ngoài.

---

## Kịch Bản 2: Nhận Diện Sai Nguyên Nhân Gốc (Misidentified Root Cause)

### 1. Mô Tả Tình Huống (Scenario)
Hệ thống báo cáo lỗi ngắt quãng trên production: `KeyError: 'display_address'` phát sinh tại worker xử lý background task gửi email xác nhận đặt chỗ. Một kỹ sư junior đã mở Pull Request sửa lỗi bằng cách đổi:
```python
# Mã cũ:
address = payload["display_address"]

# Mã sửa đổi của kỹ sư:
address = payload.get("display_address", "Địa chỉ mặc định")
```
Kỹ sư này giải thích: *"Dùng `.get()` có giá trị mặc định sẽ ngăn chặn hoàn toàn KeyError, giúp worker không bao giờ bị crash nữa"*.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Thẩm định Pull Request trên. Phân tích xem giải pháp này là sửa nguyên nhân gốc hay vá triệu chứng bề mặt. Điều tra xem cơ chế nào có thể đã tạo ra payload thiếu key, và đưa ra giải pháp chuẩn mực.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Nhận diện hành vi **Vá triệu chứng bề mặt (Symptom-Masking Anti-Pattern - `ERPF-SE-LESS-001`)**: Việc dùng `.get()` gán "Địa chỉ mặc định" sẽ khiến khách hàng nhận được email gửi về địa chỉ vô nghĩa, gây khiếu nại dịch vụ và che giấu trạng thái dữ liệu hư hỏng ngầm.
2. Lần vết ngược dòng (Upstream Trace): Tại sao `display_address` lại không có trong payload?
   - Do worker đọc dữ liệu từ hàng đợi tin nhắn (Message Queue).
   - Nếu một địa điểm vừa được tạo nhưng chưa hoàn tất bước geocoding, hoặc schema của message producer vừa bị thay đổi mà consumer chưa cập nhật, payload sẽ bị khuyết trường.
3. Thiết lập giải pháp: Không được phép nuốt lỗi; payload đầu vào của worker phải được validate qua schema validator. Nếu payload sai định dạng, task phải bị đẩy vào Dead Letter Queue (DLQ) để điều tra producer, thay vì âm thầm gửi email sai.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Bác bỏ PR; yêu cầu validate payload ở ranh giới vào worker bằng Pydantic / Serializer schema.
- Điều tra nơi tạo ra payload (Producer service) để bảo đảm bất biến `display_address` luôn được sinh ra trước khi đẩy message vào queue.

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Phê duyệt PR với nhận xét: "Good practice, using .get() is more Pythonic".
- Chỉ thêm log warning nhưng vẫn để task chạy tiếp với địa chỉ rác.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Phê duyệt PR vì thấy code ngắn gọn và không còn crash worker.
- **Competent:** Bác bỏ PR; giải thích được rằng việc gán địa chỉ mặc định sẽ làm hỏng dữ liệu gửi khách hàng; yêu cầu điều tra producer.
- **Proficient:** Lần vết chính xác tới ranh giới bất đồng bộ giữa Producer/Consumer, thiết lập Dead Letter Queue và schema validation.
- **Advanced:** Xây dựng cơ chế Consumer-Driven Contract testing giữa producer và consumer để ngăn chặn việc thay đổi schema payload.

---

## Kịch Bản 3: Giả Định Kỹ Thuật Bất Hợp Lệ (Invalid Technical Assumption)

### 1. Mô Tả Tình Huống (Scenario)
Nhóm phát triển tính năng tích điểm đổi quà. Kỹ sư phụ trách thiết kế hàm cộng điểm như sau:
```python
def add_loyalty_points(user_id, points_to_add):
    user_wallet = Wallet.objects.get(user_id=user_id)
    user_wallet.balance += points_to_add
    user_wallet.save()
```
Kỹ sư khẳng định: *"Hàm này hoàn toàn an toàn vì Django ORM tự động quản lý kết nối DB và hàm thực thi chỉ mất 5ms nên không thể có lỗi được"*.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Chỉ ra giả định sai lầm chết người trong lập luận của kỹ sư. Mô tả chính xác kịch bản thất thoát dữ liệu trong môi trường nhiều người dùng đồng thời, và viết lại đoạn mã chuẩn xác.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Kỹ sư đã ngầm đưa ra giả định bất hợp lệ: **Giả định thực thi tuần tự đơn luồng (Single-threaded / No Concurrency Assumption)**.
2. Cơ chế thất bại: **Hiện tượng ghi đè mất mát dữ liệu (Lost Update Anomaly / Race Condition)**.
   - Nếu 2 giao dịch cộng điểm (ví dụ: quét mã QR tại quán và nhận điểm thưởng giới thiệu bạn bè) diễn ra đồng thời:
     * Thread 1 đọc `balance = 100`.
     * Thread 2 đọc `balance = 100`.
     * Thread 1 cộng 20, ghi `balance = 120`.
     * Thread 2 cộng 50, ghi đè `balance = 150` (thay vì kết quả đúng là 170). Hệ thống làm mất 20 điểm của người dùng!
3. Giải pháp đúng đắn: Sử dụng khóa bi quan (`select_for_update()`) bên trong khối giao dịch nguyên tử, hoặc sử dụng biểu thức cập nhật nguyên tử ở tầng cơ sở dữ liệu (`F('balance') + points_to_add`).

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Cập nhật nguyên tử tầng DB:
  ```python
  Wallet.objects.filter(user_id=user_id).update(balance=F('balance') + points_to_add)
  ```
- Khóa bi quan có transaction:
  ```python
  with transaction.atomic():
      wallet = Wallet.objects.select_for_update().get(user_id=user_id)
      wallet.balance += points_to_add
      wallet.save()
  ```

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Khuyên dùng biến lock toàn cục trong Python (ví dụ `threading.Lock()`), quên mất rằng Django production chạy đa tiến trình (Gunicorn workers) hoặc đa container.
- Không nhận diện được race condition vì nghĩ rằng cơ sở dữ liệu luôn tự động khóa mọi câu lệnh `get()`.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Không thấy được race condition; cho rằng code đã ổn vì có ORM.
- **Competent:** Chỉ ra được hiện tượng Lost Update; đề xuất dùng `select_for_update()` hoặc biểu thức `F()`.
- **Proficient:** Phân tích sự khác biệt về hiệu năng và nguy cơ Deadlock giữa Khóa bi quan và Cập nhật nguyên tử `F()`.
- **Advanced:** Thiết lập bảng kiểm toán giao dịch (Ledger Entry Pattern - chỉ thêm dòng nhật ký số dư, không cộng dồn trực tiếp) để bảo đảm tính kiểm toán tài chính tuyệt đối.

---

## Kịch Bản 4: Chiến Lược Kiểm Thử Khiếm Khuyết (Inadequate Test Strategy)

### 1. Mô Tả Tình Huống (Scenario)
Một nhóm nộp mã nguồn cho một module thanh toán tiền tips cho nhân viên phục vụ với báo cáo: *"Test coverage đạt 100% dòng lệnh (line coverage)"*. Khi thanh tra tệp test, phát hiện đoạn mã:
```python
def test_tip_calculation():
    service = TipService()
    # Chạy qua toàn bộ code của service
    result = service.process_tip(order_id=1, tip_amount=50000, staff_id=12)
    assert result is not None
```
Toàn bộ các test cases khác đều chỉ kiểm tra `assert result is not None` hoặc `assert response.status_code == 200`.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Đánh giá chất lượng của bộ kiểm thử này. Chỉ ra ảo tưởng về chỉ số coverage 100%, phân tích các lỗ hổng ranh giới chưa được kiểm tra, và thiết kế lại chiến lược kiểm thử chuẩn mực theo `ERPF-SE-SKILL-004`.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Nhận diện **Ảo tưởng kiểm thử rỗng (Empty Assertion / Hollow Coverage Trap)**: Chạy qua tất cả các dòng lệnh nhưng không hề kiểm tra tính đúng đắn của bất biến nghiệp vụ. Nếu sửa logic tính tiền thành `balance = balance - 0`, test vẫn báo xanh 100%!
2. Phân tích các ranh giới tin cậy (Trust Boundaries) bị bỏ sót hoàn toàn:
   - Số tiền tip âm (`tip_amount = -50000` $\rightarrow$ rút trộm tiền của nhân viên).
   - Số tiền tip vượt quá số dư tài khoản.
   - Nhân viên `staff_id` không thuộc quán cà phê đó (IDOR security flaw).
   - Xử lý đồng thời 2 lệnh tip cho cùng một đơn hàng.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Đưa ra kiểm thử đột biến (Mutation Testing) chứng minh bộ test hiện tại hoàn toàn vô giá trị.
- Thiết kế lại ma trận kiểm thử ranh giới tin cậy: Kiểm tra giá trị biên (0, min, max, số âm), kiểm tra trạng thái bất biến cơ sở dữ liệu sau khi tip (số dư tài khoản trừ đúng số tiền, nhân viên nhận đúng số tiền), và kiểm tra bắt buộc phải rollback khi lỗi.

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Cho rằng test coverage 100% là đủ tiêu chuẩn để release.
- Chỉ yêu cầu thêm assert kiểu dữ liệu (`assert isinstance(result, dict)`) mà không kiểm tra giá trị nghiệp vụ.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Khen ngợi chỉ số 100% coverage; chỉ đề xuất thêm 1 test case đơn giản.
- **Competent:** Chỉ ra lỗi thiếu assertion thực chất; yêu cầu kiểm tra số dư và trạng thái DB.
- **Proficient:** Thiết kế đầy đủ ma trận Trust Boundary bao gồm cả các trường hợp tiêu cực (Negative tests: số âm, nhân viên giả, concurrency).
- **Advanced:** Đề xuất đưa công cụ Mutation Testing (`mutmut`) vào CI pipeline để ngăn chặn vĩnh viễn hiện tượng assert-less tests trong tổ chức.

---

## Kịch Bản 5: Thực Nghiệm Học Máy Bị Nhiễu Biến (Confounded ML Experiment)

### 1. Mô Tả Tình Huống (Scenario)
Một nhóm nghiên cứu AI thử nghiệm một hàm mất mát mới $\mathcal{L}_{\text{focal-contrast}}$ nhằm cải thiện khả năng phân loại ảnh cà phê bị nhòe. Báo cáo thực nghiệm ghi nhận:
- *Baseline (ResNet50 + Cross-Entropy):* Accuracy = 76.2% (Huấn luyện với SGD, lr = 0.01, batch size = 32, 50 epochs).
- *Mô hình đề xuất (ResNet50 + $\mathcal{L}_{\text{focal-contrast}}$):* Accuracy = 83.5% (Huấn luyện với AdamW, lr = 0.0003, batch size = 128, bổ sung Cosine Annealing scheduler và MixUp augmentation, 150 epochs).
Nhóm khẳng định: *"Hàm mất mát $\mathcal{L}_{\text{focal-contrast}}$ vượt trội hơn Cross-Entropy 7.3% và sẵn sàng viết bài báo khoa học"*.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Phân tích tính hợp lệ khoa học của kết luận trên. Chỉ ra tất cả các biến gây nhiễu (Confounding Variables), giải thích vì sao kết luận không có giá trị thực chứng, và thiết kế lại thực nghiệm đối chứng công bằng theo `ERPF-AI-SKILL-003`.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Nhận diện lỗi **Thực nghiệm bị nhiễu biến nghiêm trọng (Severely Confounded Experiment)**: Có tới 6 biến số bị thay đổi đồng thời giữa baseline và mô hình đề xuất:
   - Optimizer (SGD vs AdamW).
   - Learning rate schedule (Fixed vs Cosine Annealing).
   - Batch size (32 vs 128).
   - Data Augmentation (Không có vs MixUp - MixUp một mình có thể tăng 3-5% accuracy!).
   - Thời gian huấn luyện (50 epochs vs 150 epochs - gấp 3 lần compute!).
2. Không thể quy kết mức tăng 7.3% cho hàm mất mát $\mathcal{L}_{\text{focal-contrast}}$. Rất có thể chính MixUp và Cosine scheduler đã tạo ra toàn bộ mức tăng này, trong khi hàm mất mát mới thậm chí có thể làm giảm hiệu năng!

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Hủy bỏ tuyên bố tính mới.
- Thiết lập **Hợp đồng đối chứng công bằng (Fair Comparison Contract)**: Giữ nguyên 100% các biến kiểm soát (AdamW, Cosine schedule, MixUp, 150 epochs, batch size 128) cho CẢ HAI mô hình, chỉ thay đổi duy nhất một biến độc lập là hàm mất mát. Chạy trên ít nhất 3 random seeds.

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Thừa nhận kết quả 83.5% là ấn tượng và khuyên viết bài báo ngay.
- Chỉ đề xuất tăng thêm epochs cho baseline mà không chuẩn hóa lại optimizer và augmentation.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Không nhận ra các biến gây nhiễu; cho rằng mô hình đạt 83.5% là phương pháp mới thành công.
- **Competent:** Liệt kê được các biến gây nhiễu (MixUp, Optimizer, Epochs); yêu cầu chạy lại baseline với cùng điều kiện.
- **Proficient:** Phân tích cơ chế đóng góp của từng biến gây nhiễu, thiết kế lại bảng đối chứng công bằng kèm phân tích bóc tách riêng cho MixUp.
- **Advanced:** Xây dựng quy trình kiểm soát thực nghiệm tự động trong MLOps, cấm ghi nhận kết quả so sánh nếu không khớp cấu hình bất biến.

---

## Kịch Bản 6: So Sánh Mô Hình Thiếu Công Bằng (Unfair Model Comparison)

### 1. Mô Tả Tình Huống (Scenario)
Một kỹ sư AI đề xuất thay thế mô hình gợi ý quán cà phê hiện tại bằng một kiến trúc mạng nơ-ron Transformer đồ thị (Graph Transformer). Trong báo cáo benchmark:
- *Mô hình hiện tại (Matrix Factorization):* Chạy bằng thư viện mã nguồn mở với tham số mặc định (default hyperparameters), đạt Recall@10 = 54.2%.
- *Mô hình Graph Transformer đề xuất:* Trải qua 100 lượt quét siêu tham số bằng Bayesian Optimization, sử dụng máy chủ 4x GPU A100, đạt Recall@10 = 61.0%.
Kỹ sư kết luận: *"Mô hình Graph Transformer vượt trội hoàn toàn và cần được thay thế ngay trên production"*.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Đánh giá tính công bằng và tính khả thi vận hành của đề xuất. Phân tích sự bất đối xứng về chi phí tính toán, độ trễ phục vụ (serving latency), và mức độ tinh chỉnh siêu tham số.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. **Bất đối xứng về mức độ tinh chỉnh (Tuning Asymmetry / Strawman Baseline):** So sánh một mô hình baseline chưa được tune với một mô hình mới được quét 100 lần Optuna. Nhiều nghiên cứu khoa học uy tín đã chứng minh: Matrix Factorization khi được tune kỹ thường đạt hiệu năng ngang ngửa hoặc vượt trội các mô hình đồ thị phức tạp trên dữ liệu thực tế!
2. **Bất đối xứng về chi phí vận hành & Độ trễ (Serving Latency & Compute Budget):**
   - Matrix Factorization có thể suy luận trong $< 1\text{ms}$ bằng phép nhân vector đơn giản.
   - Graph Transformer yêu cầu dựng đồ thị lân cận (k-hop neighbor sampling), độ trễ suy luận có thể lên tới $80\text{ms}$, đòi hỏi hạ tầng GPU đắt đỏ trên production.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Yêu cầu cấp ngân sách 100 lượt tinh chỉnh siêu tham số cho Matrix Factorization trước khi so sánh.
- Yêu cầu bổ sung bảng đo lường chi phí phục vụ: Độ trễ P95 (ms), lượng RAM/GPU tiêu thụ, và chi phí hạ tầng hàng tháng ($/tháng) vào ma trận đánh đổi.

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Chấp nhận kết quả chỉ vì đồ thị Transformer "nghe hiện đại và phức tạp hơn".
- Bỏ qua yếu tố chi phí vận hành và độ trễ phục vụ khi đưa ra quyết định kiến trúc sản phẩm.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Chấp nhận đề xuất ngay vì Recall@10 tăng từ 54% lên 61%.
- **Competent:** Chỉ ra sự bất công khi không tune baseline; yêu cầu đo độ trễ suy luận.
- **Proficient:** Phân tích toàn diện sự đánh đổi giữa lợi ích nghiệp vụ (+6.8% Recall) và chi phí hạ tầng khổng lồ (GPU inference server, cold-start latency).
- **Advanced:** Đề xuất mô hình hai tầng (Two-Stage Recommendation): Dùng Matrix Factorization ở tầng Retrieval (nhanh, rẻ) và chỉ dùng Graph Model nhỏ ở tầng Re-ranking top 50 ứng viên.

---

## Kịch Bản 7: Tuyên Bố Tính Mới Không Có Căn Cứ (Unsupported Novelty Claim)

### 1. Mô Tả Tình Huống (Scenario)
Một bản thảo bài báo nộp nội bộ tuyên bố: *"Chúng tôi đề xuất một hàm mất mát cách mạng hoàn toàn mới gọi là Dynamic Temperature Margin Loss (DTML) giúp giải quyết triệt để vấn đề mất cân bằng dữ liệu trong phân loại văn bản, vượt trội hơn tất cả các phương pháp trong lịch sử"*. Khi kiểm tra công thức toán học, phát hiện:
$$\mathcal{L}_{\text{DTML}} = -\log \frac{\exp(z_i / \tau_t)}{\sum_j \exp(z_j / \tau_t)} \quad \text{với } \tau_t = \tau_0 \cdot \gamma^t$$
Thực chất đây chỉ là hàm Softmax tiêu chuẩn với tham số nhiệt độ $\tau$ giảm dần theo thời gian (Temperature Annealing) — một kỹ thuật đã được sử dụng rộng rãi từ thập niên 1990 trong Simulated Annealing và Knowledge Distillation.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Đóng vai trò là Reviewer theo chuẩn `ERPF-AI-SKILL-007`. Viết bản phản biện học thuật khách quan, bóc trần sự thổi phồng tính mới (Overclaiming), chỉ ra tài liệu tiền đề, và hướng dẫn tác giả định vị lại công trình một cách trung thực.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. Nhận diện hành vi **Thổi phồng tính mới và dùng từ ngữ cường điệu (Hype & Overclaiming)**: Dùng từ "cách mạng", "giải quyết triệt để" vi phạm chuẩn mực liêm chính học thuật (`ERPF-CORE-PRIN-001`).
2. Nhận diện sự thiếu vắng tính mới về mặt cơ chế (Lack of Algorithmic Novelty): Kỹ thuật giảm nhiệt độ $\tau$ là kiến thức nền tảng trong Knowledge Distillation (Hinton et al., 2015) và Boltzmann exploration.
3. Hướng dẫn định vị lại (Reframing): Tác giả không thể tuyên bố phát minh ra cơ chế này. Giá trị của bài báo (nếu có) phải nằm ở **phân tích thực nghiệm sâu sắc về tác động của lịch trình giảm nhiệt độ đối với hiện tượng sụp đổ biểu diễn trong dữ liệu lệch nhãn**, chứ không phải tuyên bố tính mới về mặt thuật toán.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Đưa ra nhận xét Reject/Major Revision lịch thiệp, trích dẫn chính xác các công trình tiền đề về temperature annealing.
- Yêu cầu gỡ bỏ toàn bộ từ ngữ thổi phồng; bổ sung nghiên cứu bóc tách so sánh các lịch trình giảm nhiệt độ khác nhau (Linear vs Exponential vs Cosine).

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Viết nhận xét mỉa mai, công kích cá nhân tác giả.
- Bị đánh lừa bởi tên gọi mới ("DTML") và thừa nhận đây là phát minh mới.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Tin rằng đây là thuật toán mới và đồng ý cho xuất bản.
- **Competent:** Nhận ra temperature annealing đã có từ trước; yêu cầu trích dẫn các bài báo cũ.
- **Proficient:** Phân tích chính xác ranh giới giữa cải tiến kỹ thuật nhỏ và đóng góp khoa học; yêu cầu lập ma trận Claims-to-Evidence gỡ bỏ toàn bộ overclaiming.
- **Advanced:** Hướng dẫn tác giả chuyển hướng bài báo thành dạng Empirical Analysis Paper, tập trung giá trị vào việc đo lường độ bất định và calibration của mô hình khi thay đổi nhiệt độ.

---

## Kịch Bản 8: Khiếm Khuyết Khả Năng Tái Lập Thực Nghiệm (Incomplete Reproducibility)

### 1. Mô Tả Tình Huống (Scenario)
Một nhóm nghiên cứu cung cấp kho mã nguồn kèm bài báo để chuẩn bị nộp hội nghị NeurIPS. Khi kiểm toán mã nguồn độc lập trong môi trường máy chủ sạch (Clean Sandbox):
1. Tệp `requirements.txt` chứa các dòng không cố định phiên bản: `torch`, `transformers`, `scikit-learn`.
2. Trong mã nguồn huấn luyện xuất hiện dòng: `DATA_DIR = "/home/user/my_experiments/data_v2_final/"`.
3. Khi chạy lại lệnh huấn luyện trên máy có GPU cùng loại, kết quả Accuracy dao động từ 74.1% đến 81.3% qua 3 lần chạy liên tiếp (trong khi bài báo ghi cố định một con số 81.2%).
4. Kiểm tra mã nguồn phát hiện không có bất kỳ lệnh thiết lập random seed nào cho PyTorch hay CUDA.

### 2. Nhiệm Vụ Của Ứng Viên (Candidate Task)
Tiến hành kiểm toán khả năng tái lập theo tiêu chuẩn NeurIPS Reproducibility Checklist (`ERPF-AI-SKILL-007`). Liệt kê toàn bộ các lỗi chí mạng khiến công trình không thể tái lập, và xây dựng danh mục các bước khắc phục bắt buộc.

### 3. Chuỗi Lập Luận Kỳ Vọng (Expected Reasoning)
1. **Lỗi 1 (Môi trường không xác định):** `requirements.txt` không cố định phiên bản (unpinned dependencies) sẽ khiến mã nguồn bị gãy khi các thư viện cập nhật phiên bản mới làm thay đổi API hoặc hành vi mặc định của thuật toán.
2. **Lỗi 2 (Đường dẫn tuyệt đối cục bộ):** Hardcoded absolute path khiến không ai ngoài tác giả có thể chạy được code nếu không sửa mã nguồn.
3. **Lỗi 3 (Thiếu kiểm soát ngẫu nhiên):** Không cố định seed khiến kết quả dao động tới 7.2% giữa các lần chạy. Con số 81.2% trong bài báo thực chất chỉ là một lần chạy may mắn (cherry-picked outlier run), vi phạm nghiêm trọng tính trung thực khoa học.

### 4. Phương Án Xử Lý Chấp Nhận Được (Acceptable Approaches)
- Đánh giá: **Không đạt chuẩn kiểm toán tái lập (Reproducibility Audit FAILED)**.
- Kế hoạch khắc phục:
  1. Xuất tệp `environment.yml` hoặc `requirements.txt` có cố định phiên bản chính xác (ví dụ `torch==2.3.1`).
  2. Sử dụng tham số dòng lệnh `argparse` hoặc biến môi trường cho đường dẫn dữ liệu.
  3. Bổ sung hàm thiết lập seed toàn diện (`random`, `numpy`, `torch`, `torch.cuda`) và bật cờ `use_deterministic_algorithms`.
  4. Chạy lại tối thiểu 5 seeds và cập nhật bài báo dưới dạng $\text{mean} \pm \text{std}$ (ví dụ: $77.8 \pm 2.4\%$), chấp nhận công bố con số thực tế trung thực.

### 5. Sai Lầm Phổ Biến Cần Tránh (Common Mistakes)
- Cho rằng "code chạy được trên máy tác giả là đủ điều kiện tái lập".
- Bỏ qua biến động 7% và giữ nguyên con số 81.2% trong bài báo.

### 6. Tiêu Chí Đánh Giá Năng Lực (Evaluation Rubric)
- **Developing:** Chỉ thấy lỗi đường dẫn tuyệt đối; bỏ qua vấn đề phiên bản thư viện và hạt giống ngẫu nhiên.
- **Competent:** Chỉ ra đầy đủ 4 lỗi; yêu cầu cố định seed và phiên bản thư viện.
- **Proficient:** Nhận diện việc con số trong bài báo là cherry-picked outlier; yêu cầu bắt buộc phải báo cáo trung bình và độ lệch chuẩn của 5 seeds.
- **Advanced:** Xây dựng script `reproduce.sh` và Dockerfile khép kín, thiết lập kiểm toán CI tự động chạy lại kết quả trước khi nộp bài.
