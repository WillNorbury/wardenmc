import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, MessageSquare, Pin, UserRound } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { findForumTopic, forumTopics } from "@/lib/forum-topics";
import logo from "@/assets/warden-network-icon.png";

export default function Forums() {
  const { slug } = useParams();
  const topic = findForumTopic(slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <SEO title={`${topic?.title ?? "Forums"} — Warden Network`} description={topic?.summary ?? "Warden Network community forums and staff application guides."} path={slug ? `/forums/${slug}` : "/forums"} type={topic ? "article" : "website"} />
      <main className="container max-w-5xl flex-1 pb-16 pt-28 sm:pt-32">
        {slug ? (
          <>
            <Button asChild variant="ghost" className="mb-6"><Link to="/forums"><ArrowLeft className="mr-2 h-4 w-4" />Forums</Link></Button>
            {topic ? (
              <article>
                <div className="flex items-center gap-2 text-sm font-medium text-primary"><Pin className="h-4 w-4" />Pinned · {topic.category}</div>
                <h1 className="mt-4 break-words font-display text-4xl leading-tight sm:text-5xl">{topic.title}</h1>
                <div className="mt-5 flex items-center gap-3 border-b border-border pb-7"><UserRound className="h-5 w-5 text-muted-foreground" /><span className="font-medium">{topic.author}</span><span className="text-sm text-muted-foreground">Author</span></div>
                <div className="max-w-3xl py-8">
                  <p className="text-lg leading-relaxed text-muted-foreground">{topic.summary}</p>
                  {topic.sections.map((section, index) => <section key={section.title} className="mt-8"><h2 className="text-xl font-semibold">{index + 1}. {section.title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p></section>)}
                  <div className="mt-9 flex flex-wrap gap-3"><Button asChild><Link to="/apply">Apply for staff<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/applications">Application status</Link></Button><Button asChild variant="ghost"><Link to="/rules">Community rules</Link></Button></div>
                </div>
              </article>
            ) : <div className="py-12"><h1 className="font-display text-4xl">Topic not found</h1><p className="mt-3 text-muted-foreground">This forum topic is unavailable.</p></div>}
          </>
        ) : (
          <>
            <header className="flex items-center gap-5 border-b border-border pb-8"><img src={logo} alt="" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" /><div><p className="text-sm font-semibold text-primary">WARDEN NETWORK</p><h1 className="mt-2 font-display text-5xl sm:text-6xl">Forums</h1></div></header>
            <section className="mt-9" aria-labelledby="forum-category"><div className="mb-4 flex items-center justify-between gap-4"><h2 id="forum-category" className="text-lg font-semibold">Staff applications</h2><span className="text-sm text-muted-foreground">1 topic</span></div>
              {forumTopics.map((item) => <Link key={item.slug} to={`/forums/${item.slug}`} className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary sm:items-center sm:p-6"><MessageSquare className="mt-1 h-6 w-6 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary"><Pin className="h-3 w-3" />Pinned</div><h3 className="break-words text-xl font-semibold group-hover:text-primary">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">By <span className="text-foreground">{item.author}</span></p></div><ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" /></Link>)}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}