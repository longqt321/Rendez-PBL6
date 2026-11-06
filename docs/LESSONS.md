# LESSONS

## L-001 — Không import package chỉ tồn tại nhờ transitive dependency

**Ngày:** 2026-11-06
**Bối cảnh:** `src/lib/utils.ts` và `src/components/ui/button.tsx` import `cn` từ package `cn`, nhưng
`cn` không có trong `package.json`. Nó chỉ nằm trong `node_modules` vì `shadcn` (devDependency) kéo theo.

**Vì sao nguy hiểm:** `bun install --omit dev` hoặc `npm ci --omit=dev` sẽ xóa `cn` → build gãy.
Nâng version `shadcn` mà nó bỏ `cn` → gãy im lặng, khó lần ra vì `package.json` trông "đúng".

**Quy tắc:** mọi thứ `import` trong `src/` phải có tên trong `dependencies` hoặc `devDependencies`.
Kiểm bằng:

```bash
# liệt kê import không khai báo
node -e 'const p=require("./package.json");const d={...p.dependencies,...p.devDependencies};const fs=require("fs");const g=require("child_process").execSync("grep -rhoE \"from \\\"[^\\\".][^\\\"]*\\\"\" src").toString().split("\n").map(l=>l.replace(/from /,"").replace(/\"/g,"")).filter(Boolean);[...new Set(g)].map(s=>s.startsWith("@")?s.split("/").slice(0,2).join("/"):s.split("/")[0]).filter(s=>!d[s]&&!s.startsWith(".")).forEach(s=>console.log("UNDECLARED:",s))'
```

## L-002 — Kiểm tra `package.json` có khớp `node_modules` trước khi tin báo cáo

**Ngày:** 2026-11-06
**Bối cảnh:** Báo cáo ban đầu dựa trên `package.json` và kết luận `cn` "không tồn tại". Thực tế nó có
trong `node_modules` nhưng không được khai báo — hai chuyện khác nhau, cách sửa khác nhau.

**Quy tắc:** phân biệt rõ ba trạng thái: _khai báo & có_, _khai báo & thiếu_, _có nhưng không khai báo_.
Chỉ trạng thái thứ hai mới là "thiếu dependency".

## L-003 — Không sửa file do generator sinh ra (shadcn)

**Ngày:** 2026-11-06
**Bối cảnh:** ESLint báo `react-refresh/only-export-components` ở `src/components/ui/button.tsx`.
File này do `shadcn add button` sinh, export cả `Button` và `buttonVariants` — cố ý.

**Quy tắc:** sửa ở `eslint.config.js` bằng override theo đường dẫn, không sửa file generated.
Nếu sửa file generated, lần `shadcn add` sau sẽ ghi đè và mất fix.

## L-004 — `baseUrl` chết ở TypeScript 7

**Ngày:** 2026-11-06
**Bối cảnh:** `tsconfig.app.json` có `baseUrl` + `paths`. TS 6 báo `TS5101` (deprecated), TS 7 bỏ hẳn.

**Quy tắc:** `paths` một mình là đủ khi giá trị là đường dẫn tương đối (`./src/*`). Không thêm
`ignoreDeprecations` để che — đó chỉ dời ngày phải sửa.
