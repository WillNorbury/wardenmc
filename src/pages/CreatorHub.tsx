import { Link } from "react-router-dom";
import { ArrowRight, Code2, Video, Users, Sparkles } from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";

const creatorTypes = [
  {
    icon: Video,
    title: "Content Creators",
    description: "Share your Minecraft videos, livestreams, tutorials and community content.",
  },
  {
    icon: Code2,
    title: "Developers",
    description: "Showcase your plugins, resources, tools and Minecraft projects.",
  },
  {
    icon: Users,
    title: "Community Leaders",
    description: "Connect communities, organise events and help bring players together.",
  },
  {
    icon: DiscordMark,
    title: "Our Discord",
    link: "https://discord.warden.rip",
    description: "Join our Discord server for more details!",
  },
];

export default function CreatorHub() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            WardenMC Community
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Creator Hub</h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Discover the creators, developers and community leaders building the future of Minecraft.
          </p>

          <Link
            to="/profile"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Join the Community
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {creatorTypes.map((type) => {
            const Icon = type.icon;

            return (
              <div
                key={type.title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-semibold">{type.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{type.description}</p>
              </div>
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
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
