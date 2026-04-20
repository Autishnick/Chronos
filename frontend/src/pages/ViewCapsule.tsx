import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

interface Capsule {
  id: string;
  location_text: string | null;
  unlock_date: string;
  status: string;
  content_url: string;
}

export default function ViewCapsule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{name: string, location: string, description: string, media?: string[]}>({
    name: 'Unknown Capsule',
    location: 'Unknown',
    description: ''
  });
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function init() {
      if (!id) return;
      try {
        const data = await api.getCapsuleById(id);
        setCapsule(data);
        
        let meta: { name: string, location: string, description: string, media?: string[] } = { 
          name: 'Unknown Capsule', 
          location: 'Unknown', 
          description: '' 
        };
        if (data.location_text) {
           try {
              const parsed = JSON.parse(data.location_text);
              meta = { ...meta, ...parsed };
           } catch {
              meta.location = data.location_text;
           }
        }
        setMetadata(meta);

        // Check if unlocked
        if (new Date() >= new Date(data.unlock_date)) {
          const pathsToSign = [];
          
          if (meta.media && Array.isArray(meta.media) && meta.media.length > 0) {
             pathsToSign.push(...meta.media);
          } else if (data.content_url) {
             pathsToSign.push(data.content_url);
          }

          if (pathsToSign.length > 0) {
            const { data: signData, error: signError } = await supabase.storage
              .from('capsule-media')
              .createSignedUrls(pathsToSign, 3600);
              
            if (!signError && signData) {
              setMediaUrls(signData.map(s => s.signedUrl).filter(Boolean) as string[]);
              setMediaUrl(signData[0]?.signedUrl || null);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load capsule.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-300">Loading memories...</div>;
  if (error || !capsule) return <div className="p-8 text-center text-red-400">{error || 'Not found'}</div>;

  const handleDelete = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <span className="text-sm font-medium">Are you sure you want to delete this capsule?</span>
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              setIsDeleting(true);
              const savingToastId = toast.loading('Deleting...');
              try {
                await api.deleteCapsule(id!);
                toast.success('Capsule deleted successfully', { id: savingToastId });
                navigate('/home');
              } catch (err: any) {
                toast.error(err.message || 'Failed to delete capsule.', { id: savingToastId });
                setIsDeleting(false);
              }
            }}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-red-500/90 hover:bg-red-500 text-white shadow-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      position: 'bottom-center',
      className: 'shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-red-500/30'
    });
  };

  const unlockDateObj = new Date(capsule.unlock_date);
  const isUnlocked = new Date() >= unlockDateObj;

  return (
    <div className="px-6 py-8 pb-32 relative">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/home')} className="text-white hover:text-primary-500 flex items-center gap-2">
          <ArrowLeft size={20} /> Back
        </button>
        <button onClick={handleDelete} disabled={isDeleting} className="text-red-400 hover:text-red-300 p-2 opacity-80 hover:opacity-100 transition-opacity">
          <Trash2 size={24} />
        </button>
      </div>
      
      <h1 className="text-4xl text-brand-light mb-8 text-center drop-shadow-md">
         {metadata.name || 'Trip to Kyiv'}
      </h1>

      {!isUnlocked ? (
        <div className="flex flex-col items-center justify-center p-12 glass-panel mt-12">
          <div className="w-16 h-12 bg-white/10 rounded flex items-center justify-center border border-white/20 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-300"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><path d="M12 11v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 font-sans text-center">Capsule is Sealed</h2>
          <p className="text-sm text-slate-300">Unlocks on {unlockDateObj.toLocaleDateString()}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Photo (Polaroid style) */}
          {mediaUrl && (
             <div className="bg-white p-3 pb-8 rounded shadow-2xl rotate-2 mx-auto w-4/5 max-w-[300px]">
               <img src={mediaUrl} alt="Memory" className="w-full h-auto object-cover bg-slate-200 aspect-square" />
             </div>
          )}

          <div className="flex items-center gap-3 mt-8">
            <span className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md whitespace-nowrap">Date</span>
            <div className="glass-input h-10 shadow-inner flex items-center">{unlockDateObj.toLocaleDateString()}</div>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md whitespace-nowrap">Location</span>
            <div className="glass-input h-10 shadow-inner flex items-center">{metadata.location}</div>
          </div>

          <div className="w-full bg-white rounded-2xl p-4 text-black text-sm shadow-inner min-h-[120px]">
             {metadata.description || 'No description provided.'}
          </div>

          {/* Grid for multiple photos */}
          {mediaUrls.length > 1 && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-primary-500/50 relative">
               {mediaUrls.slice(1).map((url, idx) => (
                 <div key={idx} className="aspect-square bg-slate-800 rounded overflow-hidden shadow-inner">
                   <img src={url} className="w-full h-full object-cover" alt={`Memory ${idx + 2}`} />
                 </div>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
