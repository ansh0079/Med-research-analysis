'use strict';

let sdk = null;

function otelEnabled() {
    return String(process.env.OTEL_ENABLED || '').toLowerCase() === 'true'
        || Boolean(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
}

function startOpenTelemetry() {
    if (sdk || !otelEnabled()) return sdk;
    try {
        const { NodeSDK } = require('@opentelemetry/sdk-node');
        const { Resource } = require('@opentelemetry/resources');
        const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
        const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

        sdk = new NodeSDK({
            resource: new Resource({
                'service.name': process.env.OTEL_SERVICE_NAME || 'medical-research-analysis',
                'service.version': process.env.npm_package_version || '2.0.0',
                'deployment.environment': process.env.NODE_ENV || 'development',
            }),
            traceExporter: new OTLPTraceExporter({
                url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
                headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });
        sdk.start();
        process.once('beforeExit', () => {
            sdk?.shutdown?.().catch(() => undefined);
        });
    } catch (err) {
        // Telemetry must never keep the app from booting.
        // eslint-disable-next-line no-console
        console.warn('[otel] OpenTelemetry startup skipped:', err?.message || err);
        sdk = null;
    }
    return sdk;
}

module.exports = { startOpenTelemetry, otelEnabled };
