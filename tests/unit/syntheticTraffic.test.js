'use strict';

const { classifyTraffic, syntheticTrafficMiddleware } = require('../../server/utils/syntheticTraffic');

const req = (headers = {}) => ({ headers });

describe('classifyTraffic', () => {
    describe('detects synthetic traffic', () => {
        test.each([
            ['UptimeRobot', 'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)'],
            ['Pingdom', 'Pingdom.com_bot_version_1.4'],
            ['StatusCake', 'StatusCake_Pagespeed_Indev'],
            ['curl', 'curl/8.4.0'],
            ['wget', 'Wget/1.21.3'],
            ['python-requests', 'python-requests/2.31.0'],
            ['Go http client', 'Go-http-client/2.0'],
            ['headless Chrome', 'Mozilla/5.0 HeadlessChrome/120.0.0.0'],
            ['generic bot', 'SomeRandomBot/1.0'],
            ['crawler', 'bigcorp-crawler'],
        ])('%s', (_label, ua) => {
            expect(classifyTraffic(req({ 'user-agent': ua })).synthetic).toBe(true);
        });

        test('explicit opt-out header beats a real browser UA', () => {
            const result = classifyTraffic(req({
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0',
                'x-synthetic-traffic': '1',
            }));
            expect(result).toEqual({ synthetic: true, reason: 'header' });
        });
    });

    describe('leaves real traffic alone', () => {
        test.each([
            ['Chrome on macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
            ['Safari on iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Mobile/15E148 Safari/604.1'],
            ['Firefox on Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'],
            ['Edge', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0'],
        ])('%s', (_label, ua) => {
            expect(classifyTraffic(req({ 'user-agent': ua })).synthetic).toBe(false);
        });

        // A first-touch real user has no x-session-id. That alone must never
        // classify them as synthetic, or we would silently drop their signal.
        test('missing x-session-id is not itself a synthetic signal', () => {
            const result = classifyTraffic(req({
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0',
            }));
            expect(result.synthetic).toBe(false);
        });

        // Native mobile clients and server-side integrations routinely omit the UA.
        // Monitors all send one, so absence is not evidence of a monitor.
        test('missing user-agent is not synthetic', () => {
            expect(classifyTraffic(req({})).synthetic).toBe(false);
            expect(classifyTraffic(req({ 'user-agent': '' })).synthetic).toBe(false);
        });

        test('opt-out header set to a falsy value does not trip detection', () => {
            for (const value of ['0', 'false', '']) {
                const result = classifyTraffic(req({
                    'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120.0',
                    'x-synthetic-traffic': value,
                }));
                expect(result.synthetic).toBe(false);
            }
        });
    });

    test('handles a null request without throwing', () => {
        expect(classifyTraffic(null)).toEqual({ synthetic: false, reason: null });
    });
});

describe('syntheticTrafficMiddleware', () => {
    test('stamps the request and calls next', () => {
        const request = req({ 'user-agent': 'UptimeRobot/2.0' });
        const next = jest.fn();
        syntheticTrafficMiddleware(request, {}, next);
        expect(request.isSynthetic).toBe(true);
        expect(request.syntheticReason).toBe('user_agent');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('marks a real browser as non-synthetic', () => {
        const request = req({ 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120.0' });
        const next = jest.fn();
        syntheticTrafficMiddleware(request, {}, next);
        expect(request.isSynthetic).toBe(false);
        expect(request.syntheticReason).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
    });
});
