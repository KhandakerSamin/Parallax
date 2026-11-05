import { Reveal } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ } from "@/lib/constants/content";
import { SectionHeader } from "./shared/SectionHeader";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 md:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeader
          id="faq-title"
          eyebrow="FAQ"
          title="Questions, answered plainly."
          intro="If something here is unclear, that's a bug in our explanation. Tell us and we'll fix it."
          align="left"
        />
        <Reveal>
          <Accordion type="single" collapsible className="border-t border-border">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`q${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
