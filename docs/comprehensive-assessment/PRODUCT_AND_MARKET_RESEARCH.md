# Product & Market Research

Date: 2026-10-31. Sources: web research (search results cited in RESEARCH_REFERENCES.md).

## Product problem
Người dùng khám phá địa điểm qua Google Maps (dữ liệu danh bạ + review sao, ảnh quảng cáo/outdated, review farm), TripAdvisor (du lịch, thương mại hóa), TikTok/Instagram (video ngắn, không có địa điểm có cấu trúc, khó lọc theo nhu cầu). **Khoảng trống**: tìm địa điểm theo *trải nghiệm mong muốn* ("chỗ yên tĩnh có cây xanh", "view biển ngắm hoàng hôn") — không nền tảng nào giải quyết tốt bằng dữ liệu có cấu trúc.

Research finding (Google Maps weaknesses, 2025): review manipulation, ảnh outdated/AI-generated, thiếu verification ngữ cảnh — xác nhận pain point Visual Truth có thật.

## Target users & JTBD
1. **Người khám phá địa phương (18–35)** — JTBD: "khi tôi muốn đi chơi cuối tuần, giúp tôi tìm chỗ phù hợp mood/nhu cầu mà không phải đọc 50 review".
2. **Du khách** — JTBD: "giúp tôi tìm trải nghiệm local chân thực, không phải trap du lịch".
3. **Người sáng tạo nội dung** — JTBD: "giúp tôi tìm địa điểm đẹp để chụp".

## Competitor analysis
| Product | Target users | Core value | Discovery | Community | Weakness / Opportunity |
|---|---|---|---|---|---|
| Google Maps | Toàn cầu | Đầy đủ POI + navigation | Text search, category | Review + photo (Local Guides) | Ảnh quảng cáo/outdated; không lọc theo trải nghiệm |
| TripAdvisor | Du khách | Review chi tiết | Ranking, filter | Review + photo | Thương mại hóa, bias |
| TikTok/IG Reels | Gen Z | Cảm hứng video | Algorithm feed | Creator content | Không có cấu trúc địa điểm |
| Pinterest | Planner | Visual inspiration | Board, search | Pin | Không gắn địa điểm cụ thể |
| **Rendez** | Local + du khách | Ảnh thực địa + attribute discovery | Feed + map + attribute filter | Photo submission | **Cold-start; cần proof of demand** |

## Differentiation — 3 positioning options
1. **"Visual Truth layer cho local discovery"** — ảnh thực địa chuẩn hóa, không quảng cáo. Khó sao chép: pipeline + moderation. Rủi ro: cần mật độ ảnh.
2. **"Attribute-based place search"** — tìm theo đặc tính quan sát được (cây xanh, ổ cắm, view). Khó sao chép: dữ liệu PhotoAttribute.
3. **"Community photo atlas của một thành phố"** — archive ảnh địa điểm theo thời gian. Khó sao chép: dữ liệu lịch sử tích lũy.

**Khuyến nghị**: kết hợp 1+2 cho MVP; 3 là long-term.

## MVP scope
- Một thành phố (Đà Nẵng). 50–100 places có ảnh thật. Taxonomy 5–8 category. Feed + search + map + attribute filter + save + submit. Không: booking, review văn bản, chat, recommendation engine.

## Câu hỏi mở (Decision Pending)
- Ai là người dùng đầu tiên? (cần user interview, không thể quyết từ nghiên cứu bàn)
- Mô hình khuyến khích đóng góp? (nghiên cứu UGC: intrinsic + recognition tốt hơn tiền — crowding-out effect)
