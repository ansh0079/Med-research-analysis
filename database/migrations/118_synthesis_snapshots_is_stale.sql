-- Migration 118: Add is_stale to synthesis_snapshots
-- Marks snapshots stale when users report negative quality feedback so newer evidence or regenerations are served.
ALTER TABLE synthesis_snapshots ADD COLUMN is_stale INTEGER NOT NULL DEFAULT 0;
