"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Brain, ArrowRight, Loader2, StopCircle, CheckCircle2, BookOpen, Clock, MapPin, Target, SkipForward } from "lucide-react";
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

  useEffect(() => {
    setCurrentParagraph(getRandomItem(PARAGRAPHS));
    setCurrentWords(getRandomItem(WORD_POOLS));
    setCurrentFluencyCategory(getRandomItem(FLUENCY_CATEGORIES));
    setCurrentPairedWords(getRandomItem(PAIRED_WORDS_POOLS));
    setCurrentPicture(getRandomItem(PICTURE_POOLS));
    setIsMounted(true);
  }, []);

  // Global State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);

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
    setSkippedSteps(prev => [...prev, currentStep]);
    handleNextStep(currentStep);
  };

  const handleNextStep = (currentStep: number) => {
    if (isRecording) handleStopRecording();
    setSubStep('memorize');
    
    if (currentStep === 6) {
       handleSubmit();
    } else {
       setStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || 'anonymous';
      const timestamp = Date.now();

      // 1. Upload to Supabase Storage if the bucket exists
      if (readingBlob && !skippedSteps.includes(1)) {
        await supabase.storage
          .from('audio-recordings')
          .upload(`${userId}/${timestamp}_reading.webm`, readingBlob, {
            contentType: 'audio/webm',
            upsert: false
          }).catch(err => console.error("Failed to upload reading audio to Supabase:", err));
      }

      if (spontaneousBlob && !skippedSteps.includes(4)) {
        await supabase.storage
          .from('audio-recordings')
          .upload(`${userId}/${timestamp}_spontaneous.webm`, spontaneousBlob, {
            contentType: 'audio/webm',
            upsert: false
          }).catch(err => console.error("Failed to upload spontaneous audio to Supabase:", err));
      }

      // 2. Send exactly the same data to the Python backend for analysis
      const formData = new FormData();
      if (readingBlob && !skippedSteps.includes(1)) formData.append("audio_reading", readingBlob, "reading.webm");
      if (spontaneousBlob && !skippedSteps.includes(4)) formData.append("audio_spontaneous", spontaneousBlob, "spontaneous.webm");
      
      const writtenData = {
        skippedSteps: skippedSteps,
        immediateRecall: skippedSteps.includes(2) ? null : { original: currentWords, answer: immediateRecall },
        fluencyTest: skippedSteps.includes(3) ? null : { semantic: semanticFluency },
        pairedTest: skippedSteps.includes(5) ? null : { original: currentPairedWords, answers: pairedAnswers },
        delayedRecall: skippedSteps.includes(6) ? null : { original: currentWords, answer: delayedRecall },
        readingText: currentParagraph
      };
      
      formData.append("writtenData", JSON.stringify(writtenData));

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const result = await response.json();
      
      if (result.success) {
        sessionStorage.setItem('assessmentResult', JSON.stringify(result));
      }
      router.push("/results");
    } catch (error) {
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
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Paragraph Reading */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-card p-8 rounded-[3rem] bg-white max-w-3xl mx-auto border border-slate-200 w-full text-center">
                <div className="inline-flex p-4 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 mb-4"><BookOpen className="w-8 h-8" /></div>
                <h2 className="text-3xl font-display font-bold mb-4">Paragraph Reading</h2>
                <p className="text-slate-600 mb-6">Please read the following paragraph aloud in your normal speaking voice.</p>
                <div className="p-6 bg-orange-50/50 rounded-2xl text-xl text-slate-800 text-justify mb-8 border border-orange-100 font-medium leading-relaxed">{currentParagraph}</div>
                
                {!isRecording && !readingBlob && (
                  <button onClick={() => handleStartRecording(setReadingBlob)} className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 mx-auto"><Mic /> Start Recording</button>
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
                  <p className="text-slate-600">{subStep === 'memorize' ? "Memorize these 5 unrelated words. You will be asked to recall them later." : "Type the 5 words you just memorized."}</p>
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
                    <input type="text" value={immediateRecall} onChange={e => setImmediateRecall(e.target.value)} placeholder="Word1 Word2 Word3..." className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none mb-8 text-lg" />
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
                      You will have 60 seconds to name as many {currentFluencyCategory} as you can. Separate by commas or spaces.
                    </p>
                    <button onClick={() => setFluencyActive(true)} className="bg-emerald-600 text-white px-10 py-4 rounded-full font-bold text-lg">Start 60s Timer</button>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-black text-emerald-600 mb-4">{fluencyTimer}s</div>
                    <textarea value={semanticFluency} onChange={e => setSemanticFluency(e.target.value)} disabled={!fluencyActive} className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 mb-6" placeholder="Dog, Cat, Elephant..." />
                    
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
                      <button onClick={() => handleStartRecording(setSpontaneousBlob)} className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2"><Mic /> Start Recording</button>
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
                <p className="text-slate-600 mb-8">Type the 5 unrelated words you memorized at the very beginning of the assessment.</p>
                
                <input type="text" value={delayedRecall} onChange={e => setDelayedRecall(e.target.value)} placeholder="Word1 Word2 Word3..." className="w-full max-w-md mx-auto block p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-500 outline-none mb-8 text-lg" />
                
                <button onClick={handleSubmit} disabled={isSubmitting} className="bg-slate-900 text-white px-10 py-5 rounded-full font-bold text-xl flex items-center justify-center gap-2 mx-auto disabled:opacity-70">
                  {isSubmitting ? <><Loader2 className="animate-spin"/> Processing Analysis...</> : "Submit Assessment"}
                </button>
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button onClick={() => handleSkip(6)} className="text-slate-400 hover:text-slate-600 font-semibold flex items-center justify-center gap-2 mx-auto"><SkipForward className="w-4 h-4"/> Skip & Submit</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
