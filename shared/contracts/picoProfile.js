'use strict';

const { z } = require('zod');

const PicoProfileSchema = z.object({
    population: z.string().default(''),
    intervention: z.string().default(''),
    comparison: z.string().default(''),
    comparator: z.string().optional(),
    outcome: z.string().optional(),
    outcomes: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).default(0),
    missingFields: z.array(z.string()).optional(),
    sampleSize: z.number().int().nonnegative().optional(),
}).passthrough();

module.exports = { PicoProfileSchema };
