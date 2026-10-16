import { Link } from "@tanstack/react-router";

export default function Footer() {
  const links = [
    { to: "/about", label: "About" },
    { to: "/help", label: "Help" },
    { to: "/contact", label: "Contact" },
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/report", label: "Report Content" },
  ];
  return (
    <footer className="mt-16 border-t border-border/70 pb-24 pt-8 md:pb-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VYBEX. A demo build — sample content is labeled as such.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}