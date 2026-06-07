'use strict';

const { context, propagation, trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('medical-research-analysis');

function activeTraceContext() {
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext?.();
    if (!spanContext?.traceId) return {};
    return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
    };
}

function setSpanAttributes(span, attributes = {}) {
    for (const [key, value] of Object.entries(attributes || {})) {
        if (value === undefined || value === null) continue;
        if (['string', 'number', 'boolean'].includes(typeof value)) {
            span.setAttribute(key, value);
        } else if (Array.isArray(value)) {
            span.setAttribute(key, value.map((item) => String(item)).slice(0, 50));
        } else {
            span.setAttribute(key, String(value).slice(0, 500));
        }
    }
}

async function withSpan(name, attributes, fn) {
    return tracer.startActiveSpan(name, async (span) => {
        try {
            setSpanAttributes(span, attributes);
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (err) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
            throw err;
        } finally {
            span.end();
        }
    });
}

function annotateActiveSpan(attributes = {}) {
    const span = trace.getActiveSpan();
    if (span) setSpanAttributes(span, attributes);
}

function injectTraceContext(carrier = {}) {
    propagation.inject(context.active(), carrier);
    return carrier;
}

function contextFromCarrier(carrier = {}) {
    return propagation.extract(context.active(), carrier);
}

module.exports = {
    activeTraceContext,
    annotateActiveSpan,
    context,
    contextFromCarrier,
    injectTraceContext,
    setSpanAttributes,
    tracer,
    withSpan,
};
