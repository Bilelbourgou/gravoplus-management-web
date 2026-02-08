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
import { dashboardApi } from '../services';
import type { DashboardStats, DevisStatus } from '../types';
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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <a href="/devis" className="btn btn-ghost btn-sm">
              Voir tout <ArrowUpRight size={16} />
            </a>
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
    </>
  );
}
