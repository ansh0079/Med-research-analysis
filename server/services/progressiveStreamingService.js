'use strict';

/**
 * Progressive Streaming Service
 * 
 * Provides real-time feedback during long-running AI operations
 * to prevent user perception of "frozen" UI
 */

/**
 * Streams synthesis generation with progress updates
 */
async function streamSynthesisGeneration(res, {
    articles,
    topic,
    db,
    cache,
    serverConfig,
    fetchImpl,
    userId,
    ai
}) {
    const {
        prepareSynthesisContext,
        validateSynthesisCitations,
        buildSynthesisResult,
        persistSynthesisResult
    } = require('./synthesisGenerationCore');
    const { resolveProvider } = require('../utils/aiProvider');
    const { TEMPERATURE, MAX_OUTPUT_TOKENS } = require('./aiService');
    
    // Set up Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  // Disable nginx buffering
    });
    
    const sendEvent = (stage, data) => {
        res.write(`data: ${JSON.stringify({ stage, ...data })}\n\n`);
    };
    
    try {
        // Stage 1: Preparation (0-20%)
        sendEvent('preparing', { progress: 0, message: 'Analyzing articles...' });
        const context = await prepareSynthesisContext({ articles, topic, db, cache, userId });
        sendEvent('preparing', { progress: 20, message: `Prepared ${context.topArticles.length} articles` });
        
        // Stage 2: Retrieval (20-30%)
        sendEvent('retrieving', { 
            progress: 25, 
            message: `Retrieved ${context.guidelines.length} guidelines`,
            fullTextCoverage: Math.round(context.fullTextCoverageRatio * 100)
        });
        
        // Stage 3: AI Generation (30-80%)
        sendEvent('generating', { 
            progress: 30, 
            message: 'Generating synthesis...' 
        });
        
        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider: 'auto' }, serverConfig);
        
        // Stream tokens from AI
        let tokenCount = 0;
        const synthesisPayload = await ai.callGeminiStructured(context.prompt, selectedModel, {
            temperature: TEMPERATURE.synthesis,
            maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
            onToken: (token) => {
                tokenCount++;
                if (tokenCount % 20 === 0) {  // Update every 20 tokens
                    const progress = Math.min(30 + (tokenCount / 500) * 50, 80);
                    sendEvent('generating', { 
                        progress: Math.round(progress),
                        tokensGenerated: tokenCount
                    });
                }
            }
        });
        
        sendEvent('generating', { progress: 80, message: 'Synthesis complete' });
        
        // Stage 4: Validation (80-90%)
        sendEvent('validating', { progress: 82, message: 'Validating citations...' });
        
        const synthesis = typeof synthesisPayload === 'string' 
            ? JSON.parse(synthesisPayload) 
            : synthesisPayload;
        
        synthesis._contextArticles = context.topArticles;
        
        const citationValidation = validateSynthesisCitations(synthesis, {
            sourceCount: context.topArticles.length,
            guidelineCount: context.guidelines.length,
        });
        
        sendEvent('validating', { 
            progress: 90, 
            message: 'Validation complete',
            citationIssues: citationValidation.issues?.length || 0
        });
        
        // Stage 5: Finalization (90-100%)
        sendEvent('finalizing', { progress: 92, message: 'Building result...' });
        
        const result = buildSynthesisResult({
            synthesis,
            topic,
            topArticles: context.topArticles,
            sourceMap: context.sourceMap,
            citationValidation,
            retractedUids: context.retractedUids,
            retractionResults: context.retractionResults,
            prompt: context.prompt,
            provider: selectedProvider,
            model: selectedModel,
            fullTextIndexedCount: context.fullTextIndexedCount,
            fullTextCoverageRatio: context.fullTextCoverageRatio
        });
        
        sendEvent('finalizing', { progress: 95, message: 'Saving to cache...' });
        
        await persistSynthesisResult({
            db,
            cache,
            cacheKey: context.cacheKey,
            result,
            topic,
            synthesis,
            topArticles: context.topArticles,
            model: selectedModel
        });
        
        // Stage 6: Complete (100%)
        sendEvent('complete', { 
            progress: 100, 
            message: 'Synthesis ready',
            result
        });
        
        res.end();
    } catch (error) {
        sendEvent('error', { 
            progress: -1, 
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        res.end();
    }
}

/**
 * Streams MCQ generation with progress updates
 */
async function streamMCQGeneration(res, {
    topic,
    count,
    difficulty,
    db,
    ai,
    userId
}) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    const sendEvent = (stage, data) => {
        res.write(`data: ${JSON.stringify({ stage, ...data })}\n\n`);
    };
    
    try {
        sendEvent('preparing', { progress: 0, message: 'Loading topic knowledge...' });
        
        const topicKnowledge = await db.getTopicKnowledge(topic);
        sendEvent('preparing', { progress: 20, message: 'Knowledge loaded' });
        
        sendEvent('generating', { progress: 30, message: 'Generating questions...' });
        
        // Generation happens here
        // ... (abbreviated for space)
        
        sendEvent('complete', { progress: 100, result: { /* questions */ } });
        res.end();
    } catch (error) {
        sendEvent('error', { message: error.message });
        res.end();
    }
}

module.exports = {
    streamSynthesisGeneration,
    streamMCQGeneration
};
