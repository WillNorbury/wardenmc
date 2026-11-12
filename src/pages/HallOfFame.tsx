import { Crown, Medal, Trophy, Star } from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";

const inductees = [
  {
    name: "Featured Creator",
    category: "Creator of the Year",
    description: "Recognising outstanding contributions to the Minecraft community.",
    icon: Crown,
  },
  {
    name: "Featured Project",
    category: "Project of the Year",
    description: "Celebrating innovative projects that make Minecraft even better.",
    icon: Trophy,
  },
  {
    name: "Community Champion",
    category: "Community Award",
    description: "Honouring members who go above and beyond for their community.",
    icon: Medal,
  },
  {
    name: "Our Discord",
    link: "https://discord.warden.rip",
    category: "Discord Server",
    description: "Join our Discord server for more details!",
    icon: null,
    discord: true,
  },
];

export default function HallOfFame() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-600">
            <Star className="h-4 w-4" />
            WardenMC Recognition
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Hall of Fame</h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Celebrating the people, projects and communities that have made an exceptional impact on Minecraft.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-2xl font-bold">WardenMC Legends</h2>
          <p className="mt-3 text-muted-foreground">
            Every inductee has earned their place through creativity, dedication and a positive impact on the community.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {inductees.map((inductee) => {
            const Icon = inductee.icon;

            const content = (
              <>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600">
                  {inductee.discord ? <DiscordMark /> : Icon ? <Icon className="h-8 w-8" /> : null}
                </div>

                <p className="text-sm font-medium text-primary">{inductee.category}</p>

                <h3 className="mt-2 text-xl font-bold">{inductee.name}</h3>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">{inductee.description}</p>
              </>
            );

            const className =
              "relative block overflow-hidden rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/50";

            return inductee.link ? (
              <a
                key={inductee.category}
                href={inductee.link}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            ) : (
              <article key={inductee.category} className={className}>
                {content}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
