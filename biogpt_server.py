#!/usr/bin/env python3
"""
BioGPT Local Server - Runs BioGPT model locally for faster inference
Usage: python biogpt_server.py
Runs on: http://localhost:8000
"""

import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Check if transformers is installed
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("⚠️  transformers not installed. Install with: pip install transformers torch")

app = FastAPI(title="Mistral-7B Local AI Server", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model cache
MODEL_CACHE = {
    'tokenizer': None,
    'model': None,
    'device': None
}

class AnalysisRequest(BaseModel):
    text: str
    model_type: Optional[str] = 'standard'  # 'standard' or 'large'
    max_tokens: Optional[int] = 256

class AnalysisResponse(BaseModel):
    result: str
    model: str
    tokens_used: Optional[int] = None


@app.on_event("startup")
async def load_model():
    """Load BioGPT model on server startup"""
    if not TRANSFORMERS_AVAILABLE:
        logger.warning("Transformers not available. Server running in limited mode.")
        return

    try:
        logger.info("🔄 Loading Mistral-7B model...")

        # Determine device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        MODEL_CACHE['device'] = device
        logger.info(f"Using device: {device}")

        # Load tokenizer and model - Using Mistral-7B (better than BioGPT)
        model_name = "mistralai/Mistral-7B-Instruct-v0.2"
        logger.info(f"Loading model: {model_name}")
        MODEL_CACHE['tokenizer'] = AutoTokenizer.from_pretrained(model_name)
        MODEL_CACHE['model'] = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            low_cpu_mem_usage=True
        )
        MODEL_CACHE['model'].to(device)
        MODEL_CACHE['model'].eval()

        logger.info("✅ Mistral-7B model loaded successfully")

    except Exception as e:
        logger.error(f"❌ Failed to load Mistral-7B model: {e}")
        MODEL_CACHE['tokenizer'] = None
        MODEL_CACHE['model'] = None


@app.get("/")
async def root():
    """Health check endpoint"""
    model_status = "loaded" if MODEL_CACHE['model'] is not None else "not loaded"
    return {
        "status": "ok",
        "message": "Mistral-7B Local AI Server is running",
        "model": "mistralai/Mistral-7B-Instruct-v0.2",
        "model_status": model_status,
        "device": MODEL_CACHE.get('device', 'unknown'),
        "transformers_available": TRANSFORMERS_AVAILABLE
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": MODEL_CACHE['model'] is not None,
        "device": MODEL_CACHE.get('device'),
        "transformers_available": TRANSFORMERS_AVAILABLE
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """Analyze text with BioGPT"""

    if not TRANSFORMERS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Transformers library not installed. Install with: pip install transformers torch"
        )

    if MODEL_CACHE['model'] is None or MODEL_CACHE['tokenizer'] is None:
        raise HTTPException(status_code=503, detail="Mistral-7B model not loaded")

    try:
        logger.info(f"Analyzing text (length: {len(request.text)}, max_tokens: {request.max_tokens})")

        # Tokenize input
        inputs = MODEL_CACHE['tokenizer'](
            request.text,
            return_tensors="pt",
            truncation=True,
            max_length=1024
        ).to(MODEL_CACHE['device'])

        # Generate response
        with torch.no_grad():
            outputs = MODEL_CACHE['model'].generate(
                inputs['input_ids'],
                max_new_tokens=request.max_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                pad_token_id=MODEL_CACHE['tokenizer'].eos_token_id
            )

        # Decode output
        generated_text = MODEL_CACHE['tokenizer'].decode(outputs[0], skip_special_tokens=True)

        # Remove input text from output (only return generated portion)
        if generated_text.startswith(request.text):
            generated_text = generated_text[len(request.text):].strip()

        logger.info(f"✅ Analysis complete (generated {len(generated_text)} chars)")

        return AnalysisResponse(
            result=generated_text,
            model="mistralai/Mistral-7B-Instruct-v0.2",
            tokens_used=len(outputs[0])
        )

    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


if __name__ == "__main__":
    print("""
========================================================
   Local AI Server - Mistral-7B
   Starting... (This may take a few minutes)
========================================================
    """)

    if not TRANSFORMERS_AVAILABLE:
        print("⚠️  WARNING: transformers library not installed")
        print("   Install with: pip install transformers torch")
        print("   Server will run but analysis endpoints will fail")
        print()

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
