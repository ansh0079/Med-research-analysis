'use strict';

const {
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
} = require('../../server/services/agentClaimExtractionService');

describe('agentClaimExtractionService', () => {
    const context = { topic: 'diabetes', objectKey: 'agent:test' };

    test('regex extractor keeps citation-marked sentences', () => {
        const reply = 'Metformin lowers hepatic glucose output in adults with T2DM [RES-1]. Short.';
        const claims = extractGroundedClaimsFromReply(reply, context);
        expect(claims).toHaveLength(1);
        expect(claims[0].claimText).toContain('[RES-1]');
        expect(claims[0].topic).toBe('diabetes');
        expect(claims[0].verificationStatus).toBe('agent_draft');
    });

    test('structured extractor maps LLM claims', async () => {
        const ai = {
            callStructured: jest.fn().mockResolvedValue({
                claims: [{ text: 'SGLT2 inhibitors reduce heart-failure hospitalization in HFrEF [MEM-2].', citations: ['MEM-2'] }],
            }),
        };
        const claims = await extractGroundedClaimsStructured(
            'ignored',
            context,
            ai,
            'gemini',
            'gemini-2.0-flash'
        );
        expect(claims).toHaveLength(1);
        expect(claims[0].claimText).toContain('[MEM-2]');
        expect(ai.callStructured).toHaveBeenCalled();
    });

    test('structured extractor falls back to regex on model error', async () => {
        const ai = { callStructured: jest.fn().mockRejectedValue(new Error('timeout')) };
        const reply = 'Empagliflozin improves cardiovascular outcomes in diabetes mellitus [G1].';
        const claims = await extractGroundedClaimsStructured(reply, context, ai, 'gemini', 'gemini-2.0-flash');
        expect(claims).toHaveLength(1);
        expect(claims[0].claimText).toContain('[G1]');
    });
});
