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
        const otelResources = require('@opentelemetry/resources');
        const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
        const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

        const resourceAttrs = {
            'service.name': process.env.OTEL_SERVICE_NAME || 'medical-research-analysis',
            'service.version': process.env.npm_package_version || '2.0.0',
            'deployment.environment': process.env.NODE_ENV || 'development',
        };
        const resource = typeof otelResources.resourceFromAttributes === 'function'
            ? otelResources.resourceFromAttributes(resourceAttrs)
            : new otelResources.Resource(resourceAttrs);

        // Parse "key=val,key2=val2" header string into object; SDK also reads the env var
        // automatically, but explicit parsing ensures it works across all SDK versions.
        const rawHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
        const parsedHeaders = rawHeaders
            ? Object.fromEntries(rawHeaders.split(',').map((h) => h.split('=').map((s) => s.trim())))
            : undefined;

        sdk = new NodeSDK({
            resource,
            traceExporter: new OTLPTraceExporter({
                url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
                headers: parsedHeaders,
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
