const pino = require('pino');
const { Writable } = require('stream');
const baseLogger = require('../../server/config/logger');

function makeCaptureStream() {
  let buf = '';
  const stream = new Writable({
    write(chunk, _enc, cb) {
      buf += chunk.toString();
      cb();
    },
  });
  return { stream, read: () => buf };
}

describe('logger redaction', () => {
  test('redacts sensitive fields in structured logs', (done) => {
    const { stream, read } = makeCaptureStream();
    const log = pino({
      level: 'info',
      redact: { paths: baseLogger.redactPaths, censor: '[REDACTED]' },
    }, stream);

    log.info({
      email: 'doctor@example.com',
      token: 'secret-token',
      prompt: 'Sensitive prompt text',
      query: 'patient cancer status',
      notes: 'patient DOB 01/01/1990',
      nested: { email: 'nurse@example.com' },
    }, 'test log');

    // Allow stream to flush
    setImmediate(() => {
      const out = read();
      expect(out).toContain('[REDACTED]');
      expect(out).not.toContain('doctor@example.com');
      expect(out).not.toContain('secret-token');
      expect(out).not.toContain('Sensitive prompt text');
      expect(out).not.toContain('patient cancer status');
      expect(out).not.toContain('nurse@example.com');
      done();
    });
  });
});

