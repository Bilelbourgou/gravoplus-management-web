import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Check, CheckCheck, Users, FileText, Receipt, Wallet, CreditCard } from 'lucide-react';
import { notificationsApi } from '../../services';
import { connectSocket, onNotification, offNotification } from '../../services/socket';
import { useAuthStore } from '../../store/auth.store';
import type { Notification } from '../../types';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const getNotificationIcon = (type: string) => {
  if (type.includes('CLIENT')) return Users;
  if (type.includes('DEVIS')) return FileText;
  if (type.includes('INVOICE')) return Receipt;
  if (type.includes('EXPENSE')) return Wallet;
  if (type.includes('PAYMENT')) return CreditCard;
  return Bell;
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

export function Header({ title, subtitle }: HeaderProps) {
  const { user, token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const fetchNotifications = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        notificationsApi.getAll(20),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle new real-time notification
  const handleNewNotification = useCallback((notification: unknown) => {
    const notif = notification as Notification;
    setNotifications(prev => [notif, ...prev.slice(0, 19)]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (!isAdmin || !token) return;

    connectSocket(token);
    onNotification(handleNewNotification);

    return () => {
      offNotification(handleNewNotification);
    };
  }, [isAdmin, token, handleNewNotification]);

  // Initial fetch of notifications
  useEffect(() => {
    fetchNotifications();
  }, [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

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

        {isAdmin && (
          <div className="notification-container" ref={dropdownRef}>
            <button 
              className="notification-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      className="mark-all-read-btn"
                      onClick={handleMarkAllAsRead}
                      title="Tout marquer comme lu"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                </div>

                <div className="notification-list">
                  {loading && notifications.length === 0 ? (
                    <div className="notification-empty">
                      <div className="spinner" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={32} strokeWidth={1} />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
                        <div 
                          key={notification.id}
                          className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                        >
                          <div className="notification-icon">
                            <Icon size={18} />
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {formatTimeAgo(notification.createdAt)}
                              {notification.triggeredBy && (
                                <span> • {notification.triggeredBy.firstName} {notification.triggeredBy.lastName}</span>
                              )}
                            </div>
                          </div>
                          {!notification.isRead && (
                            <button 
                              className="notification-mark-read"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="Marquer comme lu"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
