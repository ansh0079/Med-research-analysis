# BioGPT Integration Setup Guide

Your medical research analysis app includes BioGPT AI analysis, but it requires a proxy server to function properly due to browser CORS restrictions.

## Quick Start

### Option 1: Node.js Proxy Server (Recommended - Easiest)

This uses the Hugging Face API through a proxy server to bypass CORS restrictions.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the proxy server:**
   ```bash
   npm run proxy
   ```

   Or directly:
   ```bash
   node proxy-server.js
   ```

3. **Verify it's running:**
   - Open [http://localhost:3002/health](http://localhost:3002/health)
   - You should see: `{"status":"ok","message":"BioGPT Proxy Server is running"}`

4. **Open your app** and BioGPT analysis should now work!

### Option 2: Local Python BioGPT Server (Advanced - Best Performance)

This runs BioGPT locally on your machine for faster inference without API calls.

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the BioGPT server:**
   ```bash
   python biogpt_server.py
   ```

3. **Wait for model to load** (first time takes ~5-10 minutes to download ~1.5GB model)

4. **Verify it's running:**
   - Open [http://localhost:8000/health](http://localhost:8000/health)
   - You should see model status as "loaded"

5. **Open your app** and BioGPT will use local inference!

### Option 3: Direct API (Fallback - May not work in all browsers)

If you can't run the servers, the app will attempt direct API calls. This requires:

1. **Configure your Hugging Face API key:**
   - Open the app settings (gear icon)
   - Add your Hugging Face API token under "BioGPT API Key"
   - Get a free token at: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

2. **Note:** This may fail due to CORS restrictions in some browsers

## Troubleshooting

### "Connection refused" or "Network error"
- Make sure the proxy/local server is actually running
- Check the terminal for error messages
- Verify the port isn't already in use (3002 for proxy, 8000 for local)

### "Model loading" for too long
- First time loading BioGPT takes ~5-10 minutes
- Check your internet connection
- The model is ~1.5GB in size

### "API key missing" error
- Add your Hugging Face API key in the app settings
- The key should start with `hf_`

### Port already in use
- Change the port in the respective server file:
  - `proxy-server.js`: Edit `const PORT = 3002`
  - `biogpt_server.py`: Edit the `uvicorn.run(port=8000)` line

## Architecture

The app tries to connect in this order:
1. **Local Python server** (http://localhost:8000) - Fastest, no API costs
2. **Node.js proxy** (http://localhost:3002/api/biogpt) - Uses API but bypasses CORS
3. **Direct API** (https://api-inference.huggingface.co) - May fail due to CORS

## Using BioGPT in the App

Once connected:
1. Search for medical articles in PubMed
2. Click the "BioGPT" button on any article
3. Choose analysis type:
   - **Quick** - Fast summary
   - **Comprehensive** - Detailed analysis
   - **Critical** - Critical appraisal
   - **Biomedical** - Entity extraction
   - **Layperson** - Patient-friendly explanation

## API Costs

- **Hugging Face Inference API**: Free tier available, then $0.00006 per token
- **Local server**: Free (uses your hardware)
- **Proxy server**: Same as API (just proxies the request)

## Questions?

Check the browser console (F12) for detailed error messages if BioGPT isn't working.
