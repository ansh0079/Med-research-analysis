import React, { useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';

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
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            {profileError && (
              <p className="text-xs text-red-600 dark:text-red-400">{profileError}</p>
            )}
            {profileMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{profileMessage}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" isLoading={profileLoading} size="sm">Save profile</Button>
            </div>
          </form>
        </div>

        {/* Password */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
            )}
            {passwordMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" isLoading={passwordLoading} size="sm">Change password</Button>
            </div>
          </form>
        </div>

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
