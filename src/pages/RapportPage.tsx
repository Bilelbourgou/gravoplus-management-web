import { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CreditCard,
  ChevronUp,
  ChevronDown,
  Users,
  Box,
} from 'lucide-react';
import { Header } from '../components/layout';
import { rapportApi, dashboardApi } from '../services';
import { exportToExcel } from '../utils/exportExcel';
import { useAuthStore } from '../store/auth.store';
import type { DashboardStats } from '../types';
import './RapportPage.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

export function RapportPage() {
  const { user, privacyMode } = useAuthStore();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>('');
  const [day, setDay] = useState<number | ''>('');
  const [data, setData] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    devis: false,
    invoices: false,
    expenses: false,
    productivity: false,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const maskValue = (val: string | number) => {
    if (!privacyMode) return typeof val === 'number' ? val.toFixed(2) : val;
    return '••••';
  };

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await rapportApi.getYearly(year, month === '' ? undefined : month, day === '' ? undefined : day);
      setData(result);
    } catch (err) {
      console.error('Error fetching rapport:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, day]);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysInMonth = month !== '' ? new Date(year, Number(month), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const stats = await dashboardApi.getStats();
        setDashboardStats(stats);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };
    fetchDashboardStats();
  }, []);

  const handleExportDevis = () => {
    if (!data?.devis) return;
    exportToExcel(
      data.devis,
      [
        { header: 'Référence', accessor: (d: any) => d.reference },
        { header: 'Client', accessor: (d: any) => d.client?.name || '' },
        { header: 'Statut', accessor: (d: any) => STATUS_LABELS[d.status] || d.status },
        { header: 'Montant (TND)', accessor: (d: any) => Number(d.totalAmount).toFixed(3) },
        { header: 'Payé (TND)', accessor: (d: any) => Number(d.totalPaid || 0).toFixed(3) },
        { header: 'Reste (TND)', accessor: (d: any) => Number(d.remaining || 0).toFixed(3) },
        { header: 'Créé par', accessor: (d: any) => `${d.createdBy?.firstName || ''} ${d.createdBy?.lastName || ''}`.trim() },
        { header: 'Date', accessor: (d: any) => new Date(d.createdAt).toLocaleDateString('fr-FR') },
      ],
      `rapport_devis_${year}`
    );
  };

  const handleExportInvoices = () => {
    if (!data?.invoices) return;
    exportToExcel(
      data.invoices,
      [
        { header: 'Référence', accessor: (inv: any) => inv.reference },
        { header: 'Client', accessor: (inv: any) => inv.client?.name || '' },
        { header: 'Devis', accessor: (inv: any) => (inv.devis || []).map((d: any) => d.reference).join(', ') },
        { header: 'Montant (TND)', accessor: (inv: any) => Number(inv.totalAmount).toFixed(3) },
        { header: 'Date', accessor: (inv: any) => new Date(inv.createdAt).toLocaleDateString('fr-FR') },
      ],
      `rapport_factures_${year}`
    );
  };

  const handleExportExpenses = () => {
    if (!data?.expenses) return;
    exportToExcel(
      data.expenses,
      [
        { header: 'Description', accessor: (e: any) => e.description },
        { header: 'Catégorie', accessor: (e: any) => e.category },
        { header: 'Montant (TND)', accessor: (e: any) => Number(e.amount).toFixed(3) },
        { header: 'Créé par', accessor: (e: any) => `${e.createdBy?.firstName || ''} ${e.createdBy?.lastName || ''}`.trim() },
        { header: 'Date', accessor: (e: any) => new Date(e.date).toLocaleDateString('fr-FR') },
      ],
      `rapport_depenses_${year}_${month || 'all'}_${day || 'all'}`
    );
  };

  const handleExportProductivity = () => {
    if (!data?.revenueByEmployee) return;
    exportToExcel(
      data.revenueByEmployee,
      [
        { header: 'Employé', accessor: (item: any) => item.employeeName },
        { header: 'Nombre de Devis', accessor: (item: any) => item.paymentCount },
        { header: 'Montant (TND)', accessor: (item: any) => Number(item.totalAmount).toFixed(3) },
      ],
      `rapport_productivitee_employes_${year}_${month || 'all'}`
    );
  };

  const handleExportMachineProductivity = () => {
    if (!data?.productivityByMachine) return;
    exportToExcel(
      data.productivityByMachine,
      [
        { header: 'Machine', accessor: (item: any) => item.machine },
        { header: 'Opérations', accessor: (item: any) => item.count },
        { header: 'Montant (TND)', accessor: (item: any) => Number(item.totalAmount).toFixed(3) },
      ],
      `rapport_productivitee_machines_${year}_${month || 'all'}`
    );
  };

  const handleExportAll = () => {
    handleExportDevis();
    handleExportInvoices();
    handleExportExpenses();
    handleExportProductivity();
    handleExportMachineProductivity();
  };

  const handleClean = async () => {
    setCleaning(true);
    try {
      const result = await rapportApi.cleanYear(year);
      alert(`Nettoyage terminé : ${result.deletedDevis} devis et ${result.deletedInvoices} factures supprimés.`);
      setCleanModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erreur lors du nettoyage');
    } finally {
      setCleaning(false);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(3)} TND`;

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement du rapport annuel...</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <>
      <Header
        title={`Rapport Annuel ${year}`}
        subtitle="Vue d'ensemble financière et nettoyage des données"
      />

      <div className="page-content">
        {/* Year Selector + Actions */}
        <div className="actions-bar">
          <div className="year-selector" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-group">
              <label>Année :</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Mois :</label>
              <select value={month} onChange={(e) => { setMonth(e.target.value === '' ? '' : Number(e.target.value)); setDay(''); }}>
                <option value="">Tous les mois</option>
                {monthNames.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Jour :</label>
              <select value={day} onChange={(e) => setDay(e.target.value === '' ? '' : Number(e.target.value))} disabled={month === ''}>
                <option value="">Tous les jours</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="rapport-header-actions">
            <button className="btn btn-secondary" onClick={handleExportAll}>
              <Download size={18} />
              Exporter Tout (Excel)
            </button>
            <button
              className="btn btn-danger-outline"
              onClick={() => setCleanModalOpen(true)}
            >
              <Trash2 size={18} />
              Nettoyer l'année
            </button>
          </div>
        </div>

        {/* Dashboard Stats (Today & Totals) - Premium Cards */}
        {dashboardStats && (
          <div className="dashboard-stats-overview">
            <h3 className="section-title">Aperçu aujourd'hui</h3>
            <div className="stats-grid extra-grid daily-stats mb-6">
              <div className="stat-card">
                <div className="stat-icon blue">
                  <FileText size={24} />
                </div>
                <div className="stat-value">{maskValue(dashboardStats.todaysDevisTotal)} <span className="currency">TND</span></div>
                <div className="stat-label">Devis aujourd'hui</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">
                  <Receipt size={24} />
                </div>
                <div className="stat-value">{maskValue(dashboardStats.todaysInvoicesTotal)} <span className="currency">TND</span></div>
                <div className="stat-label">Factures aujourd'hui</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <CreditCard size={24} />
                </div>
                <div className="stat-value">{maskValue(dashboardStats.todaysPaymentsTotal)} <span className="currency">TND</span></div>
                <div className="stat-label">Paiements aujourd'hui</div>
              </div>
            </div>

            {isSuperAdmin && (
              <>
                <h3 className="section-title">Performance Globale</h3>
                <div className="stats-grid extra-grid financial-stats mb-6">
                  <div className="stat-card income">
                    <div className="stat-icon green">
                      <TrendingUp size={24} />
                    </div>
                    <div className="stat-value">{maskValue(dashboardStats.totalRevenue)} <span className="currency">TND</span></div>
                    <div className="stat-label">Revenus</div>
                  </div>

                  <div className="stat-card expenses">
                    <div className="stat-icon red">
                      <TrendingDown size={24} />
                    </div>
                    <div className="stat-value">{maskValue(dashboardStats.totalExpenses)} <span className="currency">TND</span></div>
                    <div className="stat-label">Dépenses</div>
                  </div>

                  <div className={`stat-card profit ${dashboardStats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                    <div className={`stat-icon ${dashboardStats.netProfit >= 0 ? 'green' : 'red'}`}>
                      <Wallet size={24} />
                    </div>
                    <div className="stat-value">{maskValue(dashboardStats.netProfit)} <span className="currency">TND</span></div>
                    <div className="stat-label">Bénéfice net</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <h3 className="section-title">
          Statistiques {day ? `du ${day}/${month}/${year}` : month ? `de ${monthNames[Number(month)-1]} ${year}` : `Annuelles (${year})`}
        </h3>
        {/* Stats Cards */}
        {stats && (
          <div className="rapport-stats">
            <div className="rapport-stat-card">
              <div className="stat-icon blue"><FileText size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{stats.totalDevis}</div>
                <div className="stat-label">Total Devis</div>
              </div>
            </div>
            <div className="rapport-stat-card">
              <div className="stat-icon green"><TrendingUp size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{formatCurrency(stats.totalDevisAmount)}</div>
                <div className="stat-label">Montant Devis</div>
              </div>
            </div>
            <div className="rapport-stat-card">
              <div className="stat-icon purple"><Receipt size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{stats.totalInvoices}</div>
                <div className="stat-label">Factures</div>
              </div>
            </div>
            <div className="rapport-stat-card">
              <div className="stat-icon emerald"><TrendingUp size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{formatCurrency(stats.totalPaidAmount)}</div>
                <div className="stat-label">Total Payé ({stats.paidDevisCount} devis)</div>
              </div>
            </div>
            <div className="rapport-stat-card">
              <div className="stat-icon orange"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{formatCurrency(stats.totalUnpaidAmount)}</div>
                <div className="stat-label">Impayé ({stats.unpaidDevisCount} devis)</div>
              </div>
            </div>
            <div className="rapport-stat-card">
              <div className="stat-icon red"><TrendingDown size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{formatCurrency(stats.totalExpenses)}</div>
                <div className="stat-label">Dépenses</div>
              </div>
            </div>
          </div>
        )}

        {/* Devis Table */}
        <div className="rapport-section">
          <div className="rapport-section-header collapsible" onClick={() => toggleSection('devis')}>
            <div className="header-title-group">
              <h3>Devis ({data?.devis?.length || 0})</h3>
              {collapsedSections.devis ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleExportDevis(); }}>
              <Download size={16} /> Excel
            </button>
          </div>
          {!collapsedSections.devis && (
            <>
              {data?.devis?.length > 0 ? (
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Statut</th>
                      <th>Montant</th>
                      <th>Payé</th>
                      <th>Reste</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.devis.map((d: any) => (
                      <tr key={d.id}>
                        <td className="font-medium">{d.reference}</td>
                        <td>{d.client?.name}</td>
                        <td>
                          <span className={`badge badge-${d.status.toLowerCase()}`}>
                            {STATUS_LABELS[d.status] || d.status}
                          </span>
                        </td>
                        <td className="font-medium">{Number(d.totalAmount).toFixed(3)} TND</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{Number(d.totalPaid || 0).toFixed(3)}</td>
                        <td style={{ color: d.remaining > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                          {Number(d.remaining || 0).toFixed(3)}
                        </td>
                        <td>
                          <span className="table-date">
                            <Clock size={14} />
                            {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={48} strokeWidth={1} />
              <h3>Aucun devis pour {year}</h3>
            </div>
          )}
        </>
      )}
    </div>

        {/* Invoices Table */}
        <div className="rapport-section">
          <div className="rapport-section-header collapsible" onClick={() => toggleSection('invoices')}>
            <div className="header-title-group">
              <h3>Factures ({data?.invoices?.length || 0})</h3>
              {collapsedSections.invoices ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleExportInvoices(); }}>
              <Download size={16} /> Excel
            </button>
          </div>
          {!collapsedSections.invoices && (
            <>
              {data?.invoices?.length > 0 ? (
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Devis associés</th>
                      <th>Montant</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="font-medium">{inv.reference}</td>
                        <td>{inv.client?.name}</td>
                        <td>{(inv.devis || []).map((d: any) => d.reference).join(', ') || '-'}</td>
                        <td className="font-medium">{Number(inv.totalAmount).toFixed(3)} TND</td>
                        <td>
                          <span className="table-date">
                            <Clock size={14} />
                            {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Receipt size={48} strokeWidth={1} />
              <h3>Aucune facture pour {year}</h3>
            </div>
          )}
        </>
      )}
    </div>

        {/* Expenses Table */}
        <div className="rapport-section">
          <div className="rapport-section-header collapsible" onClick={() => toggleSection('expenses')}>
            <div className="header-title-group">
              <h3>Dépenses ({data?.expenses?.length || 0})</h3>
              {collapsedSections.expenses ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleExportExpenses(); }}>
              <Download size={16} /> Excel
            </button>
          </div>
          {!collapsedSections.expenses && (
            <>
              {data?.expenses?.length > 0 ? (
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Catégorie</th>
                      <th>Montant</th>
                      <th>Créé par</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td className="font-medium">{e.description}</td>
                        <td>{e.category}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>-{Number(e.amount).toFixed(3)} TND</td>
                        <td>{e.createdBy?.firstName} {e.createdBy?.lastName}</td>
                        <td>
                          <span className="table-date">
                            <Clock size={14} />
                            {new Date(e.date).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Wallet size={48} strokeWidth={1} />
              <h3>Aucune dépense pour {year}</h3>
            </div>
          )}
        </>
      )}
    </div>

        {/* Productivity Section */}
        <div className="rapport-section">
          <div className="rapport-section-header collapsible" onClick={() => toggleSection('productivity')}>
            <div className="header-title-group">
              <h3>Suivi de Productivité</h3>
              {collapsedSections.productivity ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleExportProductivity(); }}>
                <Users size={16} /> Employés
              </button>
              <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleExportMachineProductivity(); }}>
                <Box size={16} /> Machines
              </button>
            </div>
          </div>
          {!collapsedSections.productivity && (
            <div className="productivity-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              {/* Employee Productivity */}
              <div className="card">
                <div className="card-header">
                  <h4>Productivité Employés</h4>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employé</th>
                        <th style={{ textAlign: 'center' }}>Devis</th>
                        <th style={{ textAlign: 'right' }}>Total (TND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.revenueByEmployee?.length > 0 ? (
                        data.revenueByEmployee.map((item: any) => (
                          <tr key={item.employeeId}>
                            <td>{item.employeeName}</td>
                            <td style={{ textAlign: 'center' }}>{item.paymentCount}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>{maskValue(item.totalAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="text-center">Aucune donnée</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Machine Productivity */}
              <div className="card">
                <div className="card-header">
                  <h4>Productivité Machines</h4>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th style={{ textAlign: 'center' }}>Ops</th>
                        <th style={{ textAlign: 'right' }}>Total (TND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.productivityByMachine?.length > 0 ? (
                        data.productivityByMachine.map((item: any) => (
                          <tr key={item.machine}>
                            <td><span className="badge">{item.machine}</span></td>
                            <td style={{ textAlign: 'center' }}>{item.count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>{maskValue(item.totalAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="text-center">Aucune donnée</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Net Summary */}
        {stats && (
          <div className="rapport-section">
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Résumé Net — {year}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22c55e' }}>
                    {formatCurrency(stats.totalInvoiceAmount)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Revenus Facturés</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>
                    {formatCurrency(stats.totalExpenses)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dépenses</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.netProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatCurrency(stats.netProfit)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bénéfice Net</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean Confirmation Modal */}
      {cleanModalOpen && (
        <div className="rapport-modal-overlay" onClick={() => !cleaning && setCleanModalOpen(false)}>
          <div className="rapport-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Nettoyer les données de {year}</h3>
            <p>
              Cette action va supprimer tous les devis <strong>entièrement payés</strong> (statut Facturé)
              et leurs factures associées pour l'année {year}.
            </p>
            <p>
              Les devis <strong>non payés</strong> ou <strong>partiellement payés</strong> seront conservés.
            </p>
            <p className="warning-text">
              ⚠️ Cette action est irréversible. Exportez les données en Excel avant de continuer.
            </p>
            <div className="rapport-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setCleanModalOpen(false)}
                disabled={cleaning}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleClean}
                disabled={cleaning}
              >
                {cleaning ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Confirmer le nettoyage
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
