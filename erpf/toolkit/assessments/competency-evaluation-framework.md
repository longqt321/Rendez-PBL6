---
id: "ERPF-TOOL-ASSESS-001"
title: "Khung Ma Trận Đánh Giá Năng Lực Chuyên Môn Kỹ Thuật & Nghiên Cứu (Competency Evaluation Framework)"
version: "1.0.0"
category: "TOOL"
track: "CORE"
concept_type: "ASSESS"
intended_audience:
  - "Engineering Leads"
  - "Principal Researchers"
  - "Technical Mentors"
  - "AI Coding & Research Agents"
prerequisites:
  - "ERPF/foundation/competencies.md"
  - "ERPF/toolkit/assessments/index.md"
related_concepts:
  - "ERPF-CORE-COMP-001"
  - "ERPF-TOOL-ASSESS-000"
  - "ERPF-TOOL-ASSESS-002"
applicable_contexts:
  - "Đánh giá định kỳ năng lực kỹ sư phần mềm và nhà nghiên cứu AI"
  - "Thẩm định mức độ tự chủ của AI Coding Agents trước khi trao quyền tự động hóa"
  - "Xác định khoảng trống năng lực để thiết kế lộ trình đào tạo chuyên sâu"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "assessment"
  - "competency-matrix"
  - "behavioral-indicators"
  - "performance-levels"
---

# Khung Ma Trận Đánh Giá Năng Lực Chuyên Môn Kỹ Thuật & Nghiên Cứu
# Professional Competency Evaluation Matrix

---

## 1. Phân Hệ Năng Lực Dùng Chung (Shared Professional Competencies)

### Năng Lực 1: Định Hình & Phân Rã Bài Toán (Problem Formulation and Decomposition)
*Ánh xạ: `ERPF-CORE-COMP-001` & `ERPF-CORE-SKILL-001`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Chấp nhận yêu cầu mơ hồ và bắt tay vào viết mã ngay; lẫn lộn giữa triệu chứng bề mặt và giải pháp; không phân định được ranh giới công việc khiến scope bị phình to liên tục. |
| **Competent** | Biết đặt câu hỏi làm rõ yêu cầu; áp dụng khung 5W2H để bóc tách bài toán; liệt kê được ít nhất 2 mục Non-Goals và xây dựng tiêu chí nghiệm thu nhị phân (Pass/Fail). |
| **Proficient** | Tự chủ phân rã các bài toán lớn, đa miền thành các module độc lập; nhận diện chính xác các bất biến hệ thống; thiết lập tiêu chí Given-When-Then lượng hóa rõ ràng trước khi triển khai. |
| **Advanced** | Tái định hình các bài toán tưởng chừng bế tắc thành các bài toán đơn giản hơn; phát hiện sớm các mâu thuẫn nghiệp vụ tiềm ẩn; định hình chuẩn mực phân rã yêu cầu cho toàn tổ chức. |

---

### Năng Lực 2: Lập Luận Phản Biện & Đánh Giá Kỹ Thuật (Critical Evaluation & Falsifiability)
*Ánh xạ: `ERPF-CORE-COMP-003` & `ERPF-CORE-SKILL-002`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Dễ dàng tin vào các tuyên bố lý tưởng ("thư viện này không có lỗi"); đánh giá giải pháp dựa trên cảm tính hoặc sự phổ biến; không đặt câu hỏi về các giả định ngầm. |
| **Competent** | Biết nghi ngờ các giải pháp "không có nhược điểm"; kiểm tra tính khả bác của các giả định; thực hiện phân tích rủi ro trước (Pre-Mortem) ở mức cơ bản; yêu cầu dẫn chứng dữ liệu. |
| **Proficient** | Chủ động săn tìm các điểm mù kiến trúc; bóc tách chuỗi suy luận nhân quả; thiết kế các bài kiểm thử phản nghiệm (Falsification probes) có thể chứng minh giải pháp là sai; xây dựng kế hoạch rút lui an toàn. |
| **Advanced** | Đóng vai trò Red Team xuất sắc; phát hiện các lỗ hổng hệ thống tinh vi nhất trước khi xảy ra sự cố; nuôi dưỡng văn hóa phản biện trung thực trí tuệ trong toàn bộ đội ngũ. |

---

### Năng Lực 3: Ra Quyết Định Kỹ Thuật Dựa Trên Bằng Chứng (Evidence-Based Decision-Making)
*Ánh xạ: `ERPF-CORE-COMP-005` & `ERPF-CORE-SKILL-003`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Quyết định dựa trên thói quen cá nhân hoặc xu hướng nhất thời (Resume-Driven Development); không lập ma trận so sánh; giấu giếm các nhược điểm của phương án mình thích. |
| **Competent** | Phân loại được quyết định cửa một chiều (One-Way) vs hai chiều (Two-Way); so sánh ít nhất 2 phương án cạnh tranh trên các tiêu chí khách quan; viết tài liệu ADR ghi nhận quyết định. |
| **Proficient** | Xây dựng ma trận đánh đổi có trọng số chuẩn xác; tự chạy spike đo lường thực chứng để lấy số liệu thay vì tranh cãi lý thuyết; minh bạch hóa toàn bộ nợ kỹ thuật chấp nhận đánh đổi. |
| **Advanced** | Ra các quyết định kiến trúc chiến lược ảnh hưởng dài hạn; tối ưu hóa tổng thể chi phí vòng đời hệ thống; biết khi nào nên dừng tranh cãi để hành động (Disagree and Commit). |

---

## 2. Phân Hệ Năng Lực Kỹ Thuật Phần Mềm (Software Engineering Competencies)

### Năng Lực 4: Thiết Kế Mô-đun Sâu & Ranh Giới Kiến Trúc (Deep Module & Architecture Design)
*Ánh xạ: `ERPF-SE-DOM-003`, `DOM-004` & `ERPF-SE-SKILL-002`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Tạo ra các lớp mỏng (Shallow Classes) chỉ truyền dữ liệu qua lại; để lộ cấu trúc cơ sở dữ liệu và chi tiết cài đặt ra tầng gọi; tạo ra các phụ thuộc vòng (Circular Dependencies). |
| **Competent** | Thiết kế được các mô-đun với interface gọn gàng và logic nghiệp vụ được đóng gói bên trong; tuân thủ cấu trúc phân tầng Clean Monolith; cô lập truy vấn dữ liệu qua Selectors. |
| **Proficient** | Thiết kế các mô-đun sâu (Deep Modules) mang lại đòn bẩy cao (giao diện cực nhỏ nhưng che giấu nghiệp vụ phức tạp); quản lý chặt chẽ bán kính nổ; tạo ra các seam kiểm thử in-memory dễ dàng. |
| **Advanced** | Định hình kiến trúc tổng thể của hệ thống lớn; duy trì tính toàn vẹn của DDD bounded contexts qua nhiều năm phát triển; đơn giản hóa kiến trúc phức tạp thành các khối mạch lạc. |

---

### Năng Lực 5: Gỡ Lỗi Khoa Học & Khắc Phục Nguyên Nhân Gốc (Debugging & Root Cause Analysis)
*Ánh xạ: `ERPF-SE-DOM-011` & `ERPF-SE-SKILL-003`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Thử sửa mã ngẫu nhiên (Shotgun debugging); thêm các câu lệnh `if obj is not None` hoặc bọc `try-catch` im lặng để dập tắt lỗi bề mặt; làm tha hóa dữ liệu ngầm trong cơ sở dữ liệu. |
| **Competent** | Tái lập lỗi bằng kịch bản cụ thể; lần ngược stack trace từ điểm nổ về điểm xuất phát; cô lập biến bằng phương pháp nhị phân; viết regression test kiểm chứng bản vá trước khi đóng ticket. |
| **Proficient** | Áp dụng triệt để kỹ thuật 5 Whys đào sâu đến lỗ hổng bất biến hoặc thiếu sót trong giao dịch cơ sở dữ liệu; xây dựng Minimal Reproducible Example (MRE) độc lập; loại bỏ vĩnh viễn căn nguyên lỗi. |
| **Advanced** | Nhận diện các lớp lỗi hệ thống tinh vi (Race Conditions, Memory Leaks, Transaction Isolation Anomalies); biến sự cố phức tạp thành bài học kinh nghiệm và cải tiến công cụ giám sát toàn diện. |

---

### Năng Lực 6: Thiết Kế Chiến Lược Kiểm Thử (Testing Strategy & Boundary Invariants)
*Ánh xạ: `ERPF-SE-DOM-012` & `ERPF-SE-SKILL-004`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Viết kiểm thử chỉ để đạt chỉ số coverage (kiểm thử không có assertion); lạm dụng `time.sleep()`; phụ thuộc vào thứ tự chạy test khiến bộ test bị flaky liên tục. |
| **Competent** | Phân bổ kiểm thử theo mô hình kim tự tháp; tập trung kiểm thử giá trị biên tại Trust Boundary; sử dụng transaction rollback để cô lập dữ liệu; loại bỏ sleep và cố định thời gian. |
| **Proficient** | Thiết kế kiểm thử dựa trên trạng thái bất biến thay vì soi mói chi tiết cài đặt; sử dụng mutation testing để kiểm tra độ nhạy của bộ test; giữ cho test suite chạy nhanh dưới ngưỡng thời gian yêu cầu. |
| **Advanced** | Thiết lập chiến lược kiểm thử toàn diện cho hệ thống phân tán phức tạp; tối ưu hóa hạ tầng CI song song; xây dựng các bộ giả lập (Fakes) có độ trung thực cao phục vụ toàn bộ đội ngũ. |

---

## 3. Phân Hệ Năng Lực Nghiên Cứu Trí Tuệ Nhân Tạo (AI Research Competencies)

### Năng Lực 7: Khảo Sát Y Văn & Định Hình Giả Thuyết (Literature Synthesis & Hypotheses)
*Ánh xạ: `ERPF-AI-DOM-001`, `DOM-002`, `DOM-003` & `ERPF-AI-SKILL-001`, `SKILL-002`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Viết Related Work kiểu liệt kê danh sách tác giả rời rạc; dễ bị ảo giác trích dẫn; nhầm lẫn giữa khoảng trống nghiên cứu khoa học và cơ hội tinh chỉnh kỹ thuật tầm thường. |
| **Competent** | Khảo sát có hệ thống bằng kỹ thuật 3 lượt (Three-Pass); lập ma trận tổng hợp y văn 10 cột; định nghĩa rõ biến độc lập, phụ thuộc và kiểm soát; thiết lập tiêu chuẩn bác bỏ Popper rõ ràng. |
| **Proficient** | Phân cụm y văn sắc sảo theo cơ chế toán học/phương pháp luận; chỉ ra các giả định ngầm của các công trình đi trước; xây dựng giả thuyết nhân quả có điều kiện biên dự báo trước vùng thất bại. |
| **Advanced** | Nhìn thấy sự hội tụ hoặc giao thoa giữa các ngành nghiên cứu khác nhau; mở ra các hướng tiếp cận khoa học mới có tính đột phá; thiết lập chuẩn mực liêm chính học thuật cho nhóm nghiên cứu. |

---

### Năng Lực 8: Thiết Kế Thực Nghiệm Kiểm Soát & Thẩm Định Thước Đo (Empirical Design & Evaluation)
*Ánh xạ: `ERPF-AI-DOM-012`, `DOM-021` & `ERPF-AI-SKILL-003`, `SKILL-004`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Báo cáo kết quả của 1 lần chạy may mắn duy nhất; để rò rỉ dữ liệu qua feature scaling trước khi split; so sánh với các baseline cũ chưa được tune; dùng Accuracy trên dữ liệu lệch nhãn. |
| **Competent** | Duy trì tường lửa phân tách dữ liệu tuyệt đối; chạy tối thiểu 3-5 random seeds; cân bằng dung lượng và ngân sách compute cho baselines; báo cáo khoảng tin cậy 95% Bootstrap CI. |
| **Proficient** | Lựa chọn thước đo phi đối xứng phản ánh chính xác bài toán; đánh giá theo lát cắt (Slice-based) để phát hiện nghịch lý Simpson; thực hiện kiểm toán attribution maps phát hiện học đường tắt (Clever Hans). |
| **Advanced** | Thiết kế các bộ benchmark chuẩn mực cho cộng đồng; chứng minh các lỗ hổng đo lường trong các thước đo truyền thống; xây dựng giao thức đánh giá khách quan được các hội nghị hàng đầu công nhận. |

---

### Năng Lực 9: Nghiên Cứu Bóc Tách & Kiểm Chứng Tái Lập (Ablation & Reproducibility Audit)
*Ánh xạ: `ERPF-AI-DOM-022`, `DOM-024` & `ERPF-AI-SKILL-005`, `SKILL-007`*

| Cấp Độ Năng Lực | Chỉ Báo Hành Vi Quan Sát Được Trong Công Việc Thực Tế |
| :--- | :--- |
| **Developing** | Nhồi nhét nhiều thành phần vào mô hình mà không bóc tách; giữ lại các module thừa thãi không đóng góp giá trị; mã nguồn chạy thực nghiệm phụ thuộc vào đường dẫn cục bộ và thiếu hạt giống. |
| **Competent** | Áp dụng giao thức Leave-One-Out bóc tách từng thành phần; bổ sung hàng đối chứng dung lượng (Capacity Control); đóng gói mã nguồn và môi trường đạt chuẩn NeurIPS Reproducibility Checklist. |
| **Proficient** | Đo lường chính xác hiệu ứng tương tác phi tuyến (Synergy); cắt tỉa các thành phần không mang lại giá trị; thực hiện kiểm toán độc lập trong sandbox chứng minh tái lập 100% số liệu bài báo. |
| **Advanced** | Phản biện sắc bén các công trình khoa học phức tạp; tách bạch lỗi chí mạng khỏi khiếm khuyết nhỏ; dẫn dắt việc xây dựng các công trình nghiên cứu mở, minh bạch và có khả năng nhân bản toàn cầu. |
