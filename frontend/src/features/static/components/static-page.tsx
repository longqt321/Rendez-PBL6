interface StaticPageProps {
  title: string
  /** Một câu tóm tắt mục đích trang, hiện ngay dưới tiêu đề. */
  description?: string
  children: React.ReactNode
}

/**
 * Khung chung cho các trang tĩnh (Trợ giúp, Giới thiệu, Điều khoản, Bảo mật).
 *
 * Một chỗ định nghĩa bố cục + cỡ chữ để bốn trang không lệch nhau; nội dung
 * truyền vào là các khối `<section>` với tiêu đề phụ.
 */
export function StaticPage({ title, description, children }: StaticPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-10">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed break-words">{children}</div>
    </div>
  )
}

/** Một mục nội dung trong trang tĩnh — tiêu đề phụ + thân. */
export function StaticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}
