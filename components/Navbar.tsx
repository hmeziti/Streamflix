import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { isMockMode, supabase } from '../services/supabase';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    if (!isMockMode && supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${isScrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
      <div className="px-4 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-primary text-2xl md:text-3xl font-bold tracking-tighter cursor-pointer">
            STREAMFLIX
          </Link>
          <ul className="hidden md:flex space-x-4 text-sm font-medium text-gray-200">
            <li className="hover:text-gray-400 transition cursor-pointer"><Link to="/">Home</Link></li>
            <li className="hover:text-gray-400 transition cursor-pointer">Series</li>
            <li className="hover:text-gray-400 transition cursor-pointer">Films</li>
            <li className="hover:text-gray-400 transition cursor-pointer">New & Popular</li>
            <li className="hover:text-gray-400 transition cursor-pointer">My List</li>
          </ul>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          <form onSubmit={handleSearch} className="relative hidden sm:block">
             <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Titles, people, genres" 
                className="bg-black/40 border border-gray-600 focus:border-white transition pl-8 pr-2 py-1 text-sm text-white w-64 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </form>
          <Bell className="w-5 h-5 text-gray-200 cursor-pointer hover:text-white" />
          <div className="group relative">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center cursor-pointer">
               <User className="w-5 h-5 text-white" />
            </div>
            {/* Dropdown */}
            <div className="absolute right-0 top-8 w-48 bg-black/90 border border-gray-700 rounded shadow-lg hidden group-hover:block pt-2">
               <div className="flex flex-col text-sm text-gray-300">
                  <Link to="/admin" className="px-4 py-2 hover:bg-gray-800 hover:text-white">Admin Dashboard</Link>
                  <button onClick={handleLogout} className="px-4 py-2 hover:bg-gray-800 hover:text-white text-left flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};