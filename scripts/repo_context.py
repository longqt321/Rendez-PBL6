#!/usr/bin/env python3
"""repo-context: gom source code của repository thành một file văn bản duy nhất.

Digest cho phép coding agent đọc cấu trúc và nội dung repository trong một lần,
thay vì đọc từng file. Tương tự Gitingest nhưng triển khai riêng cho Rendez,
chỉ dùng thư viện chuẩn Python.

Danh sách file lấy từ Git CLI (tôn trọng .gitignore); quy tắc loại trừ riêng
nằm trong .repo-context-ignore. Cú pháp hỗ trợ: dòng trống, # comment,
directory/ hoặc name, glob * ?, và phủ định !pattern. Giới hạn: pattern
anchor "**" chưa hỗ trợ; .repo-context-ignore áp dụng cho toàn repo (không
đọc file ignore lồng trong thư mục con).

Digest là snapshot tại thời điểm tạo, không tự cập nhật khi source thay đổi.
"""

from __future__ import annotations

import argparse
import codecs
import fnmatch
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# --- Giới hạn mặc định cho một repository full-stack cỡ vừa -----------------

DEFAULT_MAX_FILE_SIZE_MB = 1.0   # một file lớn hơn vậy bị bỏ qua (ghi rõ trong digest)
DEFAULT_MAX_TOTAL_SIZE_MB = 20.0  # tổng dung lượng nội dung trong digest
DEFAULT_MAX_FILES = 8000
DEFAULT_OUTPUT = ".repo-context/repository.txt"

SECRET_SUFFIXES = (".pem", ".key", ".p12", ".pfx", ".p12", ".jks", ".keystore")

# Secret name-blocklist: .env*, private-key suffixes, và từ khoá đối với
# file cấu hình (xem looks_like_secret).


@dataclass
class IgnoreRule:
    """Một dòng trong file ignore (gitignore-like, rút gọn)."""

    pattern: str
    negated: bool
    dir_only: bool

    def matches(self, rel_posix: str, is_dir: bool) -> bool:
        name = rel_posix.rsplit("/", 1)[-1]
        stem = self.pattern.rstrip("/")
        inside = stem + "/*"  # mọi thứ bên trong thư mục khớp dù is_dir=False
        if "/" not in stem:
            # Pattern không có "/": khớp ở mọi độ sâu (giống gitignore).
            pats = [(self.pattern, self.dir_only), (inside, False),
                    ("*/" + self.pattern, self.dir_only), ("*/" + inside, False)]
        else:
            # Pattern có "/": anchor từ root.
            pats = [(self.pattern, self.dir_only), (inside, False)]
        for p, dir_restricted in pats:
            if fnmatch.fnmatch(rel_posix, p) or fnmatch.fnmatch(name, p):
                if dir_restricted and not is_dir:
                    return False
                return True
        return False


class IgnoreList:
    """Tập quy tắc ignore; quy tắc cuối cùng khớp là quy tắc quyết định."""

    def __init__(self) -> None:
        self.rules: list[IgnoreRule] = []

    @classmethod
    def from_file(cls, path: Path) -> "IgnoreList":
        il = cls()
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return il
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            negated = line.startswith("!")
            if negated:
                line = line[1:]
            dir_only = line.endswith("/")
            line = line.rstrip("/")
            line = line.lstrip("/")
            if line:
                il.rules.append(IgnoreRule(line, negated, dir_only))
        return il

    def ignored(self, rel_posix: str, is_dir: bool = False) -> bool:
        result = False
        for rule in self.rules:
            if rule.matches(rel_posix, is_dir):
                result = not rule.negated
        return result


@dataclass
class Stats:
    total_files: int = 0
    included: int = 0
    skipped: dict[str, list[str]] = field(
        default_factory=lambda: {
            "ignored": [],
            "binary": [],
            "secret": [],
            "too-large": [],
            "total-limit": [],
            "file-limit": [],
            "unreadable": [],
            "old-digest": [],
        }
    )
    included_bytes: int = 0


def find_repo_root(start: Path) -> Path:
    """Đi ngược từ `start` (hoặc vị trí script) tới thư mục chứa .git."""
    current = start.resolve()
    if current.is_file():
        current = current.parent
    while True:
        if (current / ".git").exists():
            return current
        if current.parent == current:
            return start.resolve()
        current = current.parent


def collect_files(root: Path, scope: Path) -> tuple[list[str], Stats]:
    """Danh sách relative path từ Git CLI — tôn trọng .gitignore sẵn có.

    `scope` giới hạn kết quả vào thư mục con đó (relative path vẫn tính từ root).
    """
    stats = Stats()
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "ls-files", "--cached", "--others",
             "--exclude-standard", "--deduplicate"],
            capture_output=True, text=True, timeout=60,
        )
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip() or "git ls-files failed")
        files = sorted(proc.stdout.splitlines())
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"[repo-context] git ls-files thất bại ({exc}); dùng os.walk dự phòng",
              file=sys.stderr)
        files = []
        for dirpath, dirnames, filenames in os.walk(scope):
            dirnames[:] = [d for d in dirnames if d != ".git"]
            for fn in filenames:
                rel = Path(dirpath, fn).relative_to(root).as_posix()
                files.append(rel)
        files.sort()
    if scope != root:
        prefix = scope.relative_to(root).as_posix() + "/"
        files = [f for f in files if f.startswith(prefix)]
    stats.total_files = len(files)
    return files, stats


def looks_like_secret(rel_posix: str) -> bool:
    """Chặn theo tên file: .env*, private-key suffix, và tên kiểu credentials
    đối với file cấu hình/dữ liệu. Không áp dụng từ khoá chung cho source
    code (.py/.ts/.html...) để tránh loại oan (VD: template `password_hash.html`).
    """
    name = rel_posix.rsplit("/", 1)[-1].lower()
    if name == ".env" or name.startswith(".env."):
        return True
    if any(name.endswith(suf) for suf in SECRET_SUFFIXES):
        return True
    config_exts = (".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
                   ".conf", ".txt", ".xml", "")
    stem_ext = name.rsplit(".", 1)
    ext = "" if len(stem_ext) == 1 else "." + stem_ext[-1]
    if ext in config_exts:
        return any(token in name for token in
                   ("secret", "credential", "password", "token", "private_key"))
    return False


def read_text_limited(path: Path, max_bytes: int) -> tuple[str, str]:
    """Đọc tối đa max_bytes.

    Trả về (text, "") khi OK, ("", reason) khi binary hoặc vượt giới hạn.
    Nhị phân: có NUL byte, hoặc không decode được bằng UTF-8. Dùng incremental
    decoder để không false-positive khi biên cắt giữa ký tự multibyte.
    """
    with path.open("rb") as fh:
        blob = fh.read(max_bytes + 1)
    if len(blob) > max_bytes:
        return "", "too-large"
    if b"\x00" in blob:
        return "", "binary"
    decoder = codecs.getincrementaldecoder("utf-8")()
    try:
        text = decoder.decode(blob, final=True)
    except UnicodeDecodeError:
        return "", "binary"
    return text, ""


def build_tree(rel_paths: list[str]) -> str:
    lines: list[str] = []

    def render(prefix: str, entries: list[str]) -> None:
        dirs = sorted({e.split("/", 1)[0] for e in entries if "/" in e})
        plain = sorted(e for e in entries if "/" not in e)
        for d in dirs:
            lines.append(prefix + d + "/")
            render(prefix + "  ", [e.split("/", 1)[1] for e in entries
                                   if e.startswith(d + "/")])
        for f in plain:
            lines.append(prefix + f)

    render("", list(rel_paths))
    return "\n".join(lines)


def estimate_tokens(text: str) -> int:
    # Heuristic tham khảo cho code: ~4 ký tự / token.
    return len(text) // 4


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="repo-context",
        description="Gom source code repository thành một file digest duy nhất "
                    "cho coding agent. Digest là snapshot, không tự cập nhật.",
    )
    parser.add_argument("root", nargs="?", default=None,
                        help="Thư mục repository (mặc định: root chứa script). "
                             "Có thể truyền thư mục con như backend/ hoặc frontend/ "
                             "để chỉ gom phần đó (ignore rules vẫn đọc từ repo root).")
    parser.add_argument("--output", default=None,
                        help=f"File digest đầu ra, relative tới root "
                             f"(mặc định: {DEFAULT_OUTPUT}, hoặc .repo-context/"
                             f"<tên-thư-mục-con>.txt khi gom thư mục con)")
    parser.add_argument("--max-file-size", type=float, default=DEFAULT_MAX_FILE_SIZE_MB,
                        help="Kích thước tối đa một file, đơn vị MB (mặc định: 1)")
    parser.add_argument("--max-total-size", type=float, default=DEFAULT_MAX_TOTAL_SIZE_MB,
                        help="Tổng dung lượng nội dung digest, đơn vị MB (mặc định: 20)")
    parser.add_argument("--max-files", type=int, default=DEFAULT_MAX_FILES,
                        help="Số file tối đa đưa vào digest (mặc định: 8000)")
    args = parser.parse_args(argv)

    start = Path(args.root) if args.root else Path(__file__)
    root = find_repo_root(start)
    scope = root  # phạm vi gom: toàn repo hoặc thư mục con
    if args.root:
        arg_path = Path(args.root).resolve()
        if arg_path != root and root in arg_path.parents:
            scope = arg_path
        elif arg_path != root:
            parser.error(f"{arg_path} không nằm trong repository {root}")
    max_file_size = int(args.max_file_size * 1024 * 1024)
    max_total_size = int(args.max_total_size * 1024 * 1024)
    default_output = DEFAULT_OUTPUT if scope == root else (
        ".repo-context/" + scope.relative_to(root).as_posix() + ".txt")
    out_abs = Path(args.output or default_output)
    if not out_abs.is_absolute():
        out_abs = root / out_abs
    out_abs = out_abs.resolve()
    try:
        out_rel = out_abs.relative_to(root).as_posix()
    except ValueError:
        out_rel = None  # output ngoài repo: chỉ cần không tự ignore chính nó

    files, stats = collect_files(root, scope)
    extra = IgnoreList.from_file(root / ".repo-context-ignore")
    kept: list[tuple[str, Path]] = []

    for rel in files:
        path = root / rel
        # Bỏ qua mọi artifact do chính công cụ sinh ra (.repo-context/ và
        # đúng file output) để digest cũ không bị nuốt vào digest mới.
        if rel == out_rel or rel.startswith(out_rel + "/") or rel.startswith(".repo-context/"):
            stats.skipped["old-digest"].append(rel)
            continue
        if extra.ignored(rel):
            stats.skipped["ignored"].append(rel)
            continue
        if rel.endswith("/") or not path.is_file() or path.is_symlink():
            stats.skipped["unreadable"].append(rel + " (symlink)")
            continue
        try:
            size = path.stat().st_size
        except OSError:
            stats.skipped["unreadable"].append(rel + " (không stat được)")
            continue
        if looks_like_secret(rel):
            stats.skipped["secret"].append(rel)
            continue
        if size > max_file_size:
            stats.skipped["too-large"].append(rel)
            continue
        if len(kept) >= args.max_files:
            stats.skipped["file-limit"].append(rel)
            continue
        if stats.included_bytes + size > max_total_size:
            stats.skipped["total-limit"].append(rel)
            continue
        try:
            text, reason = read_text_limited(path, max_file_size)
        except (OSError, UnicodeDecodeError):
            stats.skipped["unreadable"].append(rel + " (lỗi đọc/decode)")
            continue
        if reason == "binary":
            stats.skipped["binary"].append(rel)
            continue
        if reason == "too-large":
            stats.skipped["too-large"].append(rel)
            continue
        kept.append((rel, text))
        stats.included += 1
        stats.included_bytes += len(text.encode("utf-8"))

    tree = build_tree([rel for rel, _ in kept])
    body_parts: list[str] = []
    for rel, text in kept:
        text = text.rstrip("\n")
        body_parts.append(f"\n{'=' * 50}\nFILE: {rel}\n{'=' * 50}\n{text}\n")
    body = "\n".join(body_parts)

    digest_size = stats.included_bytes + len(tree) + len(body)
    digest_size += 2000  # phần overview + skipped report
    tokens = estimate_tokens(body) + estimate_tokens(tree) + 300

    skip_reasons = {
        "ignored": "khớp .repo-context-ignore",
        "binary": "file nhị phân",
        "secret": "tên file trông giống secret",
        "too-large": "vượt --max-file-size",
        "total-limit": "vượt --max-total-size",
        "file-limit": "vượt --max-files",
        "unreadable": "không đọc được",
        "old-digest": "digest cũ của repo-context",
    }
    skip_total = sum(len(v) for v in stats.skipped.values())

    overview = [
        "=" * 50,
        "REPOSITORY DIGEST (do repo-context sinh ra)",
        "=" * 50,
        f"Repository root : {root}",
        f"Thời điểm tạo   : {time.strftime('%Y-%m-%d %H:%M:%S %z')}",
        f"Tổng số file (git) : {stats.total_files}",
        f"File đưa vào    : {stats.included}",
        f"File bỏ qua     : {skip_total}",
        f"Dung lượng nội dung : {stats.included_bytes / 1024 / 1024:.2f} MB",
        f"Ước lượng token (heuristic, KHÔNG phải số token chính xác): ~{tokens:,}",
        f"Giới hạn        : max-file-size={args.max_file_size} MB, "
        f"max-total-size={args.max_total_size} MB, max-files={args.max_files}",
        "",
        "LƯU Ý: Token estimate dựa trên tỷ lệ ~4 ký tự/token cho code; "
        "không đảm bảo digest nằm trong context window của model.",
    ]

    out = []
    out.extend(overview)
    out.extend(["", "=" * 50, "DIRECTORY TREE (các file trong digest)", "=" * 50, tree])
    out.extend(["", "=" * 50, "FILE CONTENTS", "=" * 50, body])
    out.extend(["", "=" * 50, f"SKIPPED FILES ({skip_total})", "=" * 50])
    if skip_total:
        for key, items in stats.skipped.items():
            if not items:
                continue
            out.append(f"  [{skip_reasons.get(key, key)}] ({len(items)})")
            out.extend(f"    - {rel}" for rel in items)
    else:
        out.append("  (không có file bị bỏ qua)")

    out_abs.parent.mkdir(parents=True, exist_ok=True)
    out_abs.write_text("\n".join(out) + "\n", encoding="utf-8")

    print(f"[repo-context] digest: {out_abs}")
    print(f"[repo-context] {stats.included}/{stats.total_files} file, "
          f"{stats.included_bytes / 1024 / 1024:.2f} MB nội dung, "
          f"~{tokens:,} token (ước lượng)")
    print(f"[repo-context] bỏ qua: "
          + ", ".join(f"{k}={len(v)}" for k, v in stats.skipped.items() if v))
    return 0


if __name__ == "__main__":
    sys.exit(main())
