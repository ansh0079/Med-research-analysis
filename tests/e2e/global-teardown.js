/**
 * Global Teardown for Playwright Tests
 * 
 * Runs once after all test suites complete
 * - Cleanup test data
 * - Generate test report summary
 * - Archive test artifacts
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown() {
  console.log('\n🧹 Cleaning up E2E test environment...\n');

  const testResultsDir = path.join(process.cwd(), 'test-results');
  const playwrightReportDir = path.join(process.cwd(), 'playwright-report');

  // Clean up test users created by real-auth setup
  try {
    const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth');
    const metaPath = path.join(authDir, 'test-user-meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const dbPath = path.join(process.cwd(), 'database', 'app.db');
      if (fs.existsSync(dbPath)) {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);
        const result = db.prepare("DELETE FROM users WHERE email = ?").run(meta.email);
        db.close();
        console.log(`  ✓ Cleaned up test user ${meta.email} (${result.changes} row(s) deleted)`);
      }
      // Clean up auth state files
      const storageStatePath = path.join(authDir, 'user.json');
      if (fs.existsSync(storageStatePath)) fs.unlinkSync(storageStatePath);
      fs.unlinkSync(metaPath);
    }
  } catch (err) {
    console.log('  ⚠️  Could not clean up test users:', err.message);
  }

  // Generate test summary
  try {
    const resultsPath = path.join(playwrightReportDir, 'results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      const stats = {
        total: results.suites?.reduce((acc, s) => acc + (s.specs?.length || 0), 0) || 0,
        passed: 0,
        failed: 0,
        flaky: 0,
        skipped: 0,
      };

      console.log('📊 Test Summary:');
      console.log(`  Total Tests: ${stats.total}`);
      console.log(`  Passed: ${stats.passed}`);
      console.log(`  Failed: ${stats.failed}`);
      console.log(`  Flaky: ${stats.flaky}`);
      console.log(`  Skipped: ${stats.skipped}`);
    }
  } catch (error) {
    console.log('  ℹ️  Could not generate test summary');
  }

  // Cleanup old screenshots (keep last 10 runs)
  try {
    const screenshotsDir = path.join(testResultsDir, 'screenshots');
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir)
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(screenshotsDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only recent screenshots
      if (files.length > 100) {
        files.slice(100).forEach(f => {
          fs.unlinkSync(path.join(screenshotsDir, f.name));
        });
        console.log(`  ✓ Cleaned up old screenshots`);
      }
    }
  } catch (error) {
    console.log('  ℹ️  Could not cleanup screenshots');
  }

  console.log('\n✅ Teardown complete\n');
}

module.exports = globalTeardown;
