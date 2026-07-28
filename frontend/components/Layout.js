import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import NotificationBell from './NotificationBell';

const ALL = ['EMPLOYEE', 'TEAM_LEADER', 'MANAGER', 'ADMIN'];

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: GridIcon, roles: ALL },
  { href: '/approvals', label: 'Approvals', icon: CheckIcon, roles: ['MANAGER', 'ADMIN'] },
  { href: '/teams', label: 'Teams', icon: UsersIcon, roles: ALL },
  { href: '/projects', label: 'Projects', icon: TargetIcon, roles: ALL },
  { href: '/tasks', label: 'My Tasks', icon: TaskIcon, roles: ['EMPLOYEE', 'TEAM_LEADER'] },
  { href: '/leave', label: 'Leave', icon: CalendarIcon, roles: ALL },
  { href: '/attendance', label: 'Attendance', icon: ClockIcon, roles: ALL },
  { href: '/announcements', label: 'Announcements', icon: MegaphoneIcon, roles: ALL },
  { href: '/admin', label: 'Admin', icon: ChartIcon, roles: ['ADMIN'] },
];

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [router.pathname]);

  const visibleNav = NAV_ITEMS.filter((n) => !user || n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-surface font-body flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-ink text-white min-h-screen sticky top-0">
        <div className="px-6 py-6 flex items-center gap-2">
          <LogoMark />
          <span className="font-display font-bold text-lg tracking-tight">GoalSync</span>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {visibleNav.map((item) => (
            <SidebarLink key={item.href} item={item} active={router.pathname.startsWith(item.href)} />
          ))}
        </nav>
        {user && (
          <div className="px-4 py-5 border-t border-white/10">
            <div className="flex items-center gap-3 px-2">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/50 capitalize">{user.role.replace('_',' ').toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 w-full text-left px-2 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-ink text-white flex items-center justify-between px-4 h-14">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 -ml-2">
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark small />
          <span className="font-display font-bold">GoalSync</span>
        </div>
        <NotificationBell compact />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-72 bg-ink text-white h-full flex flex-col animate-[slideIn_.2s_ease-out]">
            <div className="px-5 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoMark />
                <span className="font-display font-bold text-lg">GoalSync</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1">
                <CloseIcon />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-1">
              {visibleNav.map((item) => (
                <SidebarLink key={item.href} item={item} active={router.pathname.startsWith(item.href)} />
              ))}
            </nav>
            {user && (
              <div className="px-4 py-5 border-t border-white/10">
                <div className="flex items-center gap-3 px-2">
                  <Avatar name={user.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-white/50 capitalize">{user.role.replace('_',' ').toLowerCase()}</p>
                  </div>
                </div>
                <button onClick={logout} className="mt-4 w-full text-left px-2 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                  Sign out
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-card border-b border-black/5 sticky top-0 z-10">
          <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
          <NotificationBell />
        </header>
        <main className="pt-14 md:pt-0 px-4 sm:px-6 md:px-8 py-6 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon />
      {item.label}
    </Link>
  );
}

function Avatar({ name }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-accent/90 text-ink font-display font-bold text-sm flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  );
}

function LogoMark({ small }) {
  const s = small ? 24 : 28;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#2952E3" />
      <path d="M9 17.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
    </svg>
  );
}
function TaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11v3a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8a4 4 0 010 8M18 5a8 8 0 010 14" strokeLinecap="round" />
    </svg>
  );
}
