export default function StaticPage({ title, lead, children, updated }) {
  return (
    <article className="mx-auto max-w-2xl pb-8 pt-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {lead && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lead}</p>}
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:hover:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
      {updated && <p className="mt-8 border-t border-border/60 pt-4 text-xs text-muted-foreground/70">{updated}</p>}
    </article>
  );
}