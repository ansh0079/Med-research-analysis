import sqlite3

def main():
    conn = sqlite3.connect('database/app.db')
    c = conn.cursor()
    c.execute("SELECT id, job_key, job_type, error_message FROM dead_letter_jobs")
    rows = c.fetchall()
    print(f"Dead letter jobs before: {len(rows)}")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} -> {r[3]}")
    
    c.execute("DELETE FROM dead_letter_jobs WHERE job_type = 'pdf_index'")
    print(f"Deleted rows: {c.rowcount}")
    conn.commit()

    c.execute("SELECT COUNT(*) FROM dead_letter_jobs")
    print(f"Dead letter jobs remaining: {c.fetchone()[0]}")
    conn.close()

if __name__ == '__main__':
    main()
