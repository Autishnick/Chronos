import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';
import envelopeGif from '../assets/envelopeGif4.gif';

// Leaflet marker icon configuration
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapPicker({ setLocationText }: { setLocationText: (t: string) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click: async (e) => {
      setPosition(e.latlng);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
        const data = await res.json();
        const address = data.address;
        const locName = address.city || address.town || address.village || address.state || 'Unknown Location';
        setLocationText(locName + (address.country ? `, ${address.country}` : ''));
      } catch (err) {
        console.error(err);
      }
    }
  });

  return position === null ? null : <Marker position={position} />;
}

export default function CreateCapsule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [locationText, setLocationText] = useState('');
  const [nameText, setNameText] = useState('');
  const [description, setDescription] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  /**
   * [DEVELOPER TOGGLE]
   * Set ALLOW_PAST_DATES to true to permit creating capsules in the past (useful for testing email notifications).
   * Set to false for the final production build to enforce future-only dates.
   */
  const ALLOW_PAST_DATES = true;

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const minDate = ALLOW_PAST_DATES ? undefined : tomorrowDate.toISOString().split('T')[0];

  useEffect(() => {
    // Cleanup previews to prevent memory leak
    return () => {
      files.forEach(f => {
        if ((f as any).preview) URL.revokeObjectURL((f as any).preview);
      });
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);

    if (files.length + newFiles.length > 10) {
      toast.error('You can only upload up to 10 media files.');
      return;
    }

    const withPreviews = newFiles.map(f => {
      (f as any).preview = URL.createObjectURL(f);
      return f;
    });

    setFiles(prev => [...prev, ...withPreviews]);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => {
      const updated = [...prev];
      const removed = updated.splice(indexToRemove, 1)[0];
      if ((removed as any).preview) URL.revokeObjectURL((removed as any).preview);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameText.trim()) {
      toast.error('Please give your capsule a name.');
      return;
    }
    if (files.length === 0 || !user) {
      toast.error('Please select at least one media file.');
      return;
    }
    if (!unlockDate) {
      toast.error('Please select an unlock date.');
      return;
    }
    if (!locationText.trim()) {
      toast.error('Please specify a location (or pick one on the map).');
      return;
    }

    setLoading(true);
    const savingToastId = toast.loading('Packing capsule...');

    try {
      const capsuleId = crypto.randomUUID();
      const uploadedPaths: string[] = [];

      for (const f of files) {
        const fileExt = f.name.split('.').pop();
        const filePath = `${capsuleId}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('capsule-media')
          .upload(filePath, f);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        uploadedPaths.push(filePath);
      }

      const contentUrl = uploadedPaths.length > 0 ? uploadedPaths[0] : null;

      const metadata = {
        name: nameText,
        location: locationText,
        description: description,
        media: uploadedPaths
      };

      await api.createCapsule({
        capsuleId,
        contentUrl,
        locationText: JSON.stringify(metadata), // Storing structured metadata as a string in the location_text field
        unlockDate: new Date(unlockDate).toISOString(),
      });

      toast.success('Capsule packed successfully!', { id: savingToastId });
      navigate('/home');
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.', { id: savingToastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 pb-32">
      <h1 className="text-4xl text-brand-light mb-8 text-center drop-shadow-md">Create your capsule</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Decorative Top Envelope */}
        <div className="bg-transparent w-full max-w-[280px] mx-auto flex items-center justify-center relative shadow-none mb-8">
          <img src={envelopeGif} alt="Capsule Envelope" className="w-full h-auto object-contain drop-shadow-2xl" />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md whitespace-nowrap">Name</label>
          <input
            type="text"
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
            placeholder="My capsule"
            required
            className="glass-input h-10 shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md inline-block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            rows={4}
            className="w-full bg-white rounded-2xl p-4 text-black text-sm outline-none focus:ring-2 ring-primary-500 shadow-inner resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md inline-block cursor-pointer hover:bg-primary-400 transition-colors">
            Add photos and videos (up to 10)
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          </label>
          <div className="border border-white/20 p-2 min-h-[100px] flex gap-2 overflow-x-auto hide-scroll items-center rounded relative bg-black/10">
            {files.length > 0 ? (
              files.map((f, i) => {
                const isVideo = f.type.startsWith('video/');
                return (
                  <div key={i} className="relative flex-shrink-0">
                    {isVideo ? (
                      <video src={(f as any).preview} className="h-24 w-24 object-cover rounded shadow border border-white/10" muted playsInline />
                    ) : (
                      <img src={(f as any).preview} className="h-24 w-24 object-cover rounded shadow border border-white/10" alt={`Preview ${i}`} />
                    )}
                    {i === 0 && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[10px] px-2 py-0.5 rounded shadow z-10 pointer-events-none">Cover</span>}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors z-10"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="text-slate-400 text-sm italic py-4 w-full text-center">No files selected yet</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md whitespace-nowrap">Unlock date</label>
          <input
            type={unlockDate ? "date" : "text"}
            onFocus={(e) => (e.target.type = "date")}
            onBlur={(e) => (!e.target.value && (e.target.type = "text"))}
            min={minDate}
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            placeholder="Pick an unlock date"
            className="glass-input h-10 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md whitespace-nowrap">Location</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Lviv, Ukraine"
            required
            className="glass-input h-10 shadow-inner"
          />
        </div>

        <div className="w-full h-48 bg-slate-800 rounded-2xl relative overflow-hidden shadow-inner border border-white/10 z-0">
          <MapContainer center={[49.8397, 24.0297]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapPicker setLocationText={setLocationText} />
          </MapContainer>
        </div>

        <div className="space-y-4 pt-4 relative z-10">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Wait...' : 'Save capsule'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="btn-primary !bg-none bg-[#3D5B59]/60 hover:bg-[#3D5B59]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
