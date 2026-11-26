import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

const SkywarsDiscord = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="container flex-1 pt-24 pb-16">
        {/* Add your Skywars Discord content here. */}
      </main>
      <Footer />
    </div>
  );
};

export default SkywarsDiscord;