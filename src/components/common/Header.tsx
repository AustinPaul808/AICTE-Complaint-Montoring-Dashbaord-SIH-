import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Check, CheckCheck } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '../../services/supabase/notifications';

interface HeaderProps {
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, profile, role, departmentCode, signOut } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await getUserNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30-sec polling
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const getRoleBadge = () => {
    if (role === 'Administrator') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-800 text-red-100 uppercase tracking-wider border border-red-700">
          Administrator
        </span>
      );
    }
    if (role === 'Cross-Department Reviewer') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-800 text-purple-100 uppercase tracking-wider border border-purple-700">
          Cross-Bureau Reviewer
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
        {departmentCode ? `Officer (${departmentCode})` : 'Bureau Officer'}
      </span>
    );
  };

  return (
    <header className="bg-[#0b3b60] text-white border-b-4 border-[#e67e22] shadow-sm sticky top-0 z-30 font-sans">
      {/* Top Tricolor Bar */}
      <div className="gov-tricolor-stripe w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Bureau Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate && onNavigate('dashboard')}>
            <img
              src="/aicte-emblem.png"
              alt="AICTE Official Emblem"
              className="w-11 h-11 object-contain drop-shadow-md shrink-0"
            />
            <div>
              <div className="text-[10px] tracking-wider uppercase text-amber-200 font-semibold leading-tight">
                AICTE • अखिल भारतीय तकनीकी शिक्षा परिषद
              </div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Complaint Coordination Platform
              </div>
              <div className="text-[10px] text-slate-300 hidden sm:block">
                Inter-Bureau Regulatory &amp; Grievance Cell Portal
              </div>
            </div>
          </div>

          {/* Right Controls: Notifications & User Card */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* CPGRAMS & CSS Portals Button */}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('external-portals')}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-amber-200 border border-white/20 transition"
                title="Open simulated CPGRAMS & CSS intake portals"
              >
                <span>🇮🇳 CPGRAMS &amp; CSS Simulator</span>
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors focus:outline-none"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full border-2 border-[#0b3b60]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-md shadow-xl border border-slate-300 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Notifications ({unreadCount} Unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-[#0b3b60] hover:underline flex items-center space-x-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        No notifications registered.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                            !n.is_read ? 'bg-amber-50/70 border-l-4 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-slate-800 leading-snug">{n.message}</p>
                            {!n.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                title="Mark as read"
                                className="text-slate-400 hover:text-emerald-600 shrink-0 mt-0.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Summary */}
            <div className="flex items-center space-x-3 pl-3 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight flex items-center space-x-1.5">
                  <span>{profile?.full_name || user?.email?.split('@')[0]}</span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center space-x-1.5 mt-0.5">
                  {getRoleBadge()}
                  {profile?.designation && (
                    <span className="truncate max-w-[130px]">{profile.designation}</span>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1.5 rounded hover:bg-red-700/60 text-slate-200 hover:text-white transition-colors border border-transparent hover:border-red-500/50"
                title="Sign out of portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
