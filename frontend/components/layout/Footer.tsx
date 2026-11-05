import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { SITE } from "@/lib/constants/content";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Perspectives", href: "/#perspectives" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Evaluation", href: "/#research" },
      { label: "Explainability", href: "/#evidence" },
      { label: "Get started", href: "/sign-up" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border bg-card/40 border-t">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="text-muted-foreground mt-4 max-w-xs text-sm">{SITE.tagline}</p>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="border-border hover:bg-muted mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors"
            >
              View on GitHub <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-sm font-semibold">Project</h2>
            <ul className="text-muted-foreground mt-4 space-y-2.5 text-sm">
              {SITE.team.map((name) => (
                <li key={name}>{name}</li>
              ))}
              <li className="pt-2">
                {SITE.course}, {SITE.section}
              </li>
              <li>
                Supervised by {SITE.supervisor.name}, {SITE.supervisor.title}
              </li>
              <li>{SITE.university}</li>
            </ul>
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-14 flex flex-col gap-3 border-t pt-8 text-xs md:flex-row md:items-center md:justify-between">
          <p>
            © {year} Parallax · SE 331 Capstone · {SITE.university}
          </p>
          <p className="max-w-xl md:text-right">
            Parallax reports potential similarity, not plagiarism verdicts. Final academic judgment
            rests with human reviewers.
          </p>
        </div>
      </div>
    </footer>
  );
}
