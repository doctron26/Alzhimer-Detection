"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Brain, ArrowRight, Loader2, StopCircle, CheckCircle2, BookOpen, Clock, MapPin, Target, SkipForward, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet, which makes it an interesting linguistic tool. Yesterday, it rained heavily in the afternoon, causing small puddles to form along the cobblestone paths.",
  "In a small village nestled between rolling green hills, an old baker wakes up before dawn every day. The smell of fresh bread drifts through the quiet streets as the sun slowly rises, painting the morning sky in shades of pink and orange.",
  "Advances in technology have significantly changed the way we communicate with one another. While it is easier than ever to send a message across the globe in seconds, some argue that face-to-face interactions are becoming less frequent.",
  "The old library was a sanctuary of silence and dust. Tall oak shelves reached towards the vaulted ceiling, packed with leather-bound books that carried the faint scent of vanilla and decaying paper.",
  "A gentle breeze swept through the autumn forest, rustling the golden leaves before they fell to the damp earth. Squirrels hurriedly gathered acorns, preparing for the fast-approaching winter chill.",
  "Early in the morning, a harbor comes alive with the sound of clinking ropes against metal masts. Fishermen prepare their nets while seagulls circle above, waiting for the first boats to return with the day's catch.",
  "Deep inside the antique shop, a pendulum clock ticked steadily against the wooden wall. Sunlight streamed through a stained glass lamp, casting vibrant patches of ruby red and sapphire blue across the polished mahogany floor.",
  "The botanical garden featured a glass conservatory filled with exotic tropical plants. Visitors walked along winding gravel paths, admiring orchid petals dripping with dew while listening to water trickling from a stone fountain.",
  "Walking through the mountain trail, hikers paused to look at the snow-capped peaks in the distance. Clear alpine streams cascaded over granite boulders, refreshing travelers before they continued their journey upward.",
  "A farmer worked tirelessly in the open fields as summer turned into harvest season. Golden stalks of wheat swayed under the afternoon breeze, promising a bountiful crop before the colder months arrived.",
  "The carpenter carefully measured each piece of cedar wood before making a cut. With years of craftsmanship, he transformed rough timber into a sturdy dining table that would host family meals for generations.",
  "On clear winter evenings, stargazers gathered on the open hilltop away from city lights. The constellations shone brightly across the ink-black expanse, offering a breathtaking glimpse into the vastness of space."
];

const PAIRED_WORDS_POOLS = [
  [
    { cue: "Sun", target: "Shoe" },
    { cue: "Dog", target: "Chair" },
    { cue: "River", target: "Coin" },
    { cue: "Apple", target: "Table" }
  ],
  [
    { cue: "Bird", target: "Car" },
    { cue: "Book", target: "Tree" },
    { cue: "Moon", target: "Cup" },
    { cue: "Fire", target: "Glass" }
  ],
  [
    { cue: "Star", target: "Hat" },
    { cue: "Fish", target: "Door" },
    { cue: "Mountain", target: "Pen" },
    { cue: "Cloud", target: "Clock" }
  ],
  [
    { cue: "Cat", target: "Window" },
    { cue: "Train", target: "Apple" },
    { cue: "Grass", target: "Spoon" },
    { cue: "Rain", target: "Piano" }
  ],
  [
    { cue: "Snow", target: "Bottle" },
    { cue: "Key", target: "Horse" },
    { cue: "Wall", target: "Flower" },
    { cue: "Boat", target: "Mirror" }
  ],
  [
    { cue: "Gold", target: "Bridge" },
    { cue: "Leaf", target: "Pencil" },
    { cue: "Ocean", target: "Ring" },
    { cue: "Bread", target: "Glove" }
  ],
  [
    { cue: "Road", target: "Apple" },
    { cue: "Window", target: "Drum" },
    { cue: "Silver", target: "Boot" },
    { cue: "Forest", target: "Cup" }
  ],
  [
    { cue: "Iron", target: "Castle" },
    { cue: "Wind", target: "Mirror" },
    { cue: "Honey", target: "Shoe" },
    { cue: "Garden", target: "Bell" }
  ],
  [
    { cue: "Crown", target: "River" },
    { cue: "Paper", target: "Nest" },
    { cue: "Stone", target: "Candle" },
    { cue: "Milk", target: "Feather" }
  ],
  [
    { cue: "Wheat", target: "Clock" },
    { cue: "Rope", target: "Island" },
    { cue: "Salt", target: "Basket" },
    { cue: "Pearl", target: "Hammer" }
  ],
  [
    { cue: "Tower", target: "Leaf" },
    { cue: "Sand", target: "Whistle" },
    { cue: "Flame", target: "Wheel" },
    { cue: "Needle", target: "Bridge" }
  ],
  [
    { cue: "Diamond", target: "Garden" },
    { cue: "Clay", target: "Boat" },
    { cue: "Grass", target: "Lamp" },
    { cue: "Smoke", target: "Crown" }
  ]
];

const WORD_POOLS = [
  ["Apple", "Table", "Penny", "Elephant", "River"],
  ["Orange", "Chair", "Nickel", "Lion", "Lake"],
  ["Banana", "Desk", "Dime", "Tiger", "Ocean"],
  ["Grape", "Sofa", "Quarter", "Bear", "Pond"],
  ["Peach", "Lamp", "Dollar", "Wolf", "Stream"],
  ["Velvet", "Church", "Daisy", "Red", "Silk"],
  ["Carrot", "Piano", "Blanket", "Eagle", "Canyon"],
  ["Cherry", "Bench", "Copper", "Falcon", "Valley"],
  ["Mango", "Couch", "Silver", "Panther", "Harbor"],
  ["Lemon", "Stool", "Jewel", "Dolphin", "Meadow"],
  ["Walnut", "Shelf", "Bronze", "Zebra", "Forest"],
  ["Melon", "Clock", "Ribbon", "Giraffe", "Glacier"],
  ["Plum", "Mirror", "Token", "Camel", "Desert"],
  ["Berry", "Candle", "Shield", "Otter", "Creek"],
  ["Pear", "Guitar", "Marble", "Fox", "Lagoon"]
];

const FLUENCY_CATEGORIES = [
  "ANIMALS",
  "FRUITS",
  "CITIES",
  "COLORS",
  "VEGETABLES",
  "CLOTHING ITEMS",
  "MUSICAL INSTRUMENTS",
  "KITCHEN UTENSILS",
  "BIRDS",
  "OCCUPATIONS & PROFESSIONS",
  "COUNTRIES",
  "VEHICLES & TRANSPORTATION",
  "SPORTS & OUTDOOR GAMES",
  "FURNITURE ITEMS",
  "FLOWERS & TREES",
  "THINGS FOUND IN A SUPERMARKET",
  "TOOLS & HARDWARE",
  "BODY PARTS"
];

const PICTURE_POOLS = [
  "/cookie_theft.png",
  "/living_room_scene.jpg",
  "/beach_scene.jpg",
  "/bakery_scene.jpg",
  "/picnic_scene.png",
  "/kitchen_scene.png",
  "/garden_scene.jpg"
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function Assessment() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState<'memorize' | 'recall'>('memorize');
  
  const [isMounted, setIsMounted] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(PARAGRAPHS[0]);
  const [currentWords, setCurrentWords] = useState<string[]>(WORD_POOLS[0]);
  const [currentFluencyCategory, setCurrentFluencyCategory] = useState(FLUENCY_CATEGORIES[0]);
  const [currentPairedWords, setCurrentPairedWords] = useState<{cue: string, target: string}[]>(PAIRED_WORDS_POOLS[0]);
  const [currentPicture, setCurrentPicture] = useState(PICTURE_POOLS[0]);

  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    setSessionId(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    setCurrentParagraph(getRandomItem(PARAGRAPHS));
    setCurrentWords(getRandomItem(WORD_POOLS));
    setCurrentFluencyCategory(getRandomItem(FLUENCY_CATEGORIES));
    setCurrentPairedWords(getRandomItem(PAIRED_WORDS_POOLS));
    setCurrentPicture(getRandomItem(PICTURE_POOLS));
    setIsMounted(true);
  }, []);

  const triggerPrecomputeStep1 = (blob: Blob) => {
    if (!sessionId) return;
    console.log("⚡ [BACKGROUND] Dispatching Step 1 audio for progressive precomputation...");
    const fd = new FormData();
    fd.append("sessionId", sessionId);
    fd.append("readingText", currentParagraph);
    fd.append("audio_reading", blob, "reading.webm");
    fetch("/api/precompute-step1", { method: "POST", body: fd }).catch(err => {
      console.warn("Precompute Step 1 dispatch error:", err);
    });
  };

  const triggerPrecomputeStep4 = (blob: Blob) => {
    if (!sessionId) return;
    console.log("⚡ [BACKGROUND] Dispatching Step 4 audio for progressive precomputation...");
    const fd = new FormData();
    fd.append("sessionId", sessionId);
    fd.append("audio_spontaneous", blob, "spontaneous.webm");
    fetch("/api/precompute-step4", { method: "POST", body: fd }).catch(err => {
      console.warn("Precompute Step 4 dispatch error:", err);
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const skippedStepsRef = useRef<number[]>([]);

  // Real-time Calculation Progress & Timer State
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcDuration, setCalcDuration] = useState("0.0");
  const [calcStage, setCalcStage] = useState("Initializing neural assessment pipeline...");

  // --- Step 1: Paragraph Reading ---
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);

  // --- Step 2: Immediate Recall ---
  const [immediateRecall, setImmediateRecall] = useState("");

  // --- Step 3: Verbal Fluency (Semantic) ---
  const [semanticFluency, setSemanticFluency] = useState("");
  const [fluencyTimer, setFluencyTimer] = useState(60);
  const [fluencyActive, setFluencyActive] = useState(false);

  useEffect(() => {
    let int: NodeJS.Timeout;
    if (fluencyActive && fluencyTimer > 0) {
      int = setInterval(() => setFluencyTimer(p => p - 1), 1000);
    } else if (fluencyTimer === 0 && fluencyActive) {
      setFluencyActive(false);
    }
    return () => clearInterval(int);
  }, [fluencyActive, fluencyTimer]);

  // --- Audio Recording Logic (Shared) ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = async (onStop: (blob: Blob) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onStop(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Microphone access is required.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Step 4: Spontaneous Speech (Cookie Theft) ---
  const [spontaneousBlob, setSpontaneousBlob] = useState<Blob | null>(null);

  // --- Step 5: Paired Associate ---
  const [pairedAnswers, setPairedAnswers] = useState<Record<string, string>>({});

  // --- Step 6: Delayed Recall ---
  const [delayedRecall, setDelayedRecall] = useState("");

  const handleSkip = (currentStep: number) => {
    const updated = skippedStepsRef.current.includes(currentStep)
      ? skippedStepsRef.current
      : [...skippedStepsRef.current, currentStep];
    skippedStepsRef.current = updated;
    setSkippedSteps(updated);
    handleNextStep(currentStep, updated);
  };

  const handleNextStep = (currentStep: number, passedSkipped?: number[]) => {
    if (isRecording) handleStopRecording();
    setSubStep('memorize');
    
    const activeSkipped = passedSkipped || skippedStepsRef.current;

    // Background precomputation trigger on advance
    if (currentStep === 1 && readingBlob && !activeSkipped.includes(1)) {
      triggerPrecomputeStep1(readingBlob);
    } else if (currentStep === 4 && spontaneousBlob && !activeSkipped.includes(4)) {
      triggerPrecomputeStep4(spontaneousBlob);
    }

    if (currentStep === 6) {
       handleSubmit(activeSkipped);
    } else {
       setStep(currentStep + 1);
    }
  };

  const handleSubmit = async (passedSkipped?: number[] | React.MouseEvent) => {
    setIsSubmitting(true);
    setCalcProgress(12);
    setCalcStage("Securing clinical telemetry & audio recordings...");

    const startTime = performance.now();
    let currentProgress = 12;

    // Real-time stopwatch ticker running every 50ms
    const timerInterval = setInterval(() => {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      setCalcDuration(elapsed);
    }, 50);

    // Progressive pipeline stage simulation while computation completes
    const progressInterval = setInterval(() => {
      if (currentProgress < 92) {
        currentProgress += Math.random() * 7 + 3;
        if (currentProgress > 92) currentProgress = 92;
        setCalcProgress(currentProgress);

        if (currentProgress > 75) {
          setCalcStage("Synthesizing multi-modal memory & cognitive biomarkers...");
        } else if (currentProgress > 50) {
          setCalcStage("Evaluating semantic drift, linguistic density & coherence...");
        } else if (currentProgress > 25) {
          setCalcStage("Extracting acoustic biomarkers & Whisper speech features...");
        }
      }
    }, 320);

    try {
      const activeSkipped = Array.isArray(passedSkipped) 
        ? passedSkipped 
        : (skippedStepsRef.current.length ? skippedStepsRef.current : skippedSteps);
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || 'anonymous';
      const timestamp = Date.now();

      // 1. Upload to Supabase Storage if the bucket exists
      if (readingBlob && !activeSkipped.includes(1)) {
        const { data: rData, error: rErr } = await supabase.storage
          .from('audio-recordings')
          .upload(`${userId}/${timestamp}_reading.webm`, readingBlob, {
            contentType: 'audio/webm',
            upsert: false
          });
        if (rErr) {
          console.error("❌ Failed to upload reading audio to Supabase:", rErr);
        } else {
          console.log("✅ Successfully uploaded reading audio to Supabase:", rData);
        }
      }

      if (spontaneousBlob && !activeSkipped.includes(4)) {
        const { data: sData, error: sErr } = await supabase.storage
          .from('audio-recordings')
          .upload(`${userId}/${timestamp}_spontaneous.webm`, spontaneousBlob, {
            contentType: 'audio/webm',
            upsert: false
          });
        if (sErr) {
          console.error("❌ Failed to upload spontaneous audio to Supabase:", sErr);
        } else {
          console.log("✅ Successfully uploaded spontaneous audio to Supabase:", sData);
        }
      }

      // 2. Identify all genuinely skipped or unattempted tasks
      const isStep2Skipped = activeSkipped.includes(2) || !immediateRecall.trim();
      const isStep3Skipped = activeSkipped.includes(3) || !semanticFluency.trim();
      const isStep5Skipped = activeSkipped.includes(5) || Object.keys(pairedAnswers).length === 0;
      const isStep6Skipped = activeSkipped.includes(6) || !delayedRecall.trim();

      const allSkippedSet = new Set(activeSkipped);
      if (isStep2Skipped) allSkippedSet.add(2);
      if (isStep3Skipped) allSkippedSet.add(3);
      if (isStep5Skipped) allSkippedSet.add(5);
      if (isStep6Skipped) allSkippedSet.add(6);
      if (!readingBlob) allSkippedSet.add(1);
      if (!spontaneousBlob) allSkippedSet.add(4);

      const resolvedSkipped = Array.from(allSkippedSet);

      // 3. Send data to the Python backend for analysis (uses instant precomputed cache)
      const formData = new FormData();
      if (readingBlob && !allSkippedSet.has(1)) formData.append("audio_reading", readingBlob, "reading.webm");
      if (spontaneousBlob && !allSkippedSet.has(4)) formData.append("audio_spontaneous", spontaneousBlob, "spontaneous.webm");
      
      const writtenData = {
        sessionId: sessionId,
        skippedSteps: resolvedSkipped,
        immediateRecall: isStep2Skipped ? null : { original: currentWords, answer: immediateRecall },
        fluencyTest: isStep3Skipped ? null : { semantic: semanticFluency },
        pairedTest: isStep5Skipped ? null : { original: currentPairedWords, answers: pairedAnswers },
        delayedRecall: isStep6Skipped ? null : { original: currentWords, answer: delayedRecall },
        readingText: currentParagraph
      };
      
      formData.append("writtenData", JSON.stringify(writtenData));

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const result = await response.json();
      
      clearInterval(progressInterval);
      clearInterval(timerInterval);

      const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      setCalcDuration(totalElapsed);
      setCalcProgress(100);
      setCalcStage(`✨ Calculation completed in ${totalElapsed}s! Generating Clinical Dashboard...`);

      if (result && result.success) {
        result.calculation_duration = `${totalElapsed}s`;
        sessionStorage.setItem('assessmentResult', JSON.stringify(result));
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      router.push("/results");
    } catch (error) {
      clearInterval(progressInterval);
      clearInterval(timerInterval);
      console.error("Error submitting:", error);
      alert("Failed to submit data.");
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] pt-6 px-4 pb-6 flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <div className="w-full max-w-5xl relative z-10 flex flex-col h-full max-h-[900px]">
        <div className="flex justify-between items-center mb-6 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <Link href="/">
            <h1 className="text-2xl font-black font-display text-slate-900 cursor-pointer">
              Alz<span className="text-primary-600 italic">Detect</span>
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Test {step} of 6</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-primary-500' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pb-4 custom-scrollbar flex flex-col justify-center">
          {isSubmitting ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 md:p-12 rounded-[3rem] bg-white max-w-xl mx-auto border border-slate-200 w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-200/40 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="relative inline-flex p-5 rounded-3xl bg-primary-50 text-primary-600 border border-primary-100 mb-6 shadow-sm">
                  <Brain className="w-10 h-10 animate-pulse text-primary-600" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-display font-black text-slate-900 mb-2">
                  Processing Diagnostics
                </h2>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Extracting acoustic features, NLP linguistic models, and multi-domain risk scores.
                </p>

                {/* Real-Time Stopwatch Display */}
                <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-700 font-bold text-sm">
                    <Clock className="w-4 h-4 text-primary-600 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>Calculation Time</span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono font-black text-2xl text-primary-700">
                    <span>{calcDuration}</span>
                    <span className="text-xs font-bold text-slate-400 font-sans">sec</span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full bg-slate-100 rounded-full h-4 p-0.5 border border-slate-200 mb-3 overflow-hidden shadow-inner">
                  <motion.div 
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
                    style={{ width: `${calcProgress}%` }}
                  />
                </div>

                {/* Progress Details & Status */}
                <div className="flex justify-between items-center text-xs font-bold mb-6 text-slate-400">
                  <span className="text-primary-600 flex items-center gap-1.5 truncate max-w-[80%] text-left font-medium">
                    <Activity className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">{calcStage}</span>
                  </span>
                  <span className="font-mono text-slate-700 font-bold">{Math.round(calcProgress)}%</span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Generating standardized clinical biomarkers & risk report...
                </div>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
            
            {/* STEP 1: Paragraph Reading */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-3xl mx-auto border border-slate-200 w-full text-center">
                <div className="inline-flex p-4 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 mb-4"><BookOpen className="w-8 h-8" /></div>
                <h2 className="text-3xl font-display font-bold mb-4">Paragraph Reading</h2>
                <p className="text-slate-600 mb-6">Please read the following paragraph aloud in your normal speaking voice.</p>
                <div className="p-6 bg-orange-50/50 rounded-2xl text-xl text-slate-800 text-justify mb-8 border border-orange-100 font-medium leading-relaxed">{currentParagraph}</div>
                
                {!isRecording && !readingBlob && (
                  <button onClick={() => handleStartRecording((blob) => { setReadingBlob(blob); triggerPrecomputeStep1(blob); })} className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 mx-auto"><Mic /> Start Recording</button>
                )}
                {isRecording && (
                   <div className="flex flex-col items-center">
                     <span className="text-red-500 font-bold text-xl mb-4">{formatTime(recordingTime)}</span>
                     <button onClick={handleStopRecording} className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold flex gap-2"><StopCircle /> Stop Recording</button>
                   </div>
                )}
                {readingBlob && !isRecording && (
                   <div className="flex flex-col items-center gap-4">
                     <div className="text-emerald-600 font-bold flex items-center gap-2"><CheckCircle2 /> Audio Saved</div>
                     <audio controls src={URL.createObjectURL(readingBlob)} className="w-full max-w-xs" />
                     <button onClick={() => handleNextStep(1)} className="w-full max-w-xs bg-slate-900 text-white py-4 rounded-full font-bold">Continue</button>
                   </div>
                )}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <button onClick={() => handleSkip(1)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip this test</button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Immediate Recall */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-3xl mx-auto border border-slate-200 w-full">
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-4"><Brain className="w-8 h-8" /></div>
                  <h2 className="text-3xl font-display font-bold mb-2">Immediate Word Recall</h2>
                  <p className="text-slate-600">{subStep === 'memorize' ? "Memorize these 5 unrelated words. You will be asked to recall them later." : "Type the 5 words you just memorized. Please separate each word with a comma."}</p>
                </div>
                {subStep === 'memorize' ? (
                  <>
                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                      {currentWords.map(word => (
                        <div key={word} className="px-8 py-4 rounded-2xl text-2xl font-bold bg-slate-50 text-slate-800 border border-slate-200 shadow-sm">{word}</div>
                      ))}
                    </div>
                    <button onClick={() => setSubStep('recall')} className="w-full max-w-sm mx-auto block bg-indigo-600 text-white py-4 rounded-full font-bold">I've memorized them</button>
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={immediateRecall} 
                      onChange={e => setImmediateRecall(e.target.value)} 
                      placeholder="e.g. Apple, Table, Penny, Elephant, River" 
                      className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none mb-2 text-lg" 
                    />
                    <p className="text-xs text-indigo-600 font-semibold mb-6 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Please add a comma after every word (e.g. Word1, Word2, Word3)
                    </p>
                    <button onClick={() => handleNextStep(2)} className="w-full bg-slate-900 text-white py-4 rounded-full font-bold">Continue</button>
                  </>
                )}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={() => handleSkip(2)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip this test</button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Verbal Fluency */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-2xl mx-auto border border-slate-200 w-full text-center">
                <div className="inline-flex p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-4"><Clock className="w-8 h-8" /></div>
                <h2 className="text-3xl font-display font-bold mb-2">Word Recall Fluency</h2>
                
                {!fluencyActive && fluencyTimer === 60 ? (
                  <>
                    <p className="text-slate-600 mb-8">
                      You will have 60 seconds to name as many {currentFluencyCategory} as you can. Please separate each word with a comma.
                    </p>
                    <button onClick={() => setFluencyActive(true)} className="bg-emerald-600 text-white px-10 py-4 rounded-full font-bold text-lg">Start 60s Timer</button>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-black text-emerald-600 mb-4">{fluencyTimer}s</div>
                    <textarea 
                      value={semanticFluency} 
                      onChange={e => setSemanticFluency(e.target.value)} 
                      disabled={!fluencyActive} 
                      className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 mb-2" 
                      placeholder="e.g. Dog, Cat, Elephant, Lion, Tiger..." 
                    />
                    <p className="text-xs text-emerald-600 font-semibold mb-4 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Please add a comma after every word
                    </p>
                    
                    {!fluencyActive && fluencyTimer === 0 && (
                      <button onClick={() => handleNextStep(3)} className="w-full bg-slate-900 text-white py-4 rounded-full font-bold">Continue to Next Test</button>
                    )}
                  </>
                )}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={() => handleSkip(3)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip this test</button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Cookie Theft Picture Description */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-6 bg-white w-full h-full rounded-[2rem] border border-slate-200 flex flex-col md:flex-row gap-6 relative">
                 <div className="md:w-1/2 flex items-center justify-center bg-slate-100 rounded-xl overflow-hidden relative">
                    <Image src={currentPicture} alt="Picture Description Task" fill className="object-contain" />
                 </div>
                 <div className="md:w-1/2 flex flex-col justify-center items-center text-center p-4">
                    <h2 className="text-3xl font-display font-bold mb-4">Picture Description</h2>
                    <p className="text-slate-600 mb-8">Describe everything you see happening in this picture. Please record your spontaneous speech.</p>
                    
                    {!isRecording && !spontaneousBlob && (
                      <button onClick={() => handleStartRecording((blob) => { setSpontaneousBlob(blob); triggerPrecomputeStep4(blob); })} className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2"><Mic /> Start Recording</button>
                    )}
                    {isRecording && (
                       <div className="flex flex-col items-center">
                         <span className="text-red-500 font-bold text-xl mb-4">{formatTime(recordingTime)}</span>
                         <button onClick={handleStopRecording} className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold flex gap-2"><StopCircle /> Stop Recording</button>
                       </div>
                    )}
                    {spontaneousBlob && !isRecording && (
                       <div className="flex flex-col items-center gap-4">
                         <div className="text-emerald-600 font-bold flex items-center gap-2"><CheckCircle2 /> Audio Saved</div>
                         <audio controls src={URL.createObjectURL(spontaneousBlob)} className="w-full max-w-xs" />
                         <button onClick={() => handleNextStep(4)} className="w-full bg-slate-900 text-white py-4 px-8 rounded-full font-bold mt-4">Continue</button>
                       </div>
                    )}
                    <div className="absolute bottom-6 right-6">
                        <button onClick={() => handleSkip(4)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-2"><SkipForward className="w-4 h-4"/> Skip</button>
                    </div>
                 </div>
              </motion.div>
            )}

            {/* STEP 5: Paired Associate */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-3xl mx-auto border border-slate-200 w-full text-center">
                <div className="inline-flex p-4 rounded-2xl bg-accent-50 text-accent-600 border border-accent-100 mb-4"><Target className="w-8 h-8" /></div>
                <h2 className="text-3xl font-display font-bold mb-4">Paired Associate Learning</h2>
                
                {subStep === 'memorize' ? (
                  <>
                    <p className="text-slate-600 mb-8">Memorize the following word pairs.</p>
                    <div className="flex flex-col items-center gap-4 mb-8">
                      {currentPairedWords.map((pair, i) => (
                        <div key={i} className="flex gap-4 items-center">
                          <div className="px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold w-32">{pair.cue}</div>
                          <ArrowRight className="text-slate-400" />
                          <div className="px-6 py-3 rounded-xl bg-accent-50 border border-accent-200 text-accent-700 font-bold w-32">{pair.target}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setSubStep('recall')} className="bg-accent-600 text-white px-10 py-4 rounded-full font-bold">I've memorized them</button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 mb-8">Type the word that was paired with each word below.</p>
                    <div className="flex flex-col items-center gap-4 mb-8">
                      {currentPairedWords.map((pair, i) => (
                        <div key={i} className="flex gap-4 items-center w-full max-w-xs">
                          <div className="px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold w-1/2">{pair.cue}</div>
                          <input type="text" value={pairedAnswers[pair.cue] || ""} onChange={e => setPairedAnswers(p => ({...p, [pair.cue]: e.target.value}))} className="w-1/2 p-3 rounded-xl border border-slate-300 outline-none focus:border-accent-500" />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleNextStep(5)} className="w-full max-w-xs bg-slate-900 text-white py-4 rounded-full font-bold">Continue</button>
                  </>
                )}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={() => handleSkip(5)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip this test</button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Delayed Recall */}
            {step === 6 && (
              <motion.div key="s6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-3xl mx-auto border border-slate-200 w-full text-center">
                <div className="inline-flex p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-4"><Brain className="w-8 h-8" /></div>
                <h2 className="text-3xl font-display font-bold mb-4">Final Word Recall</h2>
                <p className="text-slate-600 mb-6">Type the 5 unrelated words you memorized at the very beginning of the assessment. Please add a comma after every word.</p>
                
                <input 
                  type="text" 
                  value={delayedRecall} 
                  onChange={e => setDelayedRecall(e.target.value)} 
                  placeholder="e.g. Apple, Table, Penny, Elephant, River" 
                  className="w-full max-w-md mx-auto block p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none mb-2 text-lg" 
                />
                <p className="text-xs text-indigo-600 font-semibold mb-8 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Please add a comma after every word (e.g. Word1, Word2, Word3)
                </p>
                
                <button onClick={() => handleSubmit()} disabled={isSubmitting} className="bg-slate-900 text-white px-10 py-5 rounded-full font-bold text-xl flex items-center justify-center gap-2 mx-auto disabled:opacity-70">
                  Submit Assessment
                </button>
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={() => handleSkip(6)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip & Submit</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
