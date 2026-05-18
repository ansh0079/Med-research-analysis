-- Billing / paywall audit trail (disputes, access reviews). id is app-generated UUID.

CREATE TABLE IF NOT EXISTS billing_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    external_ref TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_user ON billing_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_action ON billing_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_billing_audit_created ON billing_audit_log(created_at);
