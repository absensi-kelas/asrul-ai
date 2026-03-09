import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Users, Shield, Zap, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../context/AuthContext';

export const DeveloperDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // New User Form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('BASIC');
  const [newLimit, setNewLimit] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError('Gagal memuat data user. Pastikan tabel "profiles" sudah ada di Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .insert([
          { 
            username: newUsername, 
            password: newPassword, 
            role: newRole, 
            daily_limit: newLimit,
            used_today: 0
          }
        ]);

      if (error) throw error;
      
      setNewUsername('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Hapus user ini?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      setError('Gagal menghapus user.');
    }
  };

  const handleUpdateLimit = async (id: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ daily_limit: newLimit })
        .eq('id', id);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      setError('Gagal update limit.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl glass-panel p-6 max-h-[90vh] overflow-y-auto border-neon-cyan/30"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-neon-cyan" />
            <div>
              <h2 className="text-xl font-bold neon-text">Developer Control</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Manage Users & Limits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl">
          <h3 className="text-xs font-bold text-neon-cyan mb-1.5 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Database Setup (SQL)
          </h3>
          <p className="text-[9px] text-white/50 mb-1.5">Jalankan SQL ini di Supabase SQL Editor:</p>
          <pre className="text-[8px] bg-black/50 p-2 rounded border border-white/10 overflow-x-auto font-mono text-neon-cyan/70">
{`CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  daily_limit INTEGER DEFAULT 10,
  used_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neon-cyan" />
                Tambah User
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Username</label>
                  <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                    placeholder="Username"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Password</label>
                  <input 
                    type="text" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                    placeholder="Password"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Role</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Limit Harian</label>
                  <input 
                    type="number" 
                    value={newLimit}
                    onChange={(e) => setNewLimit(parseInt(e.target.value))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                    min="1"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full neon-button py-2 text-sm font-bold mt-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'BUAT AKUN'}
                </button>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-neon-cyan" />
              Daftar User
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.length === 0 ? (
                  <p className="text-center py-10 text-white/20 italic">Belum ada user.</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${u.role === 'PREMIUM' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/10 text-white/40'}`}>
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{u.username}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${u.role === 'PREMIUM' ? 'border-neon-purple/50 text-neon-purple' : 'border-white/20 text-white/40'}`}>
                              {u.role}
                            </span>
                            <span className="text-[9px] text-white/30 font-mono">
                              Used: {u.used_today}/{u.daily_limit}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            defaultValue={u.daily_limit}
                            onBlur={(e) => handleUpdateLimit(u.id, parseInt(e.target.value))}
                            className="w-16 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-center focus:border-neon-cyan outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
