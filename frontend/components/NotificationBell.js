import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

export default function NotificationBell({ compact }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch (e) {
      /* silent */
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (!socket) return;
    const handler = (n) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((c) => c + 1);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className={`relative p-2 rounded-lg transition-colors ${compact ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-black/5'}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-card rounded-xl2 shadow-card border border-black/5 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <p className="font-display font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <p className="text-sm text-slate-650 px-4 py-6 text-center">You're all caught up.</p>}
            {items.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-black/5 last:border-0 text-sm ${!n.isRead ? 'bg-primary-50' : ''}`}>
                <p className="text-ink">{n.message}</p>
                <p className="text-xs text-slate-650 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
