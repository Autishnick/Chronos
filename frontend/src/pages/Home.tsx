import React, { useEffect, useState } from 'react';
import { api } from '../services/apiClient';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Settings, Plus } from 'lucide-react';
import profilePic from '../assets/profile.png';
import envelopePic from '../assets/envelope.png';

export default function Home() {
  const { user } = useAuth();
  const [capsules, setCapsules] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCapsules() {
      try {
        const data = await api.getCapsules();
        const capsulesData = data || [];
        
        // Batch generate signed URLs for private capsule media to show previews
        const paths = Array.from(new Set(capsulesData.map((c: any) => c.content_url).filter(Boolean)));
        
        if (paths.length > 0) {
           const { data: signData, error } = await supabase.storage.from('capsule-media').createSignedUrls(paths as string[], 3600);
           if (!error && signData) {
              const urlMap = Object.fromEntries(signData.map((s: any) => [s.path, s.signedUrl]));
              const enhancedData = capsulesData.map((c: any) => ({
                 ...c,
                 signed_content_url: c.content_url ? urlMap[c.content_url] : null
              }));
              setCapsules(enhancedData);
              return;
           }
        }
        
        setCapsules(capsulesData);
      } catch (err) {
        console.error('Error fetching capsules:', err);
      }
    }
    fetchCapsules();
  }, []);

  const activeCapsules = capsules.filter(c => new Date() < new Date(c.unlock_date));
  const recentCapsule = activeCapsules[0];

  const calculateTimeLeft = (unlockDate: string) => {
    const timeDiff = new Date(unlockDate).getTime() - new Date().getTime();
    if (timeDiff <= 0) return 'Unlocked';
    
    const years = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (years > 0) return `${years} years ${months} month left`;
    if (months > 0) return `${months} months left`;
    
    return `${Math.floor(timeDiff / (1000 * 60 * 60 * 24))} days left`;
  };

  const calculateProgress = (created: string, unlock: string) => {
    const total = new Date(unlock).getTime() - new Date(created).getTime();
    const passed = new Date().getTime() - new Date(created).getTime();
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, (passed / total) * 100));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl text-brand-light font-serif italic mb-4">Hi, {user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'User'}!</h1>
          <div className="bg-primary-500 rounded-full px-4 py-1.5 text-sm font-medium inline-block shadow-md text-white">
            My active capsules
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link to="/profile">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-primary-500 shadow-lg overflow-hidden bg-transparent mt-2">
               <img src={user?.user_metadata?.avatarUrl || profilePic} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </Link>
          <Link to="/profile">
            <Settings className="text-primary-600 hover:text-primary-400 mt-2 transition-colors" />
          </Link>
        </div>
      </div>

      <div className="mb-10 space-y-4">
        {activeCapsules.map((capsule) => (
          <Link
              key={capsule.id}
              to={`/capsule/${capsule.id}`}
              className="block bg-gradient-to-tr from-[#52447D]/80 to-[#7966B2]/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-primary-500/30 transition-transform active:scale-95"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-16 h-12 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-black/30">
                  {capsule.content_url?.toLowerCase().match(/\.(mp4|webm|ogg)$/) && capsule.signed_content_url ? (
                    <video src={capsule.signed_content_url || envelopePic} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img 
                        src={capsule.signed_content_url || envelopePic} 
                        onError={(e) => { e.currentTarget.src = envelopePic }}
                        alt="Capsule icon" 
                        className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-base leading-tight">
                    {(() => {
                      try {
                        return JSON.parse(capsule.location_text).name || 'Letter to me';
                      } catch {
                        return 'Letter to me';
                      }
                    })()}
                  </h3>
                  <p className="text-white/70">Created: {formatDate(capsule.created_at)}</p>
                  <p className="text-white/70">Unlocks: {formatDate(capsule.unlock_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden flex shadow-inner border border-white/10">
                  <div 
                    className="h-full bg-white/50" 
                    style={{ width: `${calculateProgress(capsule.created_at, capsule.unlock_date)}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}
                  ></div>
                </div>
                <span className="text-white/90">{calculateTimeLeft(capsule.unlock_date)}</span>
              </div>
            </Link>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center mb-8">
        <Link to="/create" className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white mb-6 shadow-[0_0_20px_rgba(98,75,255,0.8)] border border-white/20">
          <Plus size={28} />
        </Link>
        <h2 className="text-2xl text-center text-brand-light font-serif italic max-w-[200px] leading-tight">
          Look at your memories from 1 year ago
        </h2>
      </div>

      {/* Decorative staggered images resembling the screenshot */}
      <div className="relative h-48 w-full max-w-[300px] mx-auto opacity-80">
        <div className="absolute left-0 bottom-0 w-24 h-32 bg-slate-300 rounded shadow-xl rotate-[-5deg] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=300&h=400&fit=crop" className="w-full h-full object-cover" alt="Memory" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-4 w-28 h-36 bg-slate-200 rounded shadow-2xl z-10 overflow-hidden border-2 border-white/10">
          <img src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=300&h=400&fit=crop" className="w-full h-full object-cover" alt="Memory" />
        </div>
        <div className="absolute right-0 bottom-4 w-24 h-32 bg-slate-400 rounded shadow-xl rotate-[5deg] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1541250848049-b4f7141dca3f?w=300&h=400&fit=crop" className="w-full h-full object-cover" alt="Memory" />
        </div>
      </div>
    </div>
  );
}
