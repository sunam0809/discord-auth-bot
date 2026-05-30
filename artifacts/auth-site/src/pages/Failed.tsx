import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Failed() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setErrorMsg(params.get("error") || "An unknown error occurred during verification.");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-6">
      <Particles />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-card/60 backdrop-blur-2xl border border-destructive/30 p-10 rounded-3xl shadow-[0_0_40px_-10px_rgba(255,50,50,0.2)] text-center"
      >
        <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold mb-4">인증 실패</h1>
        
        <div className="bg-background/50 border border-destructive/20 rounded-xl p-4 mb-8">
          <p className="text-muted-foreground font-mono text-sm break-words">
            {errorMsg}
          </p>
        </div>

        <Link href="/" className="w-full block">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12">
            <RotateCcw className="w-4 h-4 mr-2" />
            다시 시도하기 (Retry)
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
