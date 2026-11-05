import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="pt-8 pb-24 md:pb-32">
      <div className="container-page">
        <Reveal className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3730a3] via-[#4f46e5] to-[#0f766e] px-6 py-20 text-center text-white shadow-lift sm:px-12 md:py-28">
          {/* Layered planes drifting at different speeds */}
          <ParallaxLayer distance={-120} className="pointer-events-none absolute -top-16 -left-10 -z-10">
            <div aria-hidden className="size-56 rotate-12 rounded-[2.5rem] border border-white/20 bg-white/5" />
          </ParallaxLayer>
          <ParallaxLayer distance={90} className="pointer-events-none absolute -right-8 -bottom-20 -z-10">
            <div aria-hidden className="size-72 -rotate-6 rounded-[3rem] border border-white/15 bg-white/10" />
          </ParallaxLayer>
          <ParallaxLayer distance={-60} className="pointer-events-none absolute top-10 right-[18%] -z-10 hidden md:block">
            <div aria-hidden className="size-20 rotate-45 rounded-2xl bg-[#fbbf24]/30" />
          </ParallaxLayer>

          <h2 id="cta-title" className="text-h2 mx-auto max-w-3xl text-balance">
            Start with what&apos;s already been done.
          </h2>
          <p className="text-lead mx-auto mt-5 max-w-[52ch] text-white/85">
            See how your idea relates to earlier DIU work before you write the next chapter.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-[#3730a3] shadow-none hover:bg-white/90">
              <Link href="/sign-up">
                Create account <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
