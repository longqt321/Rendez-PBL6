---
id: "ERPF-TOOL-TMP-022"
title: "Biểu Mẫu Nhật Ký Vận Hành & Cấu Hình Thực Nghiệm AI/ML (Experiment Configuration & Run Log Template)"
version: "1.0.0"
category: "TOOL"
track: "AI"
concept_type: "TEMP"
intended_audience:
  - "AI/ML Researchers"
  - "MLOps Engineers"
  - "AI Research Agents"
prerequisites:
  - "ERPF/foundation/core-principles.md"
  - "ERPF/ai-research/empirical-loop/experiment-management-and-implementation.md"
related_concepts:
  - "ERPF-AI-DOM-014"
  - "ERPF-AI-WORK-004"
  - "ERPF-AI-SKILL-003"
applicable_contexts:
  - "Ghi chép chi tiết từng đợt chạy huấn luyện thực nghiệm (Run Logs)"
  - "Lưu trữ phả hệ thực nghiệm (Provenance) và ánh xạ tới checkpoint artifact"
source_status: "Verified"
last_verified: "2026-10-30"
reviewers:
  - "Engineering Knowledge Architect"
tags:
  - "template"
  - "run-log"
  - "provenance"
  - "checkpoint"
  - "reproducibility"
---

# Biểu Mẫu Nhật Ký Vận Hành & Cấu Hình Thực Nghiệm AI/ML
# Experiment Configuration & Run Log Template

---

## 1. Thông Tin Chạy Thực Nghiệm (Run Metadata)
- **Mã Đợt Chạy (Run ID):** `RUN-[EXP_ID]-[SEED]-[TIMESTAMP]`
- **Mã Git Commit:** `[commit hash 40 ký tự đầy đủ]`
- **Trạng Thái Git:** `[Clean - Không có tệp unstaged]`
- **Hạ Tầng Phần Cứng:** [1x NVIDIA A100-SXM4-80GB, CUDA 12.2, Driver 535.104]
- **Thời Điểm Bắt Đầu:** [YYYY-MM-DD HH:MM:SS UTC]
- **Thời Điểm Hoàn Thành:** [YYYY-MM-DD HH:MM:SS UTC]
- **Tổng Thời Gian Huấn Luyện:** [X giờ Y phút]

---

## 2. Cấu Hình Siêu Tham Số Đầy Đủ (Hyperparameter Snapshot)

```yaml
# Snapshot cấu hình thực nghiệm bất biến
model:
  architecture: "ResNet50"
  pretrained: true
  num_classes: 10
training:
  batch_size: 64
  learning_rate: 0.0003
  optimizer: "AdamW"
  weight_decay: 0.01
  scheduler: "CosineAnnealingLR"
  max_epochs: 100
  patience: 15
seeds:
  python: 42
  numpy: 42
  torch: 42
  cuda_deterministic: true
data:
  dataset_name: "Cora"
  dataset_checksum: "sha256:7a8b9c..."
  split_seed: 42
```

---

## 3. Nhật Ký Tiến Trình Huấn Luyện (Training Progression Summary)

| Epoch | Train Loss | Val Loss | Val Metric (Primary) | Learning Rate | Ghi Chú / Sự Kiện |
| :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | 2.341 | 2.105 | 45.2% | 0.0003 | Khởi tạo trọng số |
| 25 | 0.812 | 0.745 | 78.4% | 0.00025 | Lưu checkpoint tốt nhất |
| 50 | 0.320 | 0.620 | 82.1% | 0.00012 | Bắt đầu hiện tượng overfitting nhẹ |
| 68 | 0.210 | 0.640 | 81.9% | 0.00004 | Kích hoạt Early Stopping |

---

## 4. Tạo Tác Đầu Ra & Phả Hệ Checkpoint (Artifact Provenance)
- **Đường dẫn Checkpoint tốt nhất:** `artifacts/checkpoints/best_model_run_42.pt`
- **Mã băm SHA-256 của Checkpoint:** `sha256:a1b2c3d4e5f6...`
- **Nhật ký TensorBoard / WandB:** `logs/wandb/run-20261030_120000/`
- **Kết quả đánh giá cuối cùng trên Test Split:**
  - *Primary Metric:* [Số liệu $\pm$ sai số]
  - *Secondary Metrics:* [Số liệu]
