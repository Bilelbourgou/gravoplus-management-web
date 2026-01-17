import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Cpu,
  FileText,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/employees', icon: UserCog, label: 'Employés' },
  { path: '/machines', icon: Cpu, label: 'Machines' },
  { path: '/devis', icon: FileText, label: 'Devis' },
  { path: '/invoices', icon: Receipt, label: 'Factures' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <img src="/logo.png" alt="GravoPlus" className="logo-image" />
          {!collapsed && <span className="logo-text">GravoPlus</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-info">
            <div className="user-avatar">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div className="user-details">
                <span className="user-name">{user.firstName} {user.lastName}</span>
                <span className={`user-role badge badge-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </div>
            )}
          </div>
        )}
        <button className="logout-btn" onClick={logout} title="Déconnexion">
          <LogOut size={20} />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
