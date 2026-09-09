"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MeshGradient } from "@paper-design/shaders-react";
import { motion, useScroll, useTransform, AnimatePresence, useSpring, Variants } from "framer-motion";
import { Brain, Mic, Activity, ArrowRight, BrainCircuit, Waves, Database, Target, LayoutDashboard, ShieldCheck, Zap, UserCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

const MARQUEE_ITEMS = [
  "Wav2Vec2 Acoustic Analysis", "Whisper Transcription", "BERT Linguistic Engine", 
  "Immediate Recall Assessment", "Delayed Memory Scoring", "Real-time Processing",
  "MMSE Cognitive Mapping", "Multimodal Feature Fusion"
];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const { scrollYProgress: parallaxProgress } = useScroll({
    target: parallaxRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  
  const rawBgY = useTransform(parallaxProgress, [0, 1], ["-40%", "40%"]);
  const bgY = useSpring(rawBgY, { stiffness: 80, damping: 30, mass: 1 });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative w-full min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-primary-200">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-primary-200/50 blur-[150px] rounded-full mix-blend-multiply" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-accent-200/50 blur-[150px] rounded-full mix-blend-multiply" 
        />
      </div>

      {/* Slimmer, more transparent Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 w-full z-50 bg-white/20 backdrop-blur-xl border-b border-white/40 py-3 px-8 flex justify-between items-center shadow-sm"
      >
        <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight">
          <BrainCircuit className="w-7 h-7 text-primary-600" />
          <span>Alz<span className="text-primary-600 italic">Detect</span></span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/40 border border-slate-200 text-slate-600 hover:bg-white hover:text-primary-600 transition-all shadow-sm"
              >
                <UserCircle className="w-6 h-6" />
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-2 flex flex-col"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login">
              <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                Log In / Sign Up
              </button>
            </Link>
          )}
          <Link href="/assessment">
            <button className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-[0_4px_14px_rgba(79,70,229,0.2)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5">
              Launch Assessment
            </button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 h-screen min-h-[600px] pt-24 pb-12 px-8 flex items-center overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 z-0 opacity-100">
          <MeshGradient
            className="w-full h-full"
            style={{ backgroundColor: "#ffffff" }}
            colors={["#c7d2fe", "#a5b4fc", "#818cf8", "#e0e7ff", "#f1f5f9"]}
            speed={0.2}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Text */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start text-left"
          >
            <motion.h1 variants={fadeUp} className="text-6xl md:text-[5rem] font-display font-black mb-6 leading-[1.1] text-slate-900 tracking-tight">
              Detect Alzheimer's <br />
              <span className="text-gradient font-display pr-4">Months Earlier</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-slate-600 max-w-lg mb-8 font-light leading-relaxed">
              We leverage an advanced multimodal AI architecture, fusing acoustic speech patterns with cognitive memory tasks for unparalleled early detection accuracy.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/assessment">
                <button className="flex justify-center items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-full font-bold text-base hover:bg-primary-700 transition-all shadow-[0_8px_30px_rgba(79,70,229,0.25)] hover:-translate-y-1">
                  Start Demo <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/results">
                <button className="flex justify-center items-center gap-2 bg-white/50 backdrop-blur-md border border-slate-200 text-slate-700 px-6 py-3 rounded-full font-bold text-base hover:bg-white transition-all hover:-translate-y-1">
                  View Dashboard <LayoutDashboard className="w-5 h-5 text-slate-500" />
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Image Composition */}
          <motion.div 
            style={{ y: y1 }}
            className="relative hidden lg:block max-w-[400px] ml-auto w-full"
          >
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative w-full aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-white/60 backdrop-blur-sm z-10"
            >
              <Image 
                src="/hero_medical_ai.png" 
                alt="AI Brain Medical Visualization" 
                fill 
                className="object-cover"
                priority
              />
            </motion.div>
            
            {/* Floating UI Elements */}
            <motion.div 
              style={{ y: y2 }}
              className="absolute bottom-10 -left-12 glass-card p-4 rounded-2xl w-56 shadow-2xl bg-white/90 backdrop-blur-xl z-20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Analysis Complete</p>
                  <p className="text-[10px] text-emerald-600 font-medium">99.2% Confidence</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                  className="bg-emerald-500 h-full rounded-full" 
                />
              </div>
            </motion.div>

            <motion.div 
              style={{ y: y3 }}
              className="absolute top-20 -right-4 glass-card p-3 rounded-2xl shadow-xl bg-white/90 backdrop-blur-xl flex items-center gap-2 z-20"
            >
              <Activity className="w-4 h-4 text-primary-500 animate-pulse" />
              <span className="font-bold text-xs">Processing Neural Activity...</span>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Infinite Rolling Tabs Section */}
      <section className="relative z-10 py-8 bg-white/40 backdrop-blur-md border-y border-slate-200/50 overflow-hidden">
        <div className="flex whitespace-nowrap overflow-hidden">
          <div className="animate-marquee flex items-center gap-8 px-4">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 border border-slate-200 text-slate-600 text-sm font-medium whitespace-nowrap shadow-sm hover:border-primary-300 hover:text-primary-700 transition-colors cursor-default"
              >
                <Zap className="w-4 h-4 text-accent-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 1: Speech & Language */}
      <section className="relative z-10 py-32 px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative w-full aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/50"
          >
            <Image 
              src="/speech_analysis.png" 
              alt="Speech Analysis Waves" 
              fill 
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div variants={fadeUp} className="p-4 bg-white shadow-sm w-fit rounded-2xl text-primary-600 mb-6 border border-slate-100">
              <Mic className="w-8 h-8" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display font-bold mb-6 text-slate-900 leading-tight">
              Acoustic & Linguistic <br/> Biomarkers
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 mb-8 leading-relaxed">
              Our system captures brief voice recordings and employs <strong className="text-primary-700">Wav2Vec2</strong> to extract deep acoustic features. Simultaneously, <strong className="text-primary-700">Whisper</strong> transcribes the audio, feeding it into a <strong className="text-primary-700">BERT</strong> model to analyze vocabulary complexity, coherence, and repetition.
            </motion.p>
            <motion.ul variants={staggerContainer} className="space-y-4">
              {[
                "Pitch variance & Speech rate analysis",
                "Semantic coherence & Vocabulary tracking",
                "Real-time processing with >95% accuracy"
              ].map((item, i) => (
                <motion.li variants={fadeUp} key={i} className="flex items-center gap-4 text-slate-700 font-medium">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100 shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* Epic Parallax Section */}
      <section ref={parallaxRef} className="relative z-10 h-[70vh] min-h-[600px] w-full overflow-hidden flex items-center justify-center border-y border-slate-200">
        <motion.div 
          style={{ y: bgY }}
          className="absolute inset-[-60%] w-[220%] h-[220%]"
        >
          <Image 
            src="/hero_medical_ai.png" 
            alt="Parallax Background" 
            fill 
            className="object-cover opacity-20 saturate-[0.8]"
          />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/10" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            viewport={{ once: true }}
            className="max-w-xl"
          >
            <h2 className="text-5xl md:text-6xl font-display font-black mb-6 text-slate-900 leading-tight">
              A Leap Forward in <br/> <span className="text-gradient italic">Early Intervention</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 font-light leading-relaxed">
              By detecting subtle cognitive decline years before clinical symptoms manifest, we empower patients and researchers with actionable time.
            </p>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-100 font-bold text-slate-800"
            >
              <Database className="w-6 h-6 text-primary-500" /> 
              <span className="text-lg">Over 10,000+ Profiles Analyzed</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature 2: Memory & Cognition */}
      <section className="relative z-10 py-32 px-8 bg-white/50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="order-2 lg:order-1"
          >
            <motion.div variants={fadeUp} className="p-4 bg-white shadow-sm w-fit rounded-2xl text-accent-600 mb-6 border border-slate-100">
              <Brain className="w-8 h-8" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display font-bold mb-6 text-slate-900 leading-tight">
              Cognitive Load & <br/> Memory Tasks
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 mb-8 leading-relaxed">
              We complement speech analysis with digitized immediate and delayed recall tasks. By measuring the accuracy and latency of recalled items, the <strong className="text-accent-700">Memory Module</strong> generates a precise cognitive score simulating the traditional MMSE.
            </motion.p>
            <motion.div variants={fadeUp} className="glass-panel p-8 rounded-3xl border-slate-200 bg-white/80 shadow-lg">
              <h4 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-500" /> Immediate Recall Phase
              </h4>
              <div className="flex gap-3 mb-6">
                {["Apple", "Table", "Penny"].map((w, i) => (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.2 + 0.5 }}
                    key={w} 
                    className="px-5 py-2 bg-slate-50 text-slate-700 rounded-xl shadow-sm text-sm font-bold border border-slate-100"
                  >
                    {w}
                  </motion.span>
                ))}
              </div>
              <h4 className="font-bold mb-2 text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Delayed Recall Phase (Wait 5 mins)
              </h4>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="order-1 lg:order-2 relative w-full aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/50"
          >
            <Image 
              src="/memory_cognitive.png" 
              alt="Memory Node Network" 
              fill 
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
        </div>
      </section>

      {/* Multimodal Fusion Bottom CTA */}
      <section className="relative z-10 py-32 px-8 bg-slate-900 text-white overflow-hidden text-center rounded-t-[4rem]">
        <div className="absolute inset-0 z-0">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary-600/10 blur-[150px] rounded-full" 
           />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <Target className="w-16 h-16 text-primary-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-6xl font-display font-black mb-6 leading-tight">
            The Power of <span className="italic font-light">Multimodal Fusion</span>
          </h2>
          <p className="text-xl text-slate-300 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
            By concatenating audio features, linguistic representations, and memory scores, our final network outputs a highly reliable Risk Probability and Cognitive Score.
          </p>
          <Link href="/assessment">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-slate-900 px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-100 transition-colors shadow-2xl"
            >
              Experience the Assessment Flow
            </motion.button>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
