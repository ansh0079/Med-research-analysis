import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@hooks';
import api from '@services/api';

// Primary nav — 4 items visible at all times
const PRIMARY_NAV = [
  { to: '/search', label: 'Search', icon: 'fa-search' },
  { to: '/review', label: 'Review', icon: 'fa-clipboard-check' },
] as const;

// Tools dropdown — secondary features grouped together
const TOOLS_NAV = [
  { to: '/case',         label: 'Case mode',      icon: 'fa-stethoscope',  color: 'text-emerald-500' },
  { to: '/quiz',         label: 'Quiz',           icon: 'fa-brain',        color: 'text-violet-500'  },
  { to: '/practice',    label: 'Practice pool',  icon: 'fa-layer-group',  color: 'text-teal-500'   },
  { to: '/study-paths', label: 'Study paths',    icon: 'fa-route',        color: 'text-rose-500'   },
  { to: '/grant',       label: 'Grant writing',  icon: 'fa-file-alt',     color: 'text-amber-500'  },
  { to: '/saved',       label: 'Saved articles', icon: 'fa-bookmark',     color: 'text-indigo-500' },
  { to: '/team',        label: 'Team workspace', icon: 'fa-users',        color: 'text-sky-500'    },
  { to: '/guidelines',  label: 'Guidelines',     icon: 'fa-book-medical', color: 'text-slate-500'  },
] as const;

// User menu — account-level actions
const ACCOUNT_NAV = [
  { to: '/analytics',   label: 'Analytics',       icon: 'fa-chart-bar',   color: 'text-slate-400'  },
  { to: '/history',     label: 'Search history',  icon: 'fa-history',     color: 'text-slate-400'  },
  { to: '/knowledge',   label: 'Knowledge review',icon: 'fa-book-medical',color: 'text-emerald-400'},
  { to: '/settings',    label: 'Settings',        icon: 'fa-cog',         color: 'text-slate-400'  },
  { to: '/billing',     label: 'Billing & Plans', icon: 'fa-credit-card', color: 'text-indigo-400' },
] as const;

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'curator';
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = React.useState(false);
  const [dueCount, setDueCount] = React.useState(0);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    api.getDueReviewCount().then((r) => setDueCount(r.count)).catch(() => setDueCount(0));
    const id = setInterval(() => {
      api.getDueReviewCount().then((r) => setDueCount(r.count)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const isToolsActive = TOOLS_NAV.some((t) => pathname.startsWith(t.to));

  return (
    <nav className="top-nav">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2 sm:gap-4">

        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 rounded-lg ring-1 ring-white/20" />
            <i className="fas fa-dna text-white text-xs relative z-10" />
          </div>
          <span className="hidden min-[360px]:inline text-[0.82rem] font-bold text-slate-900 dark:text-white tracking-tight">
            MedResearch<span className="text-indigo-500">·AI</span>
          </span>
        </button>

        {/* Centre nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {/* Study — always first with due badge */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/learning')}
              className={`nav-link ${pathname.startsWith('/learning') ? 'active' : ''}`}
            >
              <i className="fas fa-graduation-cap text-[10px]" />
              Study
              {dueCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </button>
          )}

          {/* Primary nav items */}
          {PRIMARY_NAV.map(({ to, label, icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className={`nav-link ${pathname === to || (to !== '/search' && pathname.startsWith(to)) ? 'active' : ''}`}
            >
              <i className={`fas ${icon} text-[10px]`} />
              {label}
            </button>
          ))}

          {/* Tools dropdown */}
          {isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsMenuOpen((o) => !o)}
                onBlur={() => setTimeout(() => setToolsMenuOpen(false), 180)}
                className={`nav-link ${isToolsActive ? 'active' : ''}`}
              >
                <i className="fas fa-th text-[10px]" />
                Tools
                <i className="fas fa-chevron-down text-[8px] opacity-60" />
              </button>
              {toolsMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-fade-in">
                  {TOOLS_NAV.map(({ to, label, icon, color }) => (
                    <button
                      key={to}
                      type="button"
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => { navigate(to); setToolsMenuOpen(false); }}
                    >
                      <i className={`fas ${icon} w-3.5 ${color}`} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" strokeWidth="2"/>
                <path strokeLinecap="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            )}
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <i className="fas fa-chevron-down text-[8px] text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-700 py-1.5 z-50 animate-fade-in">
                  {ACCOUNT_NAV.map(({ to, label, icon, color }) => (
                    <button key={to} type="button"
                      onClick={() => { navigate(to); setUserMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                      <i className={`fas ${icon} w-3.5 ${color}`} /> {label}
                    </button>
                  ))}
                  {isStaff && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                      <button type="button" onClick={() => { navigate('/admin/quality'); setUserMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                        <i className="fas fa-clipboard-check w-3.5 text-violet-400" /> Quality review
                      </button>
                      <button type="button" onClick={() => { navigate('/admin/observability'); setUserMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors">
                        <i className="fas fa-chart-pie w-3.5 text-rose-400" /> Admin observability
                      </button>
                    </>
                  )}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button type="button"
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <i className="fas fa-sign-out-alt w-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/30"
            >
              Sign in
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
          >
            <i className="fas fa-bars text-sm" />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 max-h-[calc(100vh-var(--nav-h))] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 py-2 px-3 sm:px-4 flex flex-col gap-0.5 animate-fade-in z-50">
          {isAuthenticated && (
            <button type="button" onClick={() => { navigate('/learning'); setMobileMenuOpen(false); }}
              className={`nav-link w-full text-left ${pathname.startsWith('/learning') ? 'active' : ''}`}>
              <i className="fas fa-graduation-cap text-[10px]" /> Study
              {dueCount > 0 && <span className="ml-auto text-[10px] font-bold text-rose-500">{dueCount} due</span>}
            </button>
          )}
          {PRIMARY_NAV.map(({ to, label, icon }) => (
            <button key={to} type="button"
              onClick={() => { navigate(to); setMobileMenuOpen(false); }}
              className={`nav-link w-full text-left ${pathname === to ? 'active' : ''}`}>
              <i className={`fas ${icon} text-[10px]`} /> {label}
            </button>
          ))}
          {isAuthenticated && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2 pb-1">Tools</div>
              {TOOLS_NAV.map(({ to, label, icon, color }) => (
                <button key={to} type="button"
                  onClick={() => { navigate(to); setMobileMenuOpen(false); }}
                  className={`nav-link w-full text-left ${pathname.startsWith(to) ? 'active' : ''}`}>
                  <i className={`fas ${icon} text-[10px] ${color}`} /> {label}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button type="button" onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                className="nav-link w-full text-left">
                <i className="fas fa-cog text-[10px]" /> Settings
              </button>
              {isStaff && (
                <button type="button" onClick={() => { navigate('/admin/observability'); setMobileMenuOpen(false); }}
                  className="nav-link w-full text-left">
                  <i className="fas fa-chart-pie text-[10px]" /> Admin
                </button>
              )}
              <button type="button" onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="nav-link w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                <i className="fas fa-sign-out-alt text-[10px]" /> Sign out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
