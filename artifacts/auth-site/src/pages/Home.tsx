import { useEffect, useState } from "react";
import { useGetAuthUrl } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { SiDiscord } from "react-icons/si";
import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [guildId, setGuildId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGuildId(params.get("guildId"));
  }, []);

  const { data: authUrl, isLoading } = useGetAuthUrl(
    { guildId: guildId || "" },
    { query: { enabled: !!guildId, queryKey: ["authUrl", guildId] } }
  );

  const handleVerify = () => {
    if (authUrl?.url) {
      window.location.href = authUrl.url;
    }
  };

  if (!guildId) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden text-center p-6">
        <Particles />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full bg-card/80 backdrop-blur-xl border border-border p-8 rounded-2xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <SiDiscord className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            This verification link is missing the server identifier. Please click the button in your Discord server again.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6">
      <Particles />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card/50 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-[0_0_50px_-12px_rgba(88,101,242,0.3)] hover-glow">
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 bg-[#5865F2]/20 text-[#5865F2] rounded-2xl flex items-center justify-center mx-auto mb-8 animate-float"
            >
              <SiDiscord className="w-12 h-12" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-3 tracking-tight"
            >
              Secure Verification
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-10 leading-relaxed"
            >
              Connect your Discord account to verify your identity and gain full access to the server.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white border-none animate-pulse-glow"
                disabled={!authUrl || isLoading}
                onClick={handleVerify}
                data-testid="button-verify-discord"
              >
                <SiDiscord className="mr-3 w-6 h-6" />
                Discord로 인증하기
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-sm text-muted-foreground/60 relative z-10"
      >
        Secured by Discord Verification System
      </motion.div>
    </div>
  );
}
