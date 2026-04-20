import { useEffect, useState } from 'react';
import { api } from '../services/apiClient';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import { Filter, Plus, ImagePlay } from 'lucide-react';
import envelopePic from '../assets/envelope.png';

interface Capsule {
  id: string;
  location_text: string | null;
  unlock_date: string;
  status: string;
  content_url?: string;
  signed_content_url?: string;
  created_at: string;
}

export default function Dashboard() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCapsules() {
      try {
        const data = await api.getCapsules();
        const capsulesData = data || [];
        
        // Extract unique content paths to generate signed URLs for private media
        const paths = Array.from(new Set(capsulesData.map((c: any) => c.content_url).filter(Boolean)));
        
        if (paths.length > 0) {
           // Batch generate signed URLs (valid for 1 hour)
           const { data: signData, error } = await supabase.storage.from('capsule-media').createSignedUrls(paths as string[], 3600);
           if (!error && signData) {
              const urlMap = Object.fromEntries(signData.map((s: any) => [s.path, s.signedUrl]));
              const enhancedData = capsulesData.map((c: any) => ({
                 ...c,
                 signed_content_url: c.content_url ? urlMap[c.content_url] : null
              }));
              setCapsules(enhancedData);
              setLoading(false);
              return;
           }
        }

        setCapsules(capsulesData);
      } catch (err) {
        console.error('Error fetching capsules:', err);
      }
      setLoading(false);
    }

    fetchCapsules();
  }, []);

  const calculateTimeLeft = (unlockDate: string) => {
    const timeDiff = new Date(unlockDate).getTime() - new Date().getTime();
    if (timeDiff <= 0) return 'Unlocked';
    
    const years = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (years > 0) return `${years} years ${months} month left`;
    if (months > 0) return `${months} months left`;
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    return `${days} days left`;
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

  const parseMetadata = (jsonStr: string | null) => {
    try {
      if (!jsonStr) return { name: 'Letter to me', location: '' };
      const parsed = JSON.parse(jsonStr);
      return {
        name: parsed.name || 'Letter to me',
        location: parsed.location || ''
      };
    } catch {
      // Return structured defaults if JSON parsing fails
      return { name: jsonStr || 'Letter to me', location: '' };
    }
  };

  const filteredCapsules = capsules.filter(capsule => {
    const isUnlocked = new Date() >= new Date(capsule.unlock_date);
    const meta = parseMetadata(capsule.location_text);
    
    // Tab filtering
    let tabMatch = true;
    if (activeTab === 'Active') tabMatch = !isUnlocked;
    if (activeTab === 'Unlocked') tabMatch = isUnlocked;
    if (activeTab === 'Archive') tabMatch = capsule.status === 'archived';

    // Search filtering
    const searchMatch = meta.name.toLowerCase().includes(searchQuery.toLowerCase());

    return tabMatch && searchMatch;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-300">Loading your memories...</div>;
  }

  return (
    <div className="px-5 pt-8 pb-32">
      <h1 className="text-4xl text-brand-light mb-6 text-center shadow-accent">Library Chronos</h1>
      
      <div className="relative mb-4 glass-input flex items-center p-0 pr-4">
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Find a capsule" 
          className="w-full bg-transparent p-3 pl-5 outline-none rounded-2xl text-black placeholder-slate-500" 
        />
        <Filter className="text-primary-600" />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scroll mb-8">
        {['All', 'Active', 'Unlocked', 'Archive'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-primary-500 text-white' : 'bg-primary-500/30 text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredCapsules.map((capsule) => {
          const isUnlocked = new Date() >= new Date(capsule.unlock_date);
          const progress = calculateProgress(capsule.created_at, capsule.unlock_date);
          const meta = parseMetadata(capsule.location_text);

          const isVideo = capsule.content_url?.toLowerCase().match(/\.(mp4|webm|ogg)$/);
          const fullMediaUrl = capsule.signed_content_url || envelopePic;

          if (isUnlocked) {
            return (
              <Link
                key={capsule.id}
                to={`/capsule/${capsule.id}`}
                className="block bg-gradient-to-tr from-[#3D5B59] to-[#689793] rounded-2xl p-4 shadow-xl border border-[#B4E4D9]/20 transition-transform active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-white p-1 pb-4 rounded-sm rotate-[-4deg] shadow-lg flex-shrink-0 overflow-hidden">
                    {isVideo && capsule.signed_content_url ? (
                      <video src={fullMediaUrl} className="w-full h-full object-cover bg-slate-200" muted playsInline />
                    ) : (
                      <img 
                        src={fullMediaUrl}
                        onError={(e) => { e.currentTarget.src = envelopePic }}
                        alt="Memory thumbnail" 
                        className="w-full h-full object-cover bg-slate-200"
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">
                      {meta.name}
                    </h3>
                    <p className="text-xs text-white/80 mb-2">
                      Unlocked: {formatDate(capsule.unlock_date)}
                    </p>
                    <div className="flex items-center text-xs font-medium text-brand-light">
                      <ImagePlay size={14} className="mr-1" /> Go through memories
                    </div>
                  </div>
                </div>
              </Link>
            );
          }

          // Locked Card Style
          return (
            <Link
              key={capsule.id}
              to={`/capsule/${capsule.id}`}
              className="block bg-gradient-to-tr from-[#52447D] to-[#7966B2] rounded-2xl p-4 shadow-xl border border-primary-500/20 transition-transform active:scale-95"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-16 h-12 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-black/30">
                  {isVideo && capsule.signed_content_url ? (
                    <video src={fullMediaUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img 
                      src={fullMediaUrl} 
                      onError={(e) => { e.currentTarget.src = envelopePic }}
                      alt="Thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-base leading-tight">
                    {meta.name}
                  </h3>
                  <p className="text-white/70">Created: {formatDate(capsule.created_at)}</p>
                  <p className="text-white/70">Unlocks: {formatDate(capsule.unlock_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden flex shadow-inner border border-white/10">
                  <div 
                    className="h-full bg-white/50" 
                    style={{ width: `${progress}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}
                  ></div>
                </div>
                <span className="text-white/90">{calculateTimeLeft(capsule.unlock_date)}</span>
              </div>
            </Link>
          );
        })}
        {filteredCapsules.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No memories found.
          </div>
        )}
      </div>

      <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 flex flex-col items-center">
        <Link to="/create" className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(98,75,255,0.8)] border border-white/20 z-10 transition-transform active:scale-95">
          <Plus size={36} />
        </Link>
        <span className="text-xs mt-2 font-medium">Add a new capsule</span>
      </div>
    </div>
  );
}
