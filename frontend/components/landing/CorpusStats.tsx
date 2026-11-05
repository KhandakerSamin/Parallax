import { Database } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { CORPUS_SOURCE, CORPUS_STATS } from "@/lib/constants/content";

export function CorpusStats() {
  return (
    <section aria-labelledby="corpus-title" className="relative py-10 md:py-14">
      <div className="container-page">
        <Reveal className="glass border-border shadow-soft rounded-3xl border px-5 py-8 sm:px-10">
          <h2 id="corpus-title" className="sr-only">
            Corpus
          </h2>
          <dl className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
            {CORPUS_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={
                  i > 0
                    ? "lg:border-border flex flex-col items-center text-center lg:border-l"
                    : "flex flex-col items-center text-center"
                }
              >
                <dt className="text-muted-foreground order-2 mt-1 text-sm">{stat.label}</dt>
                <dd className="order-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-7 flex items-center justify-center gap-2 text-xs">
            <Database className="size-3.5" aria-hidden />
            Source: {CORPUS_SOURCE}. The 2,000+ figure is a growth target.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
