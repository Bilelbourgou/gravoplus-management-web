import { Bell, Search } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="page-title">
          <h1>{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Rechercher..." />
        </div>

        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
      </div>
    </header>
  );
}
