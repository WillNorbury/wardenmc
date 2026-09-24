import { useEffect } from "react";

const Discord = () => {
  useEffect(() => {
    window.location.replace("https://discord.warden.rip");
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Discord...</p>
    </div>
  );
};

export default Discord;
