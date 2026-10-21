import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bug, Gavel, Headset, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import guardian from "@/assets/warden-network-icon.png";

export const supportOptions = [
  { title: "Support ticket", topic: "General question", subject: "", icon: Headset, description: "Server, account or plugin trouble? Ask the team." },
  { title: "Punishment appeal", topic: "Server help", subject: "Punishment appeal: ", icon: Gavel, description: "Request a review of a ban, mute or other punishment." },
  { title: "Bug report", topic: "Bug report", subject: "Bug report: ", icon: Bug, description: "Report a glitch, crash or exploit to the team." },
  { title: "Player report", topic: "Server help", subject: "Player report: ", icon: ShieldAlert, description: "Report cheating, scams or a breach of the rules." },
] as const;

export function SupportCentreHeader({ onCreate }: { onCreate: () => void }) {
  return <header className="relative overflow-hidden border-b border-border">
    <img src={guardian} alt="" className="absolute right-4 top-8 h-64 w-64 object-contain opacity-10 pointer-events-none md:right-16 md:h-80 md:w-80" />
    <div className="container max-w-6xl relative py-12 md:py-16">
      <div className="flex items-center gap-2 text-primary text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> WARDENMC · SUPPORT CENTRE</div>
      <h1 className="font-display text-5xl sm:text-6xl md:text-7xl mt-4 leading-none tracking-normal">PLAYER SUPPORT<br /><span className="text-primary">CENTRE</span></h1>
      <p className="text-muted-foreground mt-5 max-w-lg text-lg">A place to get help, report a problem and talk privately with the WardenMC team.</p>
      <div className="flex flex-wrap gap-3 mt-7"><Button onClick={onCreate}><Headset className="h-4 w-4 mr-2" /> Create ticket</Button><Button asChild variant="outline"><Link to="/status">Network status <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></div>
    </div>
  </header>;
}

export function SupportCategories({ onChoose }: { onChoose: (option: typeof supportOptions[number]) => void }) {
  return <section className="container max-w-6xl py-9 md:py-12">
    <div className="flex items-center justify-between gap-4 mb-6"><h2 className="font-display text-3xl tracking-normal">HOW CAN WE HELP?</h2><Link to="/rules" className="text-sm text-muted-foreground hover:text-primary">Community rules <ArrowRight className="inline h-3 w-3 ml-1" /></Link></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{supportOptions.map((option) => <Button key={option.title} variant="outline" className="h-auto min-h-52 p-6 rounded-lg bg-card text-card-foreground whitespace-normal items-start justify-start text-left hover:border-primary/60" onClick={() => onChoose(option)}><span className="block w-full"><option.icon className="h-7 w-7 text-primary mb-6" /><span className="flex items-center justify-between gap-2 font-display text-2xl tracking-normal">{option.title}<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></span><span className="block font-normal text-sm text-muted-foreground leading-relaxed mt-2">{option.description}</span></span></Button>)}</div>
  </section>;
}

export function SupportFaqs() {
  const faqs = useQuery({ queryKey: ["support-faqs"], queryFn: async () => {
    const { data, error } = await supabase.from("faqs").select("id, question, answer").eq("published", true).order("sort_order").limit(5);
    if (error) throw error;
    return data;
  } });
  return <section className="border-t border-border"><div className="container max-w-6xl py-12 grid gap-8 md:grid-cols-[1fr_1.5fr]">
    <div><p className="text-primary text-xs font-semibold mb-3">QUICK ANSWERS</p><h2 className="font-display text-4xl tracking-normal">BEFORE YOU OPEN<br />A TICKET</h2><Button asChild variant="link" className="px-0 mt-4"><Link to="/faq">All frequently asked questions <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></div>
    <div>{faqs.isPending ? <p className="text-muted-foreground">Loading questions…</p> : faqs.isError ? <p className="text-muted-foreground">Questions couldn’t load. <Link to="/faq" className="text-primary underline">Visit the FAQ page</Link>.</p> : faqs.data?.length ? <Accordion type="single" collapsible>{faqs.data.map((faq) => <AccordionItem key={faq.id} value={faq.id}><AccordionTrigger className="text-left">{faq.question}</AccordionTrigger><AccordionContent className="whitespace-pre-wrap break-words text-muted-foreground">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion> : <p className="text-muted-foreground">Have a question? The support team is here to help.</p>}</div>
    <div className="md:col-span-2 border-t border-border pt-7 flex flex-wrap justify-between gap-4 text-sm text-muted-foreground"><span>Looking to join the team? <Link to="/apply" className="text-primary hover:underline">Staff applications <ArrowRight className="inline h-3 w-3" /></Link></span><Link to="/discord" className="hover:text-primary">Join the community on Discord <ArrowRight className="inline h-3 w-3" /></Link></div>
  </div></section>;
}