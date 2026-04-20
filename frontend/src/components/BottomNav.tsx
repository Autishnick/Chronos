import { Home, Library, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  
  // Hide bottom nav on auth screens
  if (location.pathname === '/auth') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px]">
      <div className="glass-panel rounded-full flex justify-around items-center p-3 px-6 shadow-xl">
        <Link 
          to="/home" 
          className={`p-2 transition-colors duration-200 ${location.pathname === '/home' ? 'text-primary-500' : 'text-slate-300 hover:text-white'}`}
        >
          <Home size={28} />
        </Link>
        <Link 
          to="/library" 
          className={`p-2 transition-colors duration-200 ${location.pathname === '/library' ? 'text-primary-500' : 'text-slate-300 hover:text-white'}`}
        >
          <Library size={28} />
        </Link>
        <Link 
          to="/profile" 
          className={`p-2 transition-colors duration-200 ${location.pathname === '/profile' ? 'text-primary-500' : 'text-slate-300 hover:text-white'}`}
        >
          <User size={28} />
        </Link>
      </div>
    </div>
  );
}
