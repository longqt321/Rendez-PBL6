interface StaticPageProps {
  title: string

  description?: string
  children: React.ReactNode
}

export function StaticPage({ title, description, children }: StaticPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8 lg:py-10">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed break-words">{children}</div>
    </div>
  )
}

export function StaticSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}
