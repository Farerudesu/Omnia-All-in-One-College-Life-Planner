import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import * as ds from '@/lib/dataService';

interface UseProfileSettingsParams {
  user: User | null;
  profile: UserProfile | null;
  metadataName: string;
  accountEmail: string;
  requestPasswordReset: (email: string) => Promise<unknown>;
}

export function useProfileSettings({
  user,
  profile,
  metadataName,
  accountEmail,
  requestPasswordReset,
}: UseProfileSettingsParams) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.fullName || metadataName || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(profile?.avatarUrl || '');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    setProfileName(profile?.fullName || metadataName || user?.email?.split('@')[0] || '');
    setProfileAvatarUrl(profile?.avatarUrl || '');
  }, [profile?.fullName, profile?.avatarUrl, user?.id, metadataName, user?.email]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      setProfileError('Enter a display name.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const avatarUrl = profileAvatarFile
        ? await ds.uploadProfileAvatar(profileAvatarFile)
        : profileAvatarUrl.trim() || undefined;
      await ds.updateProfile({
        fullName: profileName.trim(),
        universityEmail: accountEmail,
        avatarUrl,
      });
      setProfileAvatarFile(null);
      setIsEditingProfile(false);
      setProfileSaved(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile.';
      setProfileError(
        /bucket.*not found/i.test(message)
          ? 'Profile image storage is not set up yet. Apply the profile avatar migration with `supabase db push`, then try again.'
          : message
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setResetError('No email address is available for this account.');
      return;
    }
    setResetSending(true);
    setResetError('');
    setResetMessage('');
    try {
      await requestPasswordReset(user.email);
      setResetMessage(`Password reset link sent to ${user.email}.`);
    } catch (error: unknown) {
      setResetError(error instanceof Error ? error.message : 'Unable to send a reset link.');
    } finally {
      setResetSending(false);
    }
  };

  return {
    isEditingProfile,
    setIsEditingProfile,
    profileName,
    setProfileName,
    profileAvatarUrl,
    setProfileAvatarUrl,
    profileAvatarFile,
    setProfileAvatarFile,
    profileSaving,
    profileError,
    setProfileError,
    profileSaved,
    setProfileSaved,
    handleSaveProfile,
    handlePasswordReset,
    resetSending,
    resetMessage,
    resetError,
  };
}
