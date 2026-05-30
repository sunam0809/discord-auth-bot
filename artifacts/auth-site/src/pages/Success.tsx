import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";

export default function Success() {
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUsername(params.get("username"));
    setAvatar(params.get("avatar"));
    setRole(params.get("role"));

    // Trigger confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#5865F2', '#9400D3', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#5865F2', '#9400D3', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
      <Particles />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative z-10 w-full max-w-md bg-card/60 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl text-center"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-2">인증 완료!</h1>
        <p className="text-muted-foreground mb-8">
          성공적으로 인증되었습니다. 이제 창을 닫고 디스코드로 돌아가셔도 됩니다.
        </p>

        {username && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-background/50 border border-border rounded-xl p-4 flex items-center gap-4 mb-8"
          >
            {avatar ? (
              <img src={avatar} alt={username} className="w-12 h-12 rounded-full border-2 border-primary" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left flex-1">
              <div className="font-semibold">{username}</div>
              <div className="text-xs text-primary flex items-center mt-1">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {role ? `Role granted: ${role}` : "Verified Member"}
              </div>
            </div>
          </motion.div>
        )}

        <Button 
          variant="outline" 
          className="w-full hover:bg-white/5"
          onClick={() => window.close()}
        >
          Close Window
        </Button>
      </motion.div>
    </div>
  );
}
