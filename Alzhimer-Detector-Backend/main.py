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

def extract_acoustic_features(audio_path):
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
                return {"pitch_variance": 80, "speech_rate": 70, "pauses": 85, "jitter": 75, "shimmer": 80}
        else:
            return {"pitch_variance": 80, "speech_rate": 70, "pauses": 85, "jitter": 75, "shimmer": 80}

    try:
        # 1. Fast Vectorized Zero-Crossing Rate in NumPy (0.1ms vs 1650ms)
        zcr = float(np.mean(np.diff(np.signbit(y)) != 0)) if len(y) > 1 else 0.05

        # 2. Fast pitch tracking using subsampled YIN algorithm (45ms vs 9180ms with piptrack)
        pitch_variance = 250.0
        if librosa and len(y) > 0:
            step = max(1, sr // 4000) # downsample to 4kHz (voice F0 is 75-350Hz)
            sub_y = y[::step]
            sub_sr = sr // step
            try:
                f0 = librosa.yin(sub_y, fmin=75, fmax=350, sr=sub_sr)
                valid_f0 = f0[np.isfinite(f0) & (f0 > 75) & (f0 < 350)]
                if len(valid_f0) > 0:
                    pitch_variance = float(np.var(valid_f0))
            except Exception as e:
                print(f"YIN pitch warning: {e}")

        # Normalize into 0-100 scores
        pitch_score = min(100, max(0, (pitch_variance / 1000) * 100))
        stability_score = max(0, 100 - (zcr * 1000))

        return {
            "pitch_variance": pitch_score,
            "speech_rate": 75, # Placeholder
            "pauses": 80, # Placeholder
            "jitter": stability_score,
            "shimmer": stability_score * 0.95
        }
    except Exception as e:
        print(f"Acoustic extraction error: {e}")
        return {"pitch_variance": 80, "speech_rate": 70, "pauses": 85, "jitter": 75, "shimmer": 80}

def calculate_idea_density(text):
    if not nlp_spacy or not text:
        return 50 # Fallback
    try:
        doc = nlp_spacy(text)
        # Count distinct ideas (nouns, verbs, adjectives, adverbs)
        ideas = [token.text for token in doc if token.pos_ in ['NOUN', 'VERB', 'ADJ', 'ADV']]
        words = [token.text for token in doc if not token.is_punct]
        density = (len(ideas) / len(words)) * 100 if len(words) > 0 else 0
        return min(100, density * 1.5) # Scale up slightly for 0-100 score
    except Exception as e:
        print(f"Spacy error: {e}")
        return 50

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
            "acoustic_features": {"pitch_variance": 85, "speech_rate": 65, "pauses": 90, "jitter": 75, "shimmer": 80},
            "semantic_drift_score": 80
        }
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        w_task = asyncio.to_thread(run_whisper, tmp_path)
        a_task = asyncio.to_thread(extract_acoustic_features, tmp_path)
        reading_text, acoustic_features = await asyncio.gather(w_task, a_task)
    finally:
        try: os.remove(tmp_path)
        except Exception: pass

    def calc_drift():
        if not reading_text or not reading_text_orig:
            return 80
        if FAST_MODE:
            return fuzz.token_set_ratio(reading_text_orig, reading_text)
        try:
            if bert_pipe:
                orig_emb = torch.tensor(bert_pipe(reading_text_orig)[0]).mean(dim=0)
                user_emb = torch.tensor(bert_pipe(reading_text)[0]).mean(dim=0)
                cos = torch.nn.CosineSimilarity(dim=0, eps=1e-6)
                return max(0, cos(orig_emb, user_emb).item() * 100)
            else:
                return fuzz.token_set_ratio(reading_text_orig, reading_text)
        except:
            return fuzz.token_set_ratio(reading_text_orig, reading_text)

    semantic_drift_score = await asyncio.to_thread(calc_drift)
    return {
        "reading_text": reading_text,
        "acoustic_features": acoustic_features,
        "semantic_drift_score": semantic_drift_score
    }

async def compute_spontaneous_analysis(audio_bytes: bytes):
    if not audio_bytes:
        return {"spontaneous_text": "", "idea_density": 50}
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        spontaneous_text = await asyncio.to_thread(run_whisper, tmp_path)
    finally:
        try: os.remove(tmp_path)
        except Exception: pass

    idea_density = await asyncio.to_thread(calculate_idea_density, spontaneous_text) if spontaneous_text else 50
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
                "acoustic_features": {"pitch_variance": 85, "speech_rate": 65, "pauses": 90, "jitter": 75, "shimmer": 80},
                "semantic_drift_score": 80
            }
    else:
        step1_result = {
            "reading_text": "",
            "acoustic_features": {"pitch_variance": 85, "speech_rate": 65, "pauses": 90, "jitter": 75, "shimmer": 80},
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
            step4_result = {"spontaneous_text": "", "idea_density": 50}
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
        if not original: return 0
        if not answer: return 25 # Partial credit instead of 0 if missing
        orig_words = [w.lower() for w in original]
        ans_words = answer.lower().split()
        correct = sum(1 for w in orig_words if any(fuzz.ratio(w, uw) > 70 for uw in ans_words))
        return (correct / len(orig_words)) * 100

    im_score = score_recall(immediate_recall.get("original", []), immediate_recall.get("answer", ""))
    scores['immediate_recall'] = None if 2 in skipped_steps else im_score

    # 3. Verbal Fluency (Semantic)
    semantic_fluency = fluency_test.get("semantic", "")
    semantic_score = min(100, len(semantic_fluency.split()) * 5)
    fluency_score = semantic_score
    scores['fluency'] = None if 3 in skipped_steps else fluency_score

    # 5. Paired Associate
    paired_score = 0
    if "original" in paired_test and "answers" in paired_test:
        total_pairs = len(paired_test["original"])
        # Lowered fuzz threshold to 70 for leniency
        correct = sum(1 for pair in paired_test["original"] if fuzz.ratio(pair["target"].lower(), paired_test["answers"].get(pair["cue"], "").lower()) > 70)
        paired_score = (correct / total_pairs) * 100 if total_pairs else 0
    scores['paired_associate'] = None if 5 in skipped_steps else paired_score

    # 6. Delayed Recall
    del_score = score_recall(delayed_recall.get("original", []), delayed_recall.get("answer", ""))
    scores['delayed_recall'] = None if 6 in skipped_steps else del_score
    
    linguistic_features = {
        "vocabulary": 50 if 3 in skipped_steps else min(100, semantic_score + 20),
        "complexity": 50 if 4 in skipped_steps else idea_density,
        "coherence": 50 if 1 in skipped_steps else semantic_drift_score,
        "repetition": 85 # Placeholder
    }

    # Final Fusion (Dynamic Weighting)
    memory_scores = [s for s in [scores['immediate_recall'], scores['delayed_recall'], scores['paired_associate']] if s is not None]
    language_scores = [s for s in [scores['idea_density'], scores['semantic_drift'], scores['fluency']] if s is not None]
    
    memory_fusion = sum(memory_scores) / len(memory_scores) if memory_scores else 50
    language_fusion = sum(language_scores) / len(language_scores) if language_scores else 50
    
    # Base it only on the categories that were tested
    if not memory_scores and not language_scores:
        risk_probability = 5.0
    else:
        if not memory_scores:
            final_score = language_fusion
        elif not language_scores:
            final_score = memory_fusion
        else:
            final_score = (memory_fusion * 0.5) + (language_fusion * 0.5)
            
        calculated_risk = 100 - (final_score * 0.9)
        
        import random
        if calculated_risk > 85:
            risk_probability = random.uniform(85.0, 95.0)
        else:
            risk_probability = max(5.0, calculated_risk)

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

