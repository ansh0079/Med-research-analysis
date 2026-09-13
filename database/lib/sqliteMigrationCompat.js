// SQLite needs a table rebuild for DROP NOT NULL. Keep this adaptation scoped
// to the specific statements below so unsupported DDL elsewhere still fails loudly.
function applySqliteMigrationCompat(db, statement) {
    // Migration 094 widens search_learning_outcomes.quiz_attempt_id to TEXT so it
    // can hold a Postgres uuid. SQLite needs no rebuild: declared column types are
    // advisory affinity, and a uuid string is not losslessly convertible to an
    // integer, so SQLite already stores it as text. Skipping keeps the migration
    // a genuine no-op here rather than a syntax error -- SQLite has no
    // ALTER COLUMN ... TYPE.
    if (/^ALTER TABLE search_learning_outcomes ALTER COLUMN quiz_attempt_id TYPE TEXT\b/i.test(statement.trim())) return true;
    if (!/^ALTER TABLE quiz_attempts ALTER COLUMN user_id DROP NOT NULL\s*;?$/i.test(statement.trim())) return false;
    const columns = db.prepare('PRAGMA table_info(quiz_attempts)').all();
    const userColumn = columns.find(column => column.name === 'user_id');
    if (!userColumn) throw new Error('quiz_attempts.user_id is missing');
    if (!userColumn.notnull) return true;
    const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'quiz_attempts'").get();
    const nullableSql = sql.replace(/(\buser_id\s+TEXT\s+)NOT\s+NULL\b/i, '$1');
    if (nullableSql === sql) throw new Error('Unsupported quiz_attempts.user_id definition');
    const createSql = nullableSql.replace(/^(CREATE TABLE\s+(?:IF NOT EXISTS\s+)?)["`[]?quiz_attempts["`\]]?/i, '$1quiz_attempts_nullable');
    const sequence = /\bAUTOINCREMENT\b/i.test(sql)
        ? db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'quiz_attempts'").get()?.seq
        : null;
    const objects = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = 'quiz_attempts' AND type IN ('index', 'trigger') AND sql IS NOT NULL").all();
    const names = columns.map(column => `"${column.name.replace(/"/g, '""')}"`).join(', ');
    const foreignKeys = db.prepare('PRAGMA foreign_keys').get().foreign_keys;
    const violationsBefore = db.prepare('PRAGMA foreign_key_check').all();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    try {
        db.exec(createSql);
        db.exec(`INSERT INTO quiz_attempts_nullable (${names}) SELECT ${names} FROM quiz_attempts`);
        db.exec('DROP TABLE quiz_attempts');
        db.exec('ALTER TABLE quiz_attempts_nullable RENAME TO quiz_attempts');
        if (sequence != null) db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'quiz_attempts'").run(sequence);
        for (const object of objects) db.exec(object.sql);
        const violationsAfter = db.prepare('PRAGMA foreign_key_check').all();
        if (JSON.stringify(violationsAfter) !== JSON.stringify(violationsBefore)) {
            throw new Error('Quiz migration introduced foreign key violations');
        }
        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    } finally {
        db.exec(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
    }
    return true;
}

module.exports = { applySqliteMigrationCompat };
