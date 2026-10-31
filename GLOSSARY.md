# Rendez Ubiquitous Language & Domain Model

Tài liệu thiết lập hệ thống ngôn ngữ nghiệp vụ chuẩn mực (Ubiquitous Language) của dự án Rendez, phân định rõ giữa khái niệm miền, thành phần kỹ thuật hỗ trợ và hiện trạng kiểm chứng trong mã nguồn.

---

## A. Nguyên Lý Định Hướng (Principles)

### 1. Visual Truth (Chân thực thị giác)
- **Loại:** Product Principle
- **Định nghĩa:** Cam kết sản phẩm rằng việc tìm kiếm không gian phải được xây dựng dựa trên hình ảnh thực tế phản ánh đúng không gian, chỗ ngồi, ánh sáng và tiện ích thực địa.
- **Tiêu chuẩn cấu thành:**
  - *Image Integrity:* Không sử dụng ảnh quảng cáo làm sai lệch bối cảnh thực tế, ảnh dựng 3D hoặc ảnh không chụp tại cơ sở.
  - *Aspect-Ratio Preservation:* Giữ nguyên tỷ lệ khung hình tự nhiên của ảnh trên lưới khám phá (Masonry Feed), không kéo giãn méo ảnh.
  - *Contextual Cropping Restriction:* Hạn chế cắt cúp cố định nếu việc cắt cúp làm mất bối cảnh tiện ích vật lý quan trọng của không gian.
- **Source References:** `PRODUCT.md` § Product Principles (Dòng 64)
- **Trạng thái:** **Documented Principle / Partially Enforced in UI**

### 2. Data Sovereignty & Local-First (Tự chủ dữ liệu bản địa)
- **Loại:** Architecture Principle / Non-Functional Requirement
- **Định nghĩa:** Mục tiêu kiến trúc hướng tới việc lưu trữ, làm chủ dữ liệu không gian, hình ảnh và tài nguyên bản đồ, ưu tiên phần mềm mã nguồn mở và hạn chế phụ thuộc vào các dịch vụ đám mây thương mại bên thứ ba.
- **Hiện trạng kiểm chứng thực tế:**
  - *Development Environment:* Sử dụng PostgreSQL/PostGIS local (Docker port 55433), media lưu tại `.local/media/`. (Verified)
  - *Production Infrastructure:* Chưa được cấu hình hoặc kiểm chứng trong repository. (Not Verified / Unknown)
  - *Map Rendering Engine:* Sử dụng MapLibre GL JS mã nguồn mở trên client. (Verified)
  - *Tile Source & Hosting:* Lớp dữ liệu đường phố là GeoJSON nội bộ (`/map/region.geojson`), nhưng lớp gạch raster nền hiện vẫn lấy trực tiếp từ dịch vụ ngoài của Esri (`server.arcgisonline.com`). (Verified - Partial Dependency)
- **Source References:** `PRODUCT.md` § Product Principles (Dòng 65); `frontend/public/map/style.json`
- **Trạng thái:** **Architecture Goal / Partially Implemented**

---

## B. Từ Điển Khái Niệm Miền (Domain Vocabulary)

### Nhóm 1: Địa Điểm & Không Gian (Places & Spaces)

#### `Place` (Địa điểm / Cơ sở)
- **Loại khái niệm:** Entity (Aggregate Root candidate)
- **Định nghĩa nghiệp vụ:** Cơ sở vật lý có thật ngoài đời thực (quán cà phê, không gian làm việc, trà quán) có vị trí địa lý xác định và mang những đặc trưng không gian cụ thể.
- **Phạm vi địa lý (Geographic Scope):**
  - *Current Product Scope:* Định hướng tập trung tại khu vực Đà Nẵng theo tài liệu sản phẩm (`PRODUCT.md`).
  - *Current Data Coverage:* Dữ liệu hạt giống thực tế đã kiểm chứng hiện chỉ bao phủ một phạm vi hẹp tại khu vực Liên Chiểu cũ (12 cơ sở trong `data/danang.json`, dữ liệu vector trong `region.geojson`); không đồng nhất tên gọi thành phố với độ phủ toàn bộ địa bàn sau các thay đổi địa giới hành chính.
  - *Future Geographic Expansion:* Chưa có quyết định chính thức.
- **Vòng đời & Trạng thái (As-Is):**
  - Trạng thái hiển thị (`Place.status`): bản nháp (`draft`), công khai (`published`), tạm ẩn (`hidden`).
  - Dấu mốc xóa mềm (`Place.deleted_at`): giá trị thời gian (`DateTimeField`, nullable) ghi nhận bản ghi đã bị xóa mềm ở tầng kỹ thuật; phân biệt độc lập với trường `status`. Không suy diễn cơ sở đã đóng cửa kinh doanh ngoài đời thực từ trường này. Hệ thống hiện **chưa có trạng thái `closed` hoặc `permanently_closed`** để biểu diễn việc đóng cửa kinh doanh.
- **Tính liên tục danh tính (Place Identity Continuity - Đề xuất):** Danh tính cơ sở được cấu thành từ Mặt bằng vật lý (Physical Location), Cơ sở kinh doanh (Business Identity) và Không gian thực tế (Visual Space). Khi cơ sở chuyển địa chỉ mới hoặc cơ sở mới tiếp quản mặt bằng, danh tính bị phá vỡ và một Place mới phải được khởi tạo.
- **As-Is Implementation Mapping:** Model `apps.places.models.Place`
- **Source References:** `backend/apps/places/models.py:23`; `PRODUCT.md` § Product Purpose
- **Trạng thái:** **Verified** (Model & Lifecycle) / **Proposed** (Identity Continuity)

#### `Category` (Loại địa điểm)
- **Loại khái niệm:** Entity
- **Định nghĩa nghiệp vụ:** Danh mục phân loại mô hình hoạt động cốt lõi của địa điểm (ví dụ: Cà phê, Trà, Không gian làm việc chung).
- **Mối quan hệ & Ràng buộc:** Mỗi `Place` bắt buộc phải tham chiếu tới đúng một `Category` thông qua `category = ForeignKey(Category, on_delete=PROTECT)` (DB constraint: `null=False`).
- **Lưu ý triển khai:** Ràng buộc "chỉ xuất bản Place khi Category đang hoạt động (`is_active = True`)" chỉ được kiểm tra ở tầng ứng dụng (`Place.clean()`), không phải là một SQL constraint ở tầng Database.
- **As-Is Implementation Mapping:** Model `apps.places.models.Category`
- **Source References:** `backend/apps/places/models.py:13, 42`
- **Trạng thái:** **Verified**

#### `OpeningHours` (Thông tin giờ mở cửa)
- **Loại khái niệm:** Domain Attribute Group / Potential Value Object
- **Định nghĩa nghiệp vụ:** Nhóm thông tin mô tả thời gian mở cửa đón khách của địa điểm, tồn tại song song ở hai biểu diễn: chuỗi mô tả tự nhiên (`opening_hours_text`) và đặc tả cấu trúc JSON theo từng ngày (`opening_hours_specification`).
- **As-Is Implementation Mapping:** Các trường `opening_hours_text`, `opening_hours_specification`, `opening_hours_source`, `opening_hours_verified_at` trên model `Place`.
- **Source References:** `backend/apps/places/models.py:48-60`
- **Trạng thái:** **Verified** (dưới dạng nhóm thuộc tính trên Place)

#### `District` (Địa bàn tìm kiếm)
- **Loại khái niệm:** Legacy District-name Tokens / Address Search Filter
- **Định nghĩa nghiệp vụ:** Các chuỗi định danh địa bàn quen thuộc (như Hải Châu, Sơn Trà, Ngũ Hành Sơn, Thanh Khê, Cẩm Lệ, Liên Chiểu, Hòa Vang) được lưu giữ trong dữ liệu địa chỉ và logic tìm kiếm để hỗ trợ người dùng lọc nhanh theo khu vực. Không định nghĩa các token này là các đơn vị hành chính cấp quận/huyện hiện hành.
- **As-Is Implementation Mapping:** Không phải Entity hay trường riêng trong DB. Được bóc tách từ chuỗi `Place.address` qua regex phía client (`extractDistrict` trong `discovery.tsx`) để tạo nhãn giao diện và hỗ trợ tham số lọc trên URL.
- **Source References:** `frontend/src/app/discovery.tsx:96`
- **Trạng thái:** **Verified** (Legacy Search Token Pattern)

---

### Nhóm 2: Thị Giác & Hình Ảnh (Visuals & Photos)

#### `Photo` (Ảnh tư liệu địa điểm)
- **Loại khái niệm:** Entity
- **Định nghĩa nghiệp vụ:** Bản ghi hình ảnh được liên kết với một địa điểm (`Place`) cụ thể, nhằm phục vụ việc biểu diễn thị giác về không gian, chỗ ngồi hoặc tiện ích của cơ sở. Định nghĩa này không mặc định mọi bản ghi ảnh trong hệ thống đều đã được thẩm định tính chân thực hay hợp lệ tuyệt đối ngoài đời thực.
- **Vòng đời & Trạng thái:** Model khai báo các trạng thái hiển thị (`PlacePhoto.status`): chờ công khai (`pending_publication`), công khai (`published`), và bị rút (`withdrawn`). Cần phân biệt các trạng thái được khai báo trong enum với các bước chuyển đổi vòng đời (lifecycle transitions) thực sự được triển khai trong mã nguồn (trong luồng submit hiện tại, ảnh được tạo và xuất bản thẳng ở trạng thái `published`).
- **Quan hệ Cardinality:** Mỗi `Photo` liên kết $1-1$ với một `PhotoAsset` tương ứng (`PlacePhoto.asset` là `OneToOneField` với `on_delete=PROTECT`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.PlacePhoto` (Backend) / Interface `PublicPhoto`, `PhotoDetail` (Frontend).
- **Source References:** `backend/apps/photos/models.py:168`; `frontend/src/lib/api/visual.ts:5`
- **Trạng thái:** **Verified**

#### `Withdrawn Photo` (Ảnh bị rút)
- **Loại khái niệm:** Lifecycle State của Photo
- **Định nghĩa nghiệp vụ:** Trạng thái của một ảnh bị gỡ khỏi toàn bộ các hiển thị công khai do phát hiện sai lệch thông tin, vi phạm bản quyền, vi phạm quyền riêng tư hoặc theo yêu cầu kiểm duyệt. Khi bị rút, cờ ảnh đại diện bắt buộc bị hủy (`is_cover = False`).
- **As-Is Implementation Mapping:** `PlacePhoto.status == "withdrawn"` và `PlacePhoto.withdrawn_at IS NOT NULL`.
- **Source References:** `backend/apps/photos/models.py:179, 196`
- **Trạng thái:** **Verified**

#### `Archived Photo` (Ảnh tư liệu lịch sử)
- **Loại khái niệm:** Agreed Domain Concept / Unimplemented Lifecycle State
- **Định nghĩa nghiệp vụ:** Khái niệm nghiệp vụ đã được thống nhất: ảnh tư liệu chụp không gian trong quá khứ, hoàn toàn trung thực nhưng không còn phản ánh đúng kiến trúc/nội thất hiện tại của quán sau đợt cải tạo. Ảnh được giữ lại làm tư liệu dòng thời gian, tách khỏi Feed khám phá tức thời.
- **Tình trạng triển khai kỹ thuật:** Trạng thái cơ sở dữ liệu, các bước chuyển đổi vòng đời (lifecycle transitions) và giao diện hiển thị cho khái niệm này **chưa được triển khai trong hệ thống As-Is**. Chỉ các quyết định về quy tắc chuyển đổi cụ thể và hình thức hiển thị giao diện (timeline/lịch sử) là đang chờ quyết định (Decision Pending).
- **Trạng thái:** **Accepted Domain Concept / Unimplemented State & UI (Decision Pending #3)**

#### `VisualAttribute` (Đặc tính thị giác)
- **Loại khái niệm:** Entity (Catalog)
- **Định nghĩa nghiệp vụ:** Danh mục chuẩn hóa các đặc điểm tiện ích hoặc tính chất không gian có thể quan sát trực tiếp bằng mắt thông qua ảnh chụp thực tế (ví dụ: Bàn học & Ổ cắm, Trong nhà & Máy lạnh, Cây xanh & Vườn).
- **As-Is Implementation Mapping:** Model `apps.photos.models.VisualAttribute`
- **Source References:** `backend/apps/photos/models.py:7`
- **Trạng thái:** **Verified**

#### `PhotoAttribute` (Liên kết gán đặc tính)
- **Loại khái niệm:** Associative Entity
- **Định nghĩa nghiệp vụ:** Bản ghi liên kết gán giữa một `Photo` và một `VisualAttribute`. Mang metadata kiểm duyệt gồm: người duyệt (`reviewed_by`), thời điểm duyệt (`reviewed_at`) và nguồn thẩm định (`source = "manual"`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoAttribute`
- **Source References:** `backend/apps/photos/models.py:235`
- **Trạng thái:** **Verified**

#### `PhotoAsset` (Tệp tư liệu nhị phân)
- **Loại khái niệm:** Technical Supporting Entity
- **Định nghĩa nghiệp vụ:** Thực thể kỹ thuật quản lý tệp nhị phân trên đĩa lưu trữ, gồm file lưu trữ sạch (`original` - trong luồng upload API hiện tại, tệp `original` là tệp đã qua pipeline chuẩn hóa ảnh `normalize_image`, được tái tạo từ dữ liệu pixel và loại bỏ EXIF cùng các metadata không được giữ lại trong quá trình xử lý, không phải file upload nguyên bản chưa qua xử lý), file phái sinh nén chuẩn hóa (`derivative`) và thông số kỹ thuật (`sha256`, `width`, `height`, `file_size`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoAsset`
- **Source References:** `backend/apps/photos/models.py:133`; `backend/apps/photos/images.py:10`
- **Trạng thái:** **Verified**

#### `PhotoAudit` (Nhật ký kiểm toán ảnh)
- **Loại khái niệm:** Audit Trail Entity
- **Định nghĩa nghiệp vụ:** Bản ghi lưu vết các hành động quản trị đối với ảnh phát sinh qua các hàm dịch vụ chuyên biệt (như thay đổi trạng thái công khai `change_publication`, gán/gỡ đặc tính `set_tags`), ghi nhận tác nhân thực hiện, hành động và payload trước/sau. Không bảo đảm ghi nhận các thao tác chỉnh sửa trực tiếp qua Django Admin hoặc ORM bỏ qua service.
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoAudit`
- **Source References:** `backend/apps/photos/models.py:246`; `backend/apps/photos/services.py:151`
- **Trạng thái:** **Verified**

---

### Nhóm 3: Đóng Góp Cộng Đồng & Tương Tác Xã Hội (Submissions & Social)

#### `PhotoSubmission` (Lượt đóng góp ảnh)
- **Loại khái niệm:** Entity (Aggregate Root candidate trong Contribution context)
- **Định nghĩa nghiệp vụ:** Lượt gửi từ 1 đến 5 ảnh thực tế của thành viên kèm cam kết bản quyền, hướng tới một địa điểm có sẵn hoặc đề xuất địa điểm mới. Giới hạn 1 đến 5 ảnh được kiểm tra ở tầng API Serializer (`PhotoUploadSerializer`); tầng Database chỉ chặn cận trên qua `sort_order <= 4`, không tự bảo đảm cận dưới tối thiểu 1 ảnh.
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoSubmission`
- **Hành vi thực tế mã nguồn:** Luồng API nộp ảnh hiện tại tự động gán `status = "approved"`, `published_at = now`, và gán `published_by = user` (submitting user) nhằm tạo ngay `PlacePhoto(status="published")`.
- **Source References:** `backend/apps/photos/models.py:53`; `backend/apps/photos/services.py:65`; `backend/apps/photos/serializers.py:239`
- **Trạng thái:** **Verified** (Schema & Service behavior) / **Decision Pending** (Định đoạt luồng kiểm duyệt To-Be)

#### `VenueProposal` (Đề xuất cơ sở mới)
- **Loại khái niệm:** Schema-defined / Not used by current submission flow / Decision Pending
- **Định nghĩa nghiệp vụ:** Bản ghi đề xuất một địa điểm mới khi người dùng nộp ảnh cho cơ sở chưa có trên hệ thống.
- **Thực tế mã nguồn:** Model tồn tại trong schema và migration, nhưng luồng API `submit()` hiện tại bỏ qua model này và tạo thẳng `Place(status="published")` (được xác thực bởi test `backend/tests/test_auto_publication.py`).
- **Source References:** `backend/apps/photos/models.py:21`; `backend/tests/test_auto_publication.py:59`
- **Trạng thái:** **Decision Pending**

#### `PhotoComment` (Bình luận ảnh)
- **Loại khái niệm:** Entity
- **Định nghĩa nghiệp vụ:** Ý kiến trao đổi dạng văn bản của thành viên dưới một bức ảnh cụ thể. Nội dung bình luận bắt buộc không được để trống (`photo_comment_non_empty_body`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoComment`
- **Source References:** `backend/apps/photos/models.py:328`
- **Trạng thái:** **Verified**

#### `PhotoLike` (Lượt thích ảnh)
- **Loại khái niệm:** Associative Entity
- **Định nghĩa nghiệp vụ:** Hành vi thành viên bày tỏ sự tán thưởng đối với một góc chụp không gian cụ thể. Ràng buộc mỗi tài khoản chỉ thích một ảnh tối đa một lần (`unique_photo_like`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.PhotoLike`
- **Source References:** `backend/apps/photos/models.py:339`
- **Trạng thái:** **Verified**

#### `SavedPlace` (Địa điểm đã lưu)
- **Loại khái niệm:** Associative Entity
- **Định nghĩa nghiệp vụ:** Hành vi thành viên lưu một địa điểm vào danh sách cá nhân để theo dõi và lên kế hoạch ghé thăm.
- **As-Is Implementation Mapping:** Model `apps.favorites.models.Favorite` (Backend) / UI hiển thị nhãn `Lưu` (`SaveButton`, trang `/saved`).
- **Source References:** `backend/apps/favorites/models.py:5`; `frontend/src/app/discovery.tsx:275`
- **Trạng thái:** **Verified** (Mapping giữa `Favorite` $\leftrightarrow$ `SavedPlace`)

#### `ContentReport` (Báo cáo vi phạm)
- **Loại khái niệm:** Entity
- **Định nghĩa nghiệp vụ:** Yêu cầu phản ánh vi phạm từ người dùng đối với một ảnh hoặc một địa điểm, kèm lý do (`wrong_place`, `privacy`, `copyright`, `unsafe`, `other`) và trạng thái giải quyết (`pending`, `resolved`).
- **As-Is Implementation Mapping:** Model `apps.photos.models.ContentReport`
- **Source References:** `backend/apps/photos/models.py:255`
- **Trạng thái:** **Verified**

---

### Nhóm 4: Tác Nhân & Vai Trò (Actors, Privileges & Personas)

#### `User` (Tài khoản định danh)
- **Loại khái niệm:** Identity Entity
- **Định nghĩa nghiệp vụ:** Tài khoản cá nhân định danh bằng địa chỉ email trên hệ thống Rendez. Đăng ký tài khoản không kèm theo bước xác thực quyền sở hữu hộp thư (no email verification flow).
- **As-Is Implementation Mapping:** Model `apps.accounts.models.User`
- **Source References:** `backend/apps/accounts/models.py:20`; `backend/apps/accounts/views.py:43`
- **Trạng thái:** **Verified**

#### `Staff` (Quyền quản trị hệ thống)
- **Loại khái niệm:** System Privilege
- **Định nghĩa nghiệp vụ:** Cờ kỹ thuật `User.is_staff = True`, cho phép tài khoản đăng nhập vào giao diện Django Admin (`/admin/`).
- **As-Is Implementation Mapping:** `User.is_staff`
- **Source References:** `backend/apps/accounts/models.py:16`
- **Trạng thái:** **Verified**

#### `Moderator` (Kiểm duyệt viên)
- **Loại khái niệm:** Business Capability / Role
- **Định nghĩa nghiệp vụ:** Tài khoản Staff được cấp quyền hạn nghiệp vụ cụ thể `photos.review_photosubmission`. Quyền này cho phép duyệt, gỡ ảnh và gán nhãn đặc tính thị giác qua view kiểm duyệt `admin:photos_review`. Quyền này không tự động bao gồm các quyền quản trị Place hay xử lý ContentReport.
- **As-Is Implementation Mapping:** Kiểm tra qua hàm `check_reviewer(user)`: `user.is_staff and user.has_perm("photos.review_photosubmission")`.
- **Source References:** `backend/apps/photos/services.py:28`
- **Trạng thái:** **Verified**

#### `Creator Profile` (Trang hồ sơ tác giả)
- **Loại khái niệm:** Technical Route / Profile View
- **Định nghĩa kỹ thuật:** Tuyến đường `/creators/:id` và giao diện hồ sơ hiển thị công khai gắn với bất kỳ tài khoản User nào đang hoạt động (`is_active = True`), thể hiện tên hiển thị, ngày tham gia và số lượng ảnh công khai (`photo_count`). Giao diện này có thể truy cập được ngay cả khi tài khoản có `photo_count = 0`.
- **As-Is Implementation Mapping:** View `apps.accounts.views.CreatorDetail` và `CreatorPhotos`.
- **Source References:** `backend/apps/accounts/views.py:170`; `frontend/src/app/creator.tsx`
- **Trạng thái:** **Verified**

#### `Creator` (Tác giả ảnh)
- **Loại khái niệm:** Intended Persona (Ý định sản phẩm)
- **Định nghĩa nghiệp vụ:** Hình mẫu người sáng tạo nội dung đóng góp hình ảnh thực tế trên Rendez. Ý định sản phẩm kỳ vọng đây là người đã có đóng góp ảnh thực sự, nhưng điều kiện kích hoạt này **chưa được code bảo đảm** (không có system role riêng và trang Creator Profile vẫn mở với tài khoản có 0 ảnh).
- **Trạng thái:** **Intended Persona / Not enforced by code**

#### `Photo Contributor` (Người nộp ảnh)
- **Loại khái niệm:** Attribution Metadata
- **Định nghĩa nghiệp vụ:** Thuộc tính ghi nhận tài khoản đã thực hiện gửi chùm ảnh đóng góp (`PhotoSubmission.submitted_by`), không mặc định đây là người trực tiếp bấm máy chụp hay người nắm giữ bản quyền tối hậu.
- **As-Is Implementation Mapping:** `PhotoSubmission.submitted_by` (ForeignKey tới `User`).
- **Source References:** `backend/apps/photos/models.py:54`
- **Trạng thái:** **Verified**

#### `Place Creator` (Nguồn gốc khởi tạo địa điểm)
- **Loại khái niệm:** Attribution Metadata
- **Định nghĩa nghiệp vụ:** Thuộc tính ghi nhận tài khoản đã tạo bản ghi địa điểm ban đầu (`Place.created_by`), không mang vai trò quản trị hay quyền sở hữu lâu dài đối với cơ sở.
- **As-Is Implementation Mapping:** `Place.created_by` (ForeignKey tới `User`).
- **Source References:** `backend/apps/places/models.py:62`
- **Trạng thái:** **Verified**

#### `Place Owner` (Chủ sở hữu cơ sở kinh doanh)
- **Loại khái niệm:** External Stakeholder
- **Định nghĩa nghiệp vụ:** Cá nhân hoặc pháp nhân được xác định là chủ thể sở hữu cơ sở kinh doanh tại địa điểm. Vai trò này không mặc định bao gồm quyền sở hữu bất động sản, quyền sở hữu thương hiệu hoặc trách nhiệm trực tiếp quản lý, vận hành cơ sở. Trường `Place.verified_at` chỉ phản ánh thời điểm thông tin địa điểm được đối chiếu thực địa, không đại diện cho quyền sở hữu hay quản lý của chủ cơ sở.
- **As-Is Implementation Mapping:** Chưa được mô hình hóa trong hệ thống.
- **Trạng thái:** **External Stakeholder / Unimplemented Role**

#### `Property Owner` (Chủ sở hữu bất động sản / mặt bằng)
- **Loại khái niệm:** External Stakeholder
- **Định nghĩa nghiệp vụ:** Cá nhân hoặc pháp nhân có quyền sử dụng đất hợp pháp hoặc là chủ sở hữu công trình/tòa nhà nơi cơ sở kinh doanh đặt địa điểm. Tác nhân bên ngoài, hoàn toàn nằm ngoài phạm vi mô hình hóa dữ liệu hiện tại.
- **Trạng thái:** **External Stakeholder / Out of Scope**

#### `Brand Owner` (Chủ sở hữu thương hiệu)
- **Loại khái niệm:** External Stakeholder
- **Định nghĩa nghiệp vụ:** Đơn vị nắm giữ quyền sở hữu trí tuệ thương hiệu cơ sở kinh doanh. Tác nhân bên ngoài, chưa được mô hình hóa trong hệ thống.
- **Trạng thái:** **External Stakeholder / Out of Scope**

#### `Place Operator` (Đơn vị vận hành)
- **Loại khái niệm:** External Stakeholder
- **Định nghĩa nghiệp vụ:** Cá nhân hoặc đơn vị trực tiếp quản lý, điều hành hoạt động hàng ngày của cơ sở ngoài đời thực (như quản lý quán, nhân viên điều hành). Hiện là tác nhân bên ngoài chưa được mô hình hóa trong hệ thống.
- **As-Is Implementation Mapping:** Chưa được mô hình hóa trong hệ thống.
- **Trạng thái:** **External Stakeholder / Unimplemented Role**

---

## C. Danh Sách Các Điểm Chờ Quyết Định (Decision Pending)

1. **Decision Pending #1: Quy tắc nhận diện danh tính khi cơ sở đại tu toàn diện hoặc chuyển địa điểm**
   - *Bối cảnh:* Khi quán thay đổi toàn bộ không gian (Visual Space bị đứt gãy) hoặc chuyển sang địa chỉ mới.
   - *Vấn đề:* Có đóng Place cũ và tạo Place mới không? Tư liệu ảnh cũ có bị gỡ hoàn toàn hay giữ lại?
   - *Hệ quả nếu chưa quyết định:* Rủi ro nhập nhằng dữ liệu giữa các lần sửa quán, có thể hiển thị ảnh cũ gây hiểu lầm cho người dùng.
2. **Decision Pending #2: Định đoạt luồng xử lý `VenueProposal` vs. Auto-Publication**
   - *Bối cảnh:* Model `VenueProposal` có trong schema nhưng API nộp ảnh hiện tại tự động tạo và xuất bản thẳng `Place(published)`.
   - *Vấn đề:* Giữ luồng tự động tạo địa điểm (để khuyến khích nộp nhanh) hay khôi phục hàng duyệt `VenueProposal(pending_review)`?
   - *Hệ quả nếu chưa quyết định:* Nếu giữ tự động, cần xóa/dọn dẹp model `VenueProposal`. Nếu khôi phục kiểm duyệt, cần viết lại API submit và hàng đợi duyệt.
3. **Decision Pending #3: Ranh giới hiển thị và vòng đời của `Archived Photo`**
   - *Bối cảnh:* Khái niệm ảnh tư liệu lịch sử (không còn phản ánh không gian hiện tại nhưng có giá trị ký ức) đã được thống nhất về mặt nghiệp vụ.
   - *Vấn đề:* Chưa có Product Spec về giao diện hiển thị (Timeline/Lịch sử) và chưa có schema trong DB.
   - *Hệ quả nếu chưa quyết định:* Trong implementation hiện tại chưa có trạng thái riêng để biểu diễn ảnh hợp lệ nhưng không còn phản ánh không gian hiện tại. Nếu ảnh vẫn ở trạng thái `published` và Place tiếp tục được hiển thị công khai, ảnh có thể tiếp tục xuất hiện trong các khu vực sử dụng truy vấn ảnh công khai. Cơ chế xử lý riêng cho trường hợp này chưa được triển khai.

---

## C. Redesign To-Be Vocabulary (Prompt 02)

### `Place` (To-Be)
- Địa điểm vật lý có thật, không mặc định là cơ sở kinh doanh. Phân biệt: Business, Public Space, Other Place. Không giới hạn Đà Nẵng hay cà phê.
- Trạng thái: As-Is giữ nguyên; To-Be mở rộng loại hình qua taxonomy Category.

### `Category` (To-Be)
- Taxonomy đa cấp phục vụ khám phá đa loại hình (ăn uống, cà phê, giải trí, tham quan, công cộng, mua sắm, trải nghiệm...). Proposed.

### Decision Pending (bảo toàn)
- Place Identity Continuity, VenueProposal, Archived Photo hiển thị: vẫn Decision Pending, không tự duyệt.
