import { useEffect, useState } from 'react';
import {
  Users,
  UserCog,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Clock,
  CreditCard,
  AlertTriangle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Header } from '../components/layout';
import { dashboardApi, devisApi, clientsApi } from '../services';
import type { DashboardStats, DevisStatus, Client } from '../types';
import { useAuthStore } from '../store/auth.store';
import './DashboardPage.css';

const STATUS_COLORS: Record<DevisStatus, string> = {
  DRAFT: '#64748b',
  VALIDATED: '#3b82f6',
  INVOICED: '#22c55e',
  CANCELLED: '#ef4444',
};

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

interface CustomField {
  id: string;
  name: string;
  value: string;
}

interface CustomDevisItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  customFields: CustomField[];
}

interface CustomColumn {
  id: string;
  name: string;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Devis Modal State
  const [showCustomDevisModal, setShowCustomDevisModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customItems, setCustomItems] = useState<CustomDevisItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, customFields: [] }
  ]);
  const [customDevisNotes, setCustomDevisNotes] = useState('');
  const [savingCustomDevis, setSavingCustomDevis] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      clientsApi.getAll().then(setClients).catch(console.error);
    }
  }, [isAdmin]);

  const addCustomColumn = () => {
    if (!newColumnName.trim()) return;
    const newCol: CustomColumn = { id: crypto.randomUUID(), name: newColumnName.trim() };
    setCustomColumns([...customColumns, newCol]);
    // Add this field to all existing items
    setCustomItems(customItems.map(item => ({
      ...item,
      customFields: [...item.customFields, { id: newCol.id, name: newCol.name, value: '' }]
    })));
    setNewColumnName('');
  };

  const removeCustomColumn = (colId: string) => {
    setCustomColumns(customColumns.filter(c => c.id !== colId));
    // Remove this field from all items
    setCustomItems(customItems.map(item => ({
      ...item,
      customFields: item.customFields.filter(f => f.id !== colId)
    })));
  };

  const addCustomItem = () => {
    const newItem: CustomDevisItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      customFields: customColumns.map(col => ({ id: col.id, name: col.name, value: '' }))
    };
    setCustomItems([...customItems, newItem]);
  };

  const removeCustomItem = (id: string) => {
    if (customItems.length > 1) {
      setCustomItems(customItems.filter(item => item.id !== id));
    }
  };

  const updateCustomItem = (id: string, field: 'description' | 'quantity' | 'unitPrice', value: string | number) => {
    setCustomItems(customItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateCustomField = (itemId: string, fieldId: string, value: string) => {
    setCustomItems(customItems.map(item => 
      item.id === itemId 
        ? { ...item, customFields: item.customFields.map(f => f.id === fieldId ? { ...f, value } : f) }
        : item
    ));
  };

  const calculateCustomTotal = () => {
    return customItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleCreateCustomDevis = async () => {
    if (!selectedClientId) {
      alert('Veuillez sélectionner un client');
      return;
    }
    
    const validItems = customItems.filter(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert('Veuillez ajouter au moins un article valide');
      return;
    }

    setSavingCustomDevis(true);
    try {
      // Build description including custom fields
      const itemsWithCustomFields = validItems.map(item => {
        let fullDescription = item.description;
        if (item.customFields.length > 0) {
          const customFieldsText = item.customFields
            .filter(f => f.value.trim())
            .map(f => `${f.name}: ${f.value}`)
            .join(' | ');
          if (customFieldsText) {
            fullDescription += ` (${customFieldsText})`;
          }
        }
        return { description: fullDescription, quantity: item.quantity, unitPrice: item.unitPrice };
      });

      await devisApi.createCustom({
        clientId: selectedClientId,
        items: itemsWithCustomFields,
        notes: customDevisNotes || undefined,
      });
      
      // Reset and close modal
      setShowCustomDevisModal(false);
      setSelectedClientId('');
      setCustomColumns([]);
      setCustomItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, customFields: [] }]);
      setCustomDevisNotes('');
      
      // Refresh stats
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      alert('Erreur lors de la création du devis');
    } finally {
      setSavingCustomDevis(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Erreur: {error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: 'Brouillon', value: stats.devisByStatus.draft, color: STATUS_COLORS.DRAFT },
    { name: 'Validé', value: stats.devisByStatus.validated, color: STATUS_COLORS.VALIDATED },
    { name: 'Facturé', value: stats.devisByStatus.invoiced, color: STATUS_COLORS.INVOICED },
    { name: 'Annulé', value: stats.devisByStatus.cancelled, color: STATUS_COLORS.CANCELLED },
  ].filter(item => item.value > 0);

  return (
    <>
      <Header title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" />
      
      <div className="dashboard-content">
        {/* Daily Stats */}
        <div className="stats-grid daily-stats mb-6">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FileText size={24} />
            </div>
            <div className="stat-value">{stats.todaysDevisTotal.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Devis aujourd'hui</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <Receipt size={24} />
            </div>
            <div className="stat-value">{stats.todaysInvoicesTotal.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Factures aujourd'hui</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <CreditCard size={24} />
            </div>
            <div className="stat-value">{stats.todaysPaymentsTotal.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Paiements aujourd'hui</div>
          </div>
        </div>

        {/* Financial Stats Cards */}
        <div className="stats-grid financial-stats">
          <div className="stat-card income">
            <div className="stat-icon green">
              <TrendingUp size={24} />
            </div>
            <div className="stat-value">{stats.totalRevenue.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Revenus</div>
          </div>

          <div className="stat-card expenses">
            <div className="stat-icon red">
              <TrendingDown size={24} />
            </div>
            <div className="stat-value">{stats.totalExpenses.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Dépenses</div>
          </div>

          <div className={`stat-card profit ${stats.netProfit >= 0 ? 'positive' : 'negative'}`}>
            <div className={`stat-icon ${stats.netProfit >= 0 ? 'green' : 'red'}`}>
              <Wallet size={24} />
            </div>
            <div className="stat-value">{stats.netProfit.toFixed(2)} <span className="currency">TND</span></div>
            <div className="stat-label">Bénéfice net</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Users size={24} />
            </div>
            <div className="stat-value">{stats.totalClients}</div>
            <div className="stat-label">Clients</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <UserCog size={24} />
            </div>
            <div className="stat-value">{stats.totalEmployees}</div>
            <div className="stat-label">Employés</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <FileText size={24} />
            </div>
            <div className="stat-value">{stats.totalDevis}</div>
            <div className="stat-label">Devis</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <Receipt size={24} />
            </div>
            <div className="stat-value">{stats.totalInvoices}</div>
            <div className="stat-label">Factures</div>
          </div>
        </div>

        {/* Unpaid Clients Warning */}
        {stats.unpaidClients && stats.unpaidClients.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: '1.5rem' }}>
            <div className="card-header flex justify-between items-center">
              <h3 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                Clients avec solde impayé ({stats.unpaidClients.length})
              </h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Total</th>
                      <th>Payé</th>
                      <th>Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.unpaidClients.map((c) => (
                      <tr key={c.clientId}>
                        <td className="font-medium">{c.clientName}</td>
                        <td>{c.totalAmount.toFixed(3)} TND</td>
                        <td style={{ color: '#22c55e' }}>{c.totalPaid.toFixed(3)} TND</td>
                        <td style={{ color: '#ef4444', fontWeight: 700 }}>{c.remaining.toFixed(3)} TND</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="charts-row">
          {/* Revenue vs Expenses Chart */}
          <div className="card chart-card">
            <div className="card-header">
              <h3>Revenus vs Dépenses (6 derniers mois)</h3>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyRevenue.map((r, i) => ({
                  month: r.month,
                  revenue: r.revenue,
                  expenses: stats.monthlyExpenses[i]?.expenses || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `${value} TND`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f8fafc' }}
                    formatter={(value, name) => [
                      `${(value as number).toFixed(2)} TND`,
                      name === 'revenue' ? 'Revenus' : 'Dépenses'
                    ]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#revenueGradient)"
                    radius={[4, 4, 0, 0]}
                    name="revenue"
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill="url(#expenseGradient)"
                    radius={[4, 4, 0, 0]}
                    name="expenses"
                  />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="card chart-card pie-chart-card">
            <div className="card-header">
              <h3>Statut des devis</h3>
            </div>
            <div className="card-body chart-container">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">
                  <p>Aucun devis disponible</p>
                </div>
              )}
              <div className="pie-legend">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ background: STATUS_COLORS[key as DevisStatus] }}
                    />
                    <span className="legend-label">{label}</span>
                    <span className="legend-value">
                      {stats.devisByStatus[key.toLowerCase() as keyof typeof stats.devisByStatus]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Devis */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3>Devis récents</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isAdmin && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCustomDevisModal(true)}
                >
                  <Plus size={16} /> Devis Personnalisé
                </button>
              )}
              <a href="/devis" className="btn btn-ghost btn-sm">
                Voir tout <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="card-body">
            {stats.recentDevis.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentDevis.map((devis) => (
                      <tr key={devis.id}>
                        <td className="font-medium">{devis.reference}</td>
                        <td>{devis.clientName}</td>
                        <td>{devis.totalAmount.toFixed(2)} TND</td>
                        <td>
                          <span className={`badge badge-${devis.status.toLowerCase()}`}>
                            {STATUS_LABELS[devis.status]}
                          </span>
                        </td>
                        <td>
                          <span className="table-date">
                            <Clock size={14} />
                            {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">
                <FileText size={48} strokeWidth={1} />
                <p>Aucun devis récent</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Devis Modal */}
      {showCustomDevisModal && (
        <div className="modal-overlay" onClick={() => setShowCustomDevisModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Créer un Devis Personnalisé</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCustomDevisModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Client Selection */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Client *</label>
                <select
                  className="form-input"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Custom Column */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ajouter une colonne personnalisée</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nom de la colonne (ex: Dimensions, Couleur...)"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomColumn()}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary" onClick={addCustomColumn} disabled={!newColumnName.trim()}>
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                {customColumns.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {customColumns.map(col => (
                      <span key={col.id} className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                        {col.name}
                        <button 
                          onClick={() => removeCustomColumn(col.id)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Articles</label>
                  <button className="btn btn-ghost btn-sm" onClick={addCustomItem}>
                    <Plus size={16} /> Ajouter ligne
                  </button>
                </div>
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '200px' }}>Description</th>
                        <th style={{ minWidth: '100px' }}>Quantité</th>
                        <th style={{ minWidth: '120px' }}>Prix Unitaire</th>
                        {customColumns.map(col => (
                          <th key={col.id} style={{ minWidth: '120px' }}>{col.name}</th>
                        ))}
                        <th style={{ minWidth: '100px' }}>Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {customItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Description de l'article"
                              value={item.description}
                              onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCustomItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateCustomItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          {item.customFields.map(field => (
                            <td key={field.id}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder={field.name}
                                value={field.value}
                                onChange={(e) => updateCustomField(item.id, field.id, e.target.value)}
                              />
                            </td>
                          ))}
                          <td style={{ fontWeight: 600 }}>
                            {(item.quantity * item.unitPrice).toFixed(3)} TND
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => removeCustomItem(item.id)}
                              disabled={customItems.length === 1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3 + customColumns.length} style={{ textAlign: 'right', fontWeight: 700 }}>Total:</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-500)' }}>
                          {calculateCustomTotal().toFixed(3)} TND
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optionnel)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Notes supplémentaires..."
                  value={customDevisNotes}
                  onChange={(e) => setCustomDevisNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCustomDevisModal(false)}>
                Annuler
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateCustomDevis}
                disabled={savingCustomDevis}
              >
                {savingCustomDevis ? <span className="spinner" /> : null}
                Créer le Devis
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
