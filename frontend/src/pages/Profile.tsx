import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import profilePic from '../assets/profile.png';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize form with existing user metadata or sensible defaults
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.firstName || '',
    surname: user?.user_metadata?.surname || '',
    email: user?.email || '',
    recoveryEmail: user?.user_metadata?.recoveryEmail || '',
    dob: user?.user_metadata?.dob || '',
    avatarUrl: user?.user_metadata?.avatarUrl || ''
  });

  // Sync formData with user metadata when it loaded
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.user_metadata?.firstName || prev.firstName,
        surname: user.user_metadata?.surname || prev.surname,
        email: user.email || prev.email,
        recoveryEmail: user.user_metadata?.recoveryEmail || prev.recoveryEmail,
        dob: user.user_metadata?.dob || prev.dob,
        avatarUrl: user.user_metadata?.avatarUrl || prev.avatarUrl
      }));
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatarUrl: publicUrl });
      await supabase.auth.updateUser({ data: { avatarUrl: publicUrl } });
      toast.success('Avatar updated successfully!');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Could not upload avatar. Please make sure you created the "avatars" bucket in Supabase and made it Public.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSave = async () => {
    setLoading(true);
    const savingToastId = toast.loading('Saving profile...');
    
    // Update Supabase user metadata with profile information
    const { error } = await supabase.auth.updateUser({
      data: {
        firstName: formData.firstName,
        surname: formData.surname,
        recoveryEmail: formData.recoveryEmail,
        dob: formData.dob,
        avatarUrl: formData.avatarUrl // Ensure avatarUrl is preserved during full save
      }
    });
    
    setLoading(false);
    
    if (error) {
      toast.error(error.message, { id: savingToastId });
    } else {
      toast.success('Profile saved successfully!', { id: savingToastId });
      setIsEditing(false);
    }
  };

  return (
    <div className="px-5 pt-8 pb-32 flex flex-col items-center">
      <h1 className="text-4xl text-brand-light font-serif italic mb-8">Profile</h1>

      <div className="relative mb-10">
        <div className="w-28 h-28 rounded-full flex items-center justify-center border-4 border-primary-500 shadow-lg overflow-hidden bg-transparent">
          <img src={formData.avatarUrl || profilePic} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <label className="absolute bottom-0 right-0 w-8 h-8 bg-black/60 rounded flex items-center justify-center border border-white/20 cursor-pointer hover:bg-black/80 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
        </label>
      </div>

      <div className="w-full space-y-4 max-w-[320px]">

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md w-[100px] text-center flex-shrink-0">First name</label>
          <input
            type="text"
            value={formData.firstName}
            placeholder='Volo'
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            disabled={!isEditing}
            className="glass-input h-10 shadow-inner flex-1 bg-white/90 disabled:opacity-70 disabled:bg-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md w-[100px] text-center flex-shrink-0">Surname</label>
          <input
            type="text"
            value={formData.surname}
            placeholder='Devs'
            onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
            disabled={!isEditing}
            className="glass-input h-10 shadow-inner flex-1 bg-white/90 disabled:opacity-70 disabled:bg-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md w-[100px] text-center flex-shrink-0">email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!isEditing}
            className="glass-input h-10 shadow-inner flex-1 bg-white/90 disabled:opacity-70 disabled:bg-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md w-[100px] text-center flex-shrink-0 leading-tight">Recovery email</label>
          <input
            type="email"
            value={formData.recoveryEmail}
            placeholder='volodevs@gmail.com'
            onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
            disabled={!isEditing}
            className="glass-input h-10 shadow-inner flex-1 bg-white/90 disabled:opacity-70 disabled:bg-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md w-[100px] text-center flex-shrink-0">Date of Birth</label>
          <input
            type={formData.dob ? "date" : "text"}
            onFocus={(e) => { if (isEditing) e.target.type = "date"; }}
            onBlur={(e) => (!e.target.value && (e.target.type = "text"))}
            value={formData.dob}
            placeholder='DD.MM.YYYY'
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            disabled={!isEditing}
            className="glass-input h-10 shadow-inner flex-1 bg-white/90 text-center disabled:opacity-70 disabled:bg-slate-200"
          />
        </div>

      </div>

      <div className="flex gap-4 mt-8 w-full max-w-[320px]">
        {!isEditing ? (
          <button
            type="button"
            className="flex-1 btn-primary py-2 text-sm !bg-none bg-primary-600/80"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 btn-primary py-2 text-sm !bg-none bg-slate-500"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[2] btn-primary py-2 text-sm"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </>
        )}
      </div>

      <button className="mt-4 w-full max-w-[320px] btn-primary py-2 text-sm !bg-none bg-[#3D5B59] hover:bg-[#2A413F]" onClick={handleLogout}>
        Sign Out
      </button>

    </div>
  );
}
