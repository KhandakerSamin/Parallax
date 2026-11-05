import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { ROLES } from "@/lib/constants/content";
import { SectionHeader } from "./shared/SectionHeader";

export function Roles() {
  return (
    <section aria-labelledby="roles-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader
          id="roles-title"
          eyebrow="For every role"
          title="One system, four ways to use it."
          intro="What you see depends on what you need to do, and on what your role is allowed to see."
        />

        <Stagger as="ul" className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <StaggerItem as="li" key={role.role}>
              <SpotlightCard
                spotColor={role.color}
                className="group h-full p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-lift"
              >
                <span
                  className="grid size-12 place-items-center rounded-2xl bg-muted transition-transform duration-300 group-hover:scale-110"
                  style={{ color: role.color }}
                >
                  <role.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{role.role}</h3>
                <ul className="mt-3 space-y-2">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full"
                        style={{ background: role.color }}
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
