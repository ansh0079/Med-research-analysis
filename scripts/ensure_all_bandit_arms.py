import sqlite3
from datetime import datetime, timezone

def ensure_arms():
    conn = sqlite3.connect('database/app.db')
    c = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    arms_by_policy = {
        'search_ranking': [
            'heuristic_default',
            'engagement_heavy',
            'misconception_heavy',
            'quiz_gap_heavy'
        ],
        'agent_teaching_strategy': [
            'direct',
            'socratic',
            'worked_example',
            'analogy'
        ],
        'synopsis_style': [
            'bottom_line_first',
            'pico_structured',
            'narrative',
            'teaching_points'
        ],
        'recommendation_strategy': [
            'review',
            'strengthen',
            'explore',
            'calibrate',
            'discover',
            'refresh',
            'case',
            'start'
        ]
    }

    added = 0
    for policy, arms in arms_by_policy.items():
        for arm in arms:
            c.execute("""
                INSERT INTO personalization_arm_state
                    (policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward, updated_at)
                VALUES (?, ?, 'global', 1.0, 1.0, 0, 0, ?)
                ON CONFLICT(policy_type, arm_id, scope_key) DO NOTHING
            """, (policy, arm, now))
            if c.rowcount > 0:
                added += 1

    conn.commit()
    print(f"Ensured bandit arms. Added {added} missing global arms.")

    c.execute("""
        SELECT policy_type, arm_id, scope_key, pulls, alpha, beta
        FROM personalization_arm_state
        WHERE scope_key = 'global'
        ORDER BY policy_type, arm_id
    """)
    rows = c.fetchall()
    print(f"Total global arms in database: {len(rows)}")
    for r in rows:
        print(f"  {r[0]:25} {r[1]:25} pulls={r[3]} alpha={r[4]:.2f} beta={r[5]:.2f}")

    conn.close()

if __name__ == '__main__':
    ensure_arms()
