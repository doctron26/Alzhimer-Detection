from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import json
import os
import tempfile
import gc
from google import genai
from dotenv import load_dotenv

load_dotenv()
from typing import Optional
import numpy as np

# Import ML Libraries
import torch
# Dynamically allocate optimal CPU threads instead of choking on 1 thread
torch.set_num_threads(min(8, max(1, os.cpu_count() or 4)))
from transformers import pipeline
from fuzzywuzzy import fuzz

# Set this to True to bypass heavy local HuggingFace models for instant results
FAST_MODE = False

# New imports for advanced biomarkers
try:
    import librosa
except ImportError:
    librosa = None

try:
    import soundfile as sf
except ImportError:
    sf = None

try:
    import spacy
except Exception:
    spacy = None

app = FastAPI(title="Alzheimer's Detector ML API - Phase 4")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globally initialize ML Pipelines to improve response time
print("Loading ML models...")
try:
    # Use English-optimized Whisper-tiny.en for 100x faster transcription speed
    whisper_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny.en")
    bert_pipe = pipeline("feature-extraction", model="distilbert-base-uncased")
except Exception as e:
    print(f"Error loading huggingface pipelines: {e}")
    whisper_pipe = None
    bert_pipe = None

if spacy:
    try:
        nlp_spacy = spacy.load("en_core_web_sm")
    except Exception as e:
        print(f"Spacy load error: {e}")
        nlp_spacy = None
else:
    nlp_spacy = None
print("ML models loaded!")

# Warm up numba JIT compiler on a tiny dummy array during startup so first user request doesn't lag
if librosa:
    try:
        dummy_y = np.zeros(400, dtype=np.float32)
        _ = librosa.yin(dummy_y, fmin=75, fmax=350, sr=4000, frame_length=256, hop_length=128)
    except Exception:
        pass

def extract_acoustic_features(audio_path, transcript_text=""):
    # Ultra-fast audio loading using soundfile (1ms vs 2840ms with librosa.load)
    y = None
    sr = 16000
    if sf:
        try:
            y, sr = sf.read(audio_path)
            if len(y.shape) > 1:
                y = np.mean(y, axis=1) # stereo to mono
            y = y.astype(np.float32)
        except Exception:
            y = None

    if y is None:
        if librosa:
            try:
                y, sr = librosa.load(audio_path, sr=16000)
            except Exception as e:
                print(f"Audio loading error: {e}")
                return {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0}
        else:
            return {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0}

    if len(y) == 0:
        return {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0}

    try:
        duration_sec = float(len(y)) / float(sr)

        # 1. Fast Vectorized Zero-Crossing Rate in NumPy (0.1ms)
        zcr = float(np.mean(np.diff(np.signbit(y)) != 0)) if len(y) > 1 else 0.05

        # 2. Fast Short-Time Frame RMS via Strided NumPy (< 0.7ms)
        frame_len = int(sr * 0.025) # 25ms window
        hop_len = int(sr * 0.010)   # 10ms hop
        if len(y) >= frame_len:
            shape = ((len(y) - frame_len) // hop_len, frame_len)
            strides = (y.strides[0] * hop_len, y.strides[0])
            frames = np.lib.stride_tricks.as_strided(y, shape=shape, strides=strides)
            rms = np.sqrt(np.mean(frames**2, axis=1))
        else:
            rms = np.array([np.sqrt(np.mean(y**2))], dtype=np.float32)

        # 3. Dynamic Pauses Analysis (Voice Activity Detection)
        max_rms = float(np.max(rms)) if len(rms) > 0 else 0.0
        threshold = max(0.005, max_rms * 0.15)
        is_silent = rms < threshold
        pause_ratio = float(np.mean(is_silent)) if len(is_silent) > 0 else 0.0
        # Optimal conversational pause ratio is ~15-25%. Prolonged hesitations drop the score.
        pauses_score = round(max(5.0, min(100.0, 100.0 - (abs(pause_ratio - 0.20) * 125.0))), 1)

        # 4. Fast Subsampled Pitch Tracking & Pitch Variance
        pitch_variance = 0.0
        valid_f0 = np.array([], dtype=np.float32)
        if librosa and len(y) >= 1000:
            step = max(1, sr // 4000) # downsample to 4kHz (voice F0 is 75-350Hz)
            sub_y = y[::step]
            sub_sr = sr // step
            try:
                f0 = librosa.yin(sub_y, fmin=75, fmax=350, sr=sub_sr, frame_length=256, hop_length=128)
                valid_f0 = f0[np.isfinite(f0) & (f0 > 75) & (f0 < 350)]
                if len(valid_f0) > 0:
                    pitch_variance = float(np.var(valid_f0))
            except Exception as e:
                print(f"YIN pitch warning: {e}")

        # Normal human pitch variance is ~150-400 Hz^2; flat monotone speech has low variance
        pitch_score = round(min(100.0, max(5.0, (pitch_variance / 400.0) * 100.0)), 1)

        # 5. Dynamic Vocal Jitter (Cycle-to-cycle pitch period perturbation)
        if len(valid_f0) > 3:
            t0_periods = 1.0 / valid_f0
            jitt_rel = float(np.mean(np.abs(np.diff(t0_periods)))) / max(1e-6, float(np.mean(t0_periods)))
            # Normal vocal jitter is < 1.04%. Elevated jitter indicates vocal instability
            jitter_score = round(max(5.0, min(100.0, 100.0 - (jitt_rel * 1400.0))), 1)
        else:
            jitter_score = round(max(5.0, min(100.0, 100.0 - (zcr * 1000.0))), 1)

        # 6. Dynamic Vocal Shimmer (Cycle-to-cycle amplitude perturbation in voiced frames)
        voiced_rms = rms[rms >= threshold]
        if len(voiced_rms) > 3:
            shim_rel = float(np.mean(np.abs(np.diff(voiced_rms)))) / max(1e-6, float(np.mean(voiced_rms)))
            # Normal vocal shimmer is < 3.8%. Elevated shimmer indicates amplitude tremor
            shimmer_score = round(max(5.0, min(100.0, 100.0 - (shim_rel * 450.0))), 1)
        else:
            shimmer_score = round(max(5.0, min(100.0, jitter_score * 0.95)), 1)

        # 7. Dynamic Speech Rate (Words Per Minute / Syllabic Rate)
        if transcript_text and transcript_text.strip():
            words = [w for w in transcript_text.split() if len(w) > 0]
            wpm = (len(words) / max(0.5, duration_sec)) * 60.0
            # Target conversational reading rate is ~140 WPM
            speech_rate_score = round(max(5.0, min(100.0, (wpm / 140.0) * 85.0)), 1)
        else:
            # Detect pseudo-syllables from energy envelope bursts
            if len(rms) > 2:
                diff = np.diff((rms >= threshold).astype(int))
                syllables = int(np.sum(diff > 0))
                sps = syllables / max(0.5, duration_sec) # syllables/sec (healthy is ~3.5-4.5)
                speech_rate_score = round(max(5.0, min(100.0, (sps / 3.8) * 80.0)), 1)
            else:
                speech_rate_score = 50.0

        return {
            "pitch_variance": pitch_score,
            "speech_rate": speech_rate_score,
            "pauses": pauses_score,
            "jitter": jitter_score,
            "shimmer": shimmer_score
        }
    except Exception as e:
        print(f"Acoustic extraction error: {e}")
        return {"pitch_variance": 50.0, "speech_rate": 50.0, "pauses": 50.0, "jitter": 50.0, "shimmer": 50.0}

def calculate_idea_density(text):
    if not nlp_spacy or not text or not text.strip():
        return 0.0
    try:
        doc = nlp_spacy(text)
        # Count distinct ideas (nouns, verbs, adjectives, adverbs)
        ideas = [token.text for token in doc if token.pos_ in ['NOUN', 'VERB', 'ADJ', 'ADV']]
        words = [token.text for token in doc if not token.is_punct and not token.is_space]
        if not words:
            return 0.0
        density = (len(ideas) / len(words)) * 100.0
        # Normal English conversational idea density is ~45-55%
        return round(min(100.0, max(0.0, density * 1.6)), 1)
    except Exception as e:
        print(f"Spacy error: {e}")
        return 0.0

def calculate_repetition_score(text):
    """Calculates vocabulary diversity and Type-Token Ratio (TTR). Low score indicates perseveration."""
    if not text or not text.strip():
        return 0.0
    words = [w.strip(".,!?;:\"").lower() for w in text.split() if len(w.strip(".,!?;:\"")) > 1]
    if not words:
        return 0.0
    unique_words = set(words)
    ttr = len(unique_words) / len(words)
    # Higher TTR means high lexical diversity (low pathological repetition)
    return round(min(100.0, max(5.0, ttr * 125.0)), 1)

@app.get("/")
def read_root():
    return {"message": "Alzheimer's Detector ML Backend is running with Models."}

import asyncio

def run_whisper(path):
    if FAST_MODE:
        return "The quick brown fox jumps over the lazy dog. This sentence contains every letter."
    if not whisper_pipe: return ""
    try:
        # Fast greedy decoding on English model
        res = whisper_pipe(path, generate_kwargs={"temperature": 0.0, "num_beams": 1})
        return res["text"] if isinstance(res, dict) else ""
    except Exception as e:
        print(f"Whisper error: {e}")
        return ""

# In-memory session store for progressive precomputation
PRECOMPUTE_CACHE = {}

def clean_stale_sessions():
    now = time.time()
    stale_keys = [k for k, v in PRECOMPUTE_CACHE.items() if now - v.get("created_at", now) > 1800]
    for k in stale_keys:
        PRECOMPUTE_CACHE.pop(k, None)

def get_or_create_session(session_id: str):
    clean_stale_sessions()
    if session_id not in PRECOMPUTE_CACHE:
        PRECOMPUTE_CACHE[session_id] = {
            "created_at": time.time(),
            "step1_task": None,
            "step4_task": None
        }
    return PRECOMPUTE_CACHE[session_id]

async def compute_reading_analysis(audio_bytes: bytes, reading_text_orig: str):
    if not audio_bytes:
        return {
            "reading_text": "",
            "acoustic_features": {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0},
            "semantic_drift_score": None
        }
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        # Step 1: Run Whisper transcription
        reading_text = await asyncio.to_thread(run_whisper, tmp_path)
        # Step 2: Extract acoustic features with speech text passed for WPM speech rate
        acoustic_features = await asyncio.to_thread(extract_acoustic_features, tmp_path, reading_text)
    finally:
        try: os.remove(tmp_path)
        except Exception: pass

    def calc_drift():
        if not reading_text or not reading_text_orig:
            return 0.0
        if FAST_MODE:
            return float(fuzz.token_set_ratio(reading_text_orig, reading_text))
        try:
            if bert_pipe:
                orig_emb = torch.tensor(bert_pipe(reading_text_orig)[0]).mean(dim=0)
                user_emb = torch.tensor(bert_pipe(reading_text)[0]).mean(dim=0)
                cos = torch.nn.CosineSimilarity(dim=0, eps=1e-6)
                sim = cos(orig_emb, user_emb).item()
                # Map cosine similarity to 0-100 scale dynamically
                drift_score = max(0.0, min(100.0, ((sim - 0.35) / 0.65) * 100.0))
                return round(drift_score, 1)
            else:
                return float(fuzz.token_set_ratio(reading_text_orig, reading_text))
        except:
            return float(fuzz.token_set_ratio(reading_text_orig, reading_text))

    semantic_drift_score = await asyncio.to_thread(calc_drift)
    return {
        "reading_text": reading_text,
        "acoustic_features": acoustic_features,
        "semantic_drift_score": semantic_drift_score
    }

async def compute_spontaneous_analysis(audio_bytes: bytes):
    if not audio_bytes:
        return {"spontaneous_text": "", "idea_density": None}
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        spontaneous_text = await asyncio.to_thread(run_whisper, tmp_path)
    finally:
        try: os.remove(tmp_path)
        except Exception: pass

    idea_density = await asyncio.to_thread(calculate_idea_density, spontaneous_text) if spontaneous_text else 0.0
    return {
        "spontaneous_text": spontaneous_text,
        "idea_density": idea_density
    }

@app.post("/api/precompute-step1")
async def precompute_step1(
    sessionId: str = Form(...),
    readingText: str = Form(""),
    audio_reading: UploadFile = File(...)
):
    print(f"--- [PROGRESSIVE ML] Precomputing Step 1 in background for session {sessionId} ---")
    session = get_or_create_session(sessionId)
    audio_bytes = await audio_reading.read()
    session["step1_task"] = asyncio.create_task(compute_reading_analysis(audio_bytes, readingText))
    return {"success": True, "status": "precomputing", "sessionId": sessionId, "step": 1}

@app.post("/api/precompute-step4")
async def precompute_step4(
    sessionId: str = Form(...),
    audio_spontaneous: UploadFile = File(...)
):
    print(f"--- [PROGRESSIVE ML] Precomputing Step 4 in background for session {sessionId} ---")
    session = get_or_create_session(sessionId)
    audio_bytes = await audio_spontaneous.read()
    session["step4_task"] = asyncio.create_task(compute_spontaneous_analysis(audio_bytes))
    return {"success": True, "status": "precomputing", "sessionId": sessionId, "step": 4}

@app.post("/api/analyze")
async def analyze_assessment(
    audio_spontaneous: Optional[UploadFile] = File(None),
    audio_reading: Optional[UploadFile] = File(None),
    writtenData: str = Form(...)
):
    print("--- RECEIVED REQUEST (PHASE 5) ---")
    
    try:
        data = json.loads(writtenData)
    except json.JSONDecodeError:
        return {"success": False, "message": "Invalid JSON in writtenData"}

    session_id = data.get("sessionId")
    session = PRECOMPUTE_CACHE.get(session_id) if session_id else None

    skipped_steps = data.get("skippedSteps", [])
    immediate_recall = data.get("immediateRecall") or {}
    delayed_recall = data.get("delayedRecall") or {}
    fluency_test = data.get("fluencyTest") or {}
    paired_test = data.get("pairedTest") or {}
    reading_text_orig = data.get("readingText", "")

    scores = {}

    # Step 1: Check precomputed background task or fallback
    if 1 not in skipped_steps:
        if session and session.get("step1_task"):
            print(f"--- [PROGRESSIVE ML] Cache hit: Awaiting precomputed Step 1 for session {session_id} ---")
            step1_result = await session["step1_task"]
        elif audio_reading:
            print("--- [FALLBACK] Computing Step 1 synchronously ---")
            audio_bytes = await audio_reading.read()
            step1_result = await compute_reading_analysis(audio_bytes, reading_text_orig)
        else:
            step1_result = {
                "reading_text": "",
                "acoustic_features": {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0},
                "semantic_drift_score": 0.0
            }
    else:
        step1_result = {
            "reading_text": "",
            "acoustic_features": {"pitch_variance": 0.0, "speech_rate": 0.0, "pauses": 0.0, "jitter": 0.0, "shimmer": 0.0},
            "semantic_drift_score": None
        }

    # Step 4: Check precomputed background task or fallback
    if 4 not in skipped_steps:
        if session and session.get("step4_task"):
            print(f"--- [PROGRESSIVE ML] Cache hit: Awaiting precomputed Step 4 for session {session_id} ---")
            step4_result = await session["step4_task"]
        elif audio_spontaneous:
            print("--- [FALLBACK] Computing Step 4 synchronously ---")
            audio_bytes = await audio_spontaneous.read()
            step4_result = await compute_spontaneous_analysis(audio_bytes)
        else:
            step4_result = {"spontaneous_text": "", "idea_density": 0.0}
    else:
        step4_result = {"spontaneous_text": "", "idea_density": None}

    # Clean up session memory cache
    if session_id:
        PRECOMPUTE_CACHE.pop(session_id, None)

    reading_text = step1_result["reading_text"]
    acoustic_features = step1_result["acoustic_features"]
    semantic_drift_score = step1_result["semantic_drift_score"]

    spontaneous_text = step4_result["spontaneous_text"]
    idea_density = step4_result["idea_density"]

    scores['semantic_drift'] = semantic_drift_score
    scores['idea_density'] = idea_density

    # 2. Immediate Recall
    def score_recall(original, answer):
        if not original: return 0.0
        if not answer or not answer.strip(): return 0.0
        orig_words = [w.lower().strip() for w in original if w]
        ans_words = [w.lower().strip() for w in answer.split() if w]
        if not ans_words: return 0.0
        correct = sum(1 for w in orig_words if any(fuzz.ratio(w, uw) > 70 for uw in ans_words))
        return round((correct / len(orig_words)) * 100.0, 1)

    im_score = score_recall(immediate_recall.get("original", []), immediate_recall.get("answer", ""))
    scores['immediate_recall'] = None if 2 in skipped_steps else im_score

    # 3. Verbal Fluency (Semantic)
    semantic_fluency = fluency_test.get("semantic", "")
    fluency_words = list(set([w.strip(".,!?;:\"").lower() for w in semantic_fluency.split() if len(w.strip(".,!?;:\"")) > 1]))
    # 14+ unique category words in 60s is standard healthy benchmark (100%)
    fluency_score = round(min(100.0, max(0.0, (len(fluency_words) / 14.0) * 100.0)), 1)
    scores['fluency'] = None if 3 in skipped_steps else fluency_score

    # 5. Paired Associate
    paired_score = 0.0
    if "original" in paired_test and "answers" in paired_test and paired_test["original"]:
        total_pairs = len(paired_test["original"])
        correct = sum(1 for pair in paired_test["original"] if fuzz.ratio(pair["target"].lower().strip(), paired_test["answers"].get(pair["cue"], "").lower().strip()) > 70)
        paired_score = round((correct / total_pairs) * 100.0, 1) if total_pairs else 0.0
    scores['paired_associate'] = None if 5 in skipped_steps else paired_score

    # 6. Delayed Recall
    del_score = score_recall(delayed_recall.get("original", []), delayed_recall.get("answer", ""))
    scores['delayed_recall'] = None if 6 in skipped_steps else del_score

    # Dynamic linguistic metrics (vocabulary, complexity, coherence, repetition)
    combined_speech = (reading_text + " " + spontaneous_text).strip()
    repetition_score = calculate_repetition_score(combined_speech)

    linguistic_features = {
        "vocabulary": 0.0 if 3 in skipped_steps else fluency_score,
        "complexity": 0.0 if 4 in skipped_steps else (idea_density if idea_density is not None else 0.0),
        "coherence": 0.0 if 1 in skipped_steps else (semantic_drift_score if semantic_drift_score is not None else 0.0),
        "repetition": 0.0 if (1 in skipped_steps and 4 in skipped_steps) else repetition_score
    }

    # Final Fusion (Dynamic Weighting)
    memory_scores = [s for s in [scores['immediate_recall'], scores['delayed_recall'], scores['paired_associate']] if s is not None]
    language_scores = [s for s in [scores['idea_density'], scores['semantic_drift'], scores['fluency']] if s is not None]

    # Rule: If the user skips all tests, risk score must be 100%
    if (len(skipped_steps) == 6) or (not memory_scores and not language_scores):
        risk_probability = 100.0
        print("All tests skipped or no valid inputs provided -> Risk Probability = 100.0%")
    else:
        memory_fusion = sum(memory_scores) / len(memory_scores) if memory_scores else 0.0
        language_fusion = sum(language_scores) / len(language_scores) if language_scores else 0.0

        if not memory_scores:
            final_cognitive_score = language_fusion
        elif not language_scores:
            final_cognitive_score = memory_fusion
        else:
            final_cognitive_score = (memory_fusion * 0.55) + (language_fusion * 0.45)

        # Dynamic risk score: inversely proportional to cognitive performance
        # 100% cognitive performance yields ~5% baseline risk
        # 0% cognitive performance yields 100% risk
        # Intermediate performance varies continuously and smoothly
        calculated_risk = 100.0 - (final_cognitive_score * 0.95)
        risk_probability = round(max(0.0, min(100.0, calculated_risk)), 1)

    print(f"Final Risk Probability: {risk_probability}%")

    return {
        "success": True,
        "message": "Phase 5 ML Analysis Complete",
        "scores": scores,
        "acoustic_data": acoustic_features,
        "linguistic_data": linguistic_features,
        "risk_probability": risk_probability,
        "transcriptions": {
            "spontaneous": spontaneous_text,
            "reading": reading_text
        }
    }

@app.post("/api/webhook")
async def dialogflow_webhook(req: Request):
    """
    Webhook for Google Dialogflow to communicate with our Python backend.
    """
    try:
        body = await req.json()
        print(f"--- WEBHOOK RECEIVED ---")
        
        # Extract information from Dialogflow's request
        query_result = body.get("queryResult", {})
        intent_name = query_result.get("intent", {}).get("displayName", "")
        user_text = query_result.get("queryText", "")
        
        print(f"Intent matched: {intent_name}")
        print(f"User said: {user_text}")

        # Default response if we don't catch a specific intent
        fulfillment_text = f"I received your message in the Python backend! (Matched intent: {intent_name})"

        # Custom Logic based on Intents you create in Dialogflow Console
        if intent_name == "Check Score":
            # Here you could look up a database. For now, we simulate it.
            fulfillment_text = "I checked the backend. Your latest cognitive risk probability is currently calculating..."
        
        elif intent_name == "Start Assessment":
            fulfillment_text = "I can definitely help with that. Please click the 'Launch Assessment' button at the top of the page to begin your cognitive analysis."
            
        elif intent_name == "Default Fallback Intent":
            print("Fallback triggered. Sending to Gemini...")
            gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
            if gemini_api_key:
                try:
                    import time
                    start_time = time.time()
                    client = genai.Client(api_key=gemini_api_key)
                    prompt = f"You are a helpful medical AI specializing in Alzheimer's. A user said: '{user_text}'. Respond in exactly 1 concise sentence."
                    response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
                    
                    if response.text:
                        fulfillment_text = response.text
                    else:
                        fulfillment_text = "I generated a response but it was empty."
                    print(f"Gemini responded in {time.time() - start_time:.2f} seconds")
                except Exception as e:
                    print(f"Gemini error: {e}")
                    fulfillment_text = f"I tried to think about that, but my AI brain encountered an error: {str(e)}"
            else:
                fulfillment_text = "I'm a smart AI, but my Gemini API key is missing from the backend!"

        return {
            "fulfillmentText": fulfillment_text
        }
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"fulfillmentText": "Sorry, the Python backend encountered an error while processing that."}

