#!/usr/bin/env node
// Kiểm tra chuỗi chữ UI theo docs/banned-phrases.json. Không cần cài thêm gói nào.
//
// Cách dùng:
//   node scripts/check-copy.mjs              quét toàn bộ scanRoots
//   node scripts/check-copy.mjs --changed    chỉ quét file đã đổi (git)
//   node scripts/check-copy.mjs path1 path2  quét các đường dẫn cụ thể
//   node scripts/check-copy.mjs --hook       chế độ hook của Claude Code (đọc JSON từ stdin)
//
// Thoát với mã 1 (hoặc 2 ở chế độ hook) nếu có lỗi mức "error". Cảnh báo "warn" không làm thất bại.
// Bỏ qua một dòng bằng comment: copy-lint-ignore

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative, resolve } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const cfgPath = join(root, "docs", "banned-phrases.json");
if (!existsSync(cfgPath)) {
  console.error(`Không tìm thấy ${cfgPath}. Chạy script từ thư mục gốc dự án.`);
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const args = process.argv.slice(2);
const hookMode = args.includes("--hook");
const changedMode = args.includes("--changed");
const explicit = args.filter((a) => !a.startsWith("--"));

const exts = new Set(cfg.extensions);
const skipDirs = new Set(cfg.skipDirs);
const skipPath = cfg.skipPathRegex.map((r) => new RegExp(r));
const regexRules = cfg.regexRules.map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags ?? "i") }));
const phraseRules = cfg.phraseRules.map((r) => ({ ...r, phrases: r.phrases.map((p) => p.normalize("NFC").toLowerCase()) }));

const rel = (p) => relative(root, resolve(root, p)).split("\\").join("/");
const scannable = (p) => {
  const r = rel(p);
  if (r.startsWith("..")) return false;
  if (!exts.has(extname(r))) return false;
  if (r.split("/").some((seg) => skipDirs.has(seg))) return false;
  if (skipPath.some((re) => re.test(r))) return false;
  return existsSync(resolve(root, r)) && statSync(resolve(root, r)).isFile();
};

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function gitFiles(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n").map((s) => s.trim()).filter(Boolean);
  } catch { return []; }
}

let files = [];
if (hookMode) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8")); } catch { /* không có stdin */ }
  const fp = input?.tool_input?.file_path;
  if (fp) files = [fp];
} else if (explicit.length) {
  for (const p of explicit) {
    const abs = resolve(root, p);
    if (existsSync(abs) && statSync(abs).isDirectory()) walk(abs, files);
    else files.push(p);
  }
} else if (changedMode) {
  files = [...gitFiles("git diff --name-only HEAD"), ...gitFiles("git ls-files --others --exclude-standard")];
  // Chỉ quét trong scanRoots: tài liệu, script và bộ prompt không phải chuỗi UI.
  const roots = cfg.scanRoots.map((r) => r.replace(/\/+$/, "") + "/");
  files = files.filter((p) => roots.some((r) => rel(p).startsWith(r)));
} else {
  for (const r of cfg.scanRoots) walk(join(root, r), files);
}
files = [...new Set(files.map(rel))].filter(scannable);

const findings = [];
for (const f of files) {
  const lines = readFileSync(resolve(root, f), "utf8").normalize("NFC").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("copy-lint-ignore")) return;
    const low = line.toLowerCase();
    for (const r of regexRules) {
      if (r.re.test(line)) findings.push({ f, line: i + 1, id: r.id, sev: r.severity, msg: r.message, text: line.trim() });
    }
    for (const r of phraseRules) {
      const hit = r.phrases.find((p) => low.includes(p));
      if (hit) findings.push({ f, line: i + 1, id: r.id, sev: r.severity, msg: r.message, text: line.trim(), hit });
    }
  });
}

const errors = findings.filter((x) => x.sev === "error");
const warns = findings.filter((x) => x.sev !== "error");
const fmt = (x) => `${x.sev === "error" ? "LỖI" : "CẢNH BÁO"} [${x.id}] ${x.f}:${x.line}${x.hit ? ` ("${x.hit}")` : ""}\n  ${x.text.slice(0, 160)}\n  → ${x.msg}`;

if (findings.length) {
  const out = [...errors, ...warns].map(fmt).join("\n");
  (errors.length ? console.error : console.log)(out);
}
const summary = `check-copy: ${files.length} file, ${errors.length} lỗi, ${warns.length} cảnh báo.`;
(errors.length ? console.error : console.log)(summary);
if (errors.length) {
  console.error("Sửa theo docs/VOICE.md và docs/UX_RULES.md. Không né bằng copy-lint-ignore trừ khi có lý do thật và ghi lý do.");
  process.exit(hookMode ? 2 : 1);
}
