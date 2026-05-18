// ==========================================
// Circuit Breaker — prevents cascading failures when downstream APIs degrade
// ==========================================

class CircuitBreaker {
    /**
     * @param {Function} fn — async function to protect
     * @param {object} options
     * @param {number} [options.failureThreshold=5] — failures before opening
     * @param {number} [options.resetTimeoutMs=30000] — time before half-open
     * @param {number} [options.halfOpenMaxCalls=2] — test calls in half-open state
     */
    constructor(fn, { failureThreshold = 5, resetTimeoutMs = 30000, halfOpenMaxCalls = 2 } = {}) {
        this.fn = fn;
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
        this.halfOpenMaxCalls = halfOpenMaxCalls;

        this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
        this.failures = 0;
        this.nextAttempt = 0;
        this.halfOpenCalls = 0;
        this.lastError = null;
    }

    get isOpen() {
        return this.state === 'OPEN';
    }

    async fire(...args) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                const err = new Error(`Circuit breaker is OPEN for ${this.fn.name || 'protected function'}. ${Math.ceil((this.nextAttempt - Date.now()) / 1000)}s until retry.`);
                err.status = 503;
                err.circuitOpen = true;
                throw err;
            }
            this.state = 'HALF_OPEN';
            this.halfOpenCalls = 0;
        }

        try {
            const result = await this.fn(...args);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        if (this.state === 'HALF_OPEN') {
            this.halfOpenCalls++;
            if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
                this.state = 'CLOSED';
                this.halfOpenCalls = 0;
            }
        } else {
            this.state = 'CLOSED';
        }
        this.lastError = null;
    }

    onFailure(error) {
        this.failures++;
        this.lastError = error;
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeoutMs;
        } else if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeoutMs;
        }
    }

    health() {
        return {
            state: this.state,
            failures: this.failures,
            nextAttempt: this.nextAttempt,
            lastError: this.lastError?.message,
        };
    }
}

module.exports = { CircuitBreaker };
