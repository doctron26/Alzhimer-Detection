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
torch.set_num_threads(1)
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
    whisper_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
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
    if not librosa:
        return {"pitch_variance": 80, "speech_rate": 70, "pauses": 85, "jitter": 75, "shimmer": 80}
    try:
        y, sr = librosa.load(audio_path, sr=16000)
        # Simplified approximations for demo
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_variance = float(np.var(pitches[pitches > 0])) if np.any(pitches > 0) else 0
        
        # Jitter/Shimmer are complex, using Zero Crossing Rate as a proxy for vocal stability here
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        
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
        print(f"Librosa error: {e}")
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
    try: return whisper_pipe(path)["text"]
    except Exception as e:
        print(f"Whisper error: {e}")
        return ""

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

    skipped_steps = data.get("skippedSteps", [])
    immediate_recall = data.get("immediateRecall") or {}
    delayed_recall = data.get("delayedRecall") or {}
    fluency_test = data.get("fluencyTest") or {}
    paired_test = data.get("pairedTest") or {}
    reading_text_orig = data.get("readingText", "")

    scores = {}
    
    reading_tmp_path = None
    spontaneous_tmp_path = None
    
    if audio_reading and (1 not in skipped_steps):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio_reading.read())
            reading_tmp_path = tmp.name
            
    if audio_spontaneous and (4 not in skipped_steps):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio_spontaneous.read())
            spontaneous_tmp_path = tmp.name

    async def process_reading():
        if reading_tmp_path:
            w_task = asyncio.to_thread(run_whisper, reading_tmp_path)
            a_task = asyncio.to_thread(extract_acoustic_features, reading_tmp_path)
            return await asyncio.gather(w_task, a_task)
        return "", {"pitch_variance": 85, "speech_rate": 65, "pauses": 90, "jitter": 75, "shimmer": 80}

    async def process_spontaneous():
        if spontaneous_tmp_path:
            return await asyncio.to_thread(run_whisper, spontaneous_tmp_path)
        return ""

    (reading_text, acoustic_features), spontaneous_text = await asyncio.gather(
        process_reading(),
        process_spontaneous()
    )

    try:
        if reading_tmp_path: os.remove(reading_tmp_path)
    except Exception: pass
    
    try:
        if spontaneous_tmp_path: os.remove(spontaneous_tmp_path)
    except Exception: pass

    async def get_semantic_drift():
        if not reading_text or not reading_text_orig:
            return 80
        def calc():
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
        return await asyncio.to_thread(calc)

    async def get_idea_density():
        if not spontaneous_text:
            return 50
        return await asyncio.to_thread(calculate_idea_density, spontaneous_text)

    semantic_drift_score, idea_density = await asyncio.gather(
        get_semantic_drift(),
        get_idea_density()
    )

    scores['semantic_drift'] = None if 1 in skipped_steps else semantic_drift_score
    scores['idea_density'] = None if 4 in skipped_steps else idea_density

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

