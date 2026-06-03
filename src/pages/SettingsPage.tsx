import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';

const NOTIFICATION_PREFS_KEY = 'medsearch_notification_prefs';

interface NotificationPrefs {
  digestEmails: boolean;
  evidenceAlerts: boolean;
  weeklyDigest: boolean;
  spacedRepReminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  digestEmails: true,
  evidenceAlerts: true,
  weeklyDigest: true,
  spacedRepReminders: true,
};

function loadPrefs(): NotificationPrefs {
  try {
    const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<Array<{ id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('My integration');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listApiKeys();
      setKeys(data.keys);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load API keys';
      if (msg.startsWith('UPGRADE_REQUIRED:')) {
        setError('API access requires a Pro plan or higher.');
      } else {
        setError(msg);
      }
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setCreatedKey(null);
    try {
      const result = await api.createApiKey(newKeyName.trim() || 'My integration');
      setCreatedKey(result.key);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  };

  return (
    <div id="api-keys" className="neo-card rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">API access</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Programmatic search for Pro+ plans. Pass <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-API-Key</code> on{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">GET /api/search</code> or verify with{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">GET /api/v1/me</code>.
        </p>
      </div>
      {error && <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>}
      {createdKey && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Copy your new key — it won&apos;t be shown again.</p>
          <code className="block text-xs break-all bg-white dark:bg-slate-900 p-2 rounded border border-emerald-200 dark:border-emerald-800">{createdKey}</code>
        </div>
      )}
      {!error?.includes('Pro plan') && (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
            <Button type="button" size="sm" isLoading={creating} onClick={handleCreate}>Create key</Button>
          </div>
          {loading ? (
            <p className="text-xs text-slate-400">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="text-xs text-slate-400">No active API keys.</p>
          ) : (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{k.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{k.prefix}…</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleRevoke(k.id)}>Revoke</Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error?.includes('Pro plan') && (
        <a href="/billing" className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-500">Upgrade to Pro →</a>
      )}
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  // Notification prefs state
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setProfileLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage('');
    setEmailError('');
    if (!newEmail.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailLoading(true);
    try {
      await api.changeEmail({ newEmail: newEmail.trim(), password: emailPassword });
      setEmailMessage('Verification email sent to your new address. Check your inbox to confirm the change.');
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Email change failed');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSavePrefs = () => {
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch {
      // ignore storage errors
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'delete my account') return;
    setDeleteLoading(true);
    try {
      await deleteAccount();
      logout();
    } catch {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(var(--nav-h)+2rem)] pb-16 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your profile, password, and preferences.</p>
        </div>

        {/* Profile */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            {profileError && <p className="text-xs text-red-600 dark:text-red-400">{profileError}</p>}
            {profileMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
            <div className="flex justify-end">
              <Button type="submit" isLoading={profileLoading} size="sm">Save profile</Button>
            </div>
          </form>
        </div>

        {/* Change email */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Change Email</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">A verification email will be sent to your new address. Your email won't change until you confirm it.</p>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">New email address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Current password (to confirm)</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            {emailError && <p className="text-xs text-red-600 dark:text-red-400">{emailError}</p>}
            {emailMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{emailMessage}</p>}
            <div className="flex justify-end">
              <Button type="submit" isLoading={emailLoading} size="sm">Send verification</Button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
            </div>
            {passwordError && <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
            {passwordMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>}
            <div className="flex justify-end">
              <Button type="submit" isLoading={passwordLoading} size="sm">Change password</Button>
            </div>
          </form>
        </div>

        {/* Notification preferences */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Notifications</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Control which emails we send you. Changes take effect on the next send cycle.</p>
          <div className="space-y-3">
            {([
              { key: 'digestEmails', label: 'Research digest', description: 'Daily email with new papers matching your saved searches' },
              { key: 'evidenceAlerts', label: 'Evidence alerts', description: 'Notify when high-impact papers appear for your topics' },
              { key: 'weeklyDigest', label: 'Weekly summary', description: 'Weekly roll-up of your learning progress and top papers' },
              { key: 'spacedRepReminders', label: 'Spaced repetition reminders', description: 'Email reminder when you have cards due for review' },
            ] as Array<{ key: keyof NotificationPrefs; label: string; description: string }>).map(({ key, label, description }) => (
              <label key={key} className="flex items-start gap-4 cursor-pointer group">
                <div className="relative shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => togglePref(key)}
                    className="sr-only"
                  />
                  <div
                    onClick={() => togglePref(key)}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${prefs[key] ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end items-center gap-3">
            {prefsSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i className="fas fa-check" /> Saved</span>}
            <Button type="button" size="sm" onClick={handleSavePrefs}>Save preferences</Button>
          </div>
        </div>

        {/* API access */}
        <ApiKeysSection />

        {/* Danger zone */}
        <div className="neo-card rounded-2xl p-6 space-y-4 border-red-200 dark:border-red-900/40">
          <h2 className="text-lg font-black text-red-700 dark:text-red-400">Danger Zone</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deleting your account will remove all personal data, saved articles, and history. This cannot be undone.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Type <span className="font-mono text-red-600 dark:text-red-400">delete my account</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirm !== 'delete my account'}
              isLoading={deleteLoading}
              onClick={handleDeleteAccount}
            >
              Delete account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
