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
    <footer className="border-t border-border bg-card/40">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{SITE.tagline}</p>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
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
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-sm font-semibold">Project</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
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

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
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
