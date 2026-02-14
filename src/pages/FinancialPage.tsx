import React, { useEffect, useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Users,
  Receipt,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Search,
} from 'lucide-react';
import { Header } from '../components/layout';
import { useAuthStore } from '../store/auth.store';
import { invoicesApi } from '../services';
import { financialService, type FinancialStats, type FinancialClosure, type CaisseDevis, type CreateCaissePaymentData } from '../services/financial.service';
import './FinancialPage.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-warning',
  VALIDATED: 'badge-info',
  INVOICED: 'badge-success',
  CANCELLED: 'badge-danger',
};

const FinancialPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [caisseDevis, setCaisseDevis] = useState<CaisseDevis[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [history, setHistory] = useState<FinancialClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [openClosureDialog, setOpenClosureDialog] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closureLoading, setClosureLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedDevisId, setExpandedDevisId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Payment modal state
  const [paymentModalDevis, setPaymentModalDevis] = useState<CaisseDevis | null>(null);
  const [paymentForm, setPaymentForm] = useState<CreateCaissePaymentData>({ amount: 0, paymentMethod: 'Espèces' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [financialService.getCaisseDevis()];
      if (isAdmin) {
        promises.push(financialService.getStats());
        promises.push(financialService.getHistory());
      }
      const results = await Promise.all(promises);
      setCaisseDevis(results[0]);
      if (isAdmin) {
        setStats(results[1]);
        setHistory(results[2]);
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données de la caisse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClosePeriod = async () => {
    try {
      setClosureLoading(true);
      await financialService.createClosure(closureNotes);
      setOpenClosureDialog(false);
      setClosureNotes('');
      await fetchData();
    } catch (err) {
      console.error(err);
      setError('Échec de la clôture de la période');
    } finally {
      setClosureLoading(false);
    }
  };

  const handleInvoiceDevis = async (devisId: string) => {
    if (!confirm('Créer une facture pour ce devis ?')) return;
    try {
      await invoicesApi.createFromDevis([devisId]);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la facturation');
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentModalDevis || paymentForm.amount <= 0) return;
    try {
      setPaymentLoading(true);
      await financialService.createCaissePayment({
        ...paymentForm,
        devisId: paymentModalDevis.id,
        description: `Paiement pour devis ${paymentModalDevis.reference} - ${paymentModalDevis.client?.name || ''}`,
      });
      setPaymentModalDevis(null);
      setPaymentForm({ amount: 0, paymentMethod: 'Espèces' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredDevis = useMemo(() => {
    let list = caisseDevis;
    if (statusFilter) {
      list = list.filter(d => d.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.reference.toLowerCase().includes(q) ||
        d.client?.name?.toLowerCase().includes(q) ||
        `${d.createdBy?.firstName} ${d.createdBy?.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [caisseDevis, statusFilter, searchQuery]);

  const devisSummary = useMemo(() => {
    const total = caisseDevis.reduce((s, d) => s + Number(d.totalAmount), 0);
    const draft = caisseDevis.filter(d => d.status === 'DRAFT').length;
    const validated = caisseDevis.filter(d => d.status === 'VALIDATED').length;
    const invoiced = caisseDevis.filter(d => d.status === 'INVOICED').length;
    return { total, draft, validated, invoiced, count: caisseDevis.length };
  }, [caisseDevis]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Chargement de la caisse...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Caisse & Finances" subtitle="Gestion de la Trésorerie" />

      <div className="dashboard-content">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setError(null)} style={{ marginLeft: 'auto' }}>×</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid financial-stats">
          <div className="stat-card">
            <div className="stat-icon green">
              <TrendingUp size={24} />
            </div>
            <div className="stat-value">{devisSummary.total.toFixed(3)} <span className="currency">TND</span></div>
            <div className="stat-label">Montant Total</div>
          </div>
          {isAdmin && stats && (
            <>
              <div className="stat-card">
                <div className="stat-icon red">
                  <TrendingDown size={24} />
                </div>
                <div className="stat-value">{Number(stats.totalExpense || 0).toFixed(3)} <span className="currency">TND</span></div>
                <div className="stat-label">Dépenses (Session)</div>
              </div>
              <div className={`stat-card ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
                <div className={`stat-icon ${stats.balance >= 0 ? 'green' : 'red'}`}>
                  <Wallet size={24} />
                </div>
                <div className="stat-value">{Number(stats.balance || 0).toFixed(3)} <span className="currency">TND</span></div>
                <div className="stat-label">Solde Caisse</div>
              </div>
            </>
          )}
        </div>

        {/* Period Info & Actions (Admin only) */}
        {isAdmin && (
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem' }}>
            <div>
              <h3>
                Session: <span style={{ color: 'var(--color-primary-500)' }}>
                  {stats?.scope === 'ADMIN_LEVEL' ? 'Caisse Admin (Superadmin)' : 'Caisse Employés (Admin)'}
                </span>
              </h3>
              <p className="subtitle">
                Ouverture: {stats?.periodStart ? formatDate(stats.periodStart) : 'Première Session'}
              </p>
            </div>
            {isSuperAdmin && (
              <button 
                className="btn btn-primary"
                onClick={() => setOpenClosureDialog(true)}
                disabled={stats?.balance === 0 && stats?.totalIncome === 0 && stats?.totalExpense === 0}
              >
                <Lock size={18} style={{ marginRight: '8px' }} />
                Clôturer la Caisse
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="card">
          <div className="custom-tabs">
            <button className={`tab-btn ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
              <FileText size={16} style={{marginRight: 8}}/> Devis
            </button>
            {isAdmin && (
              <>
                <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
                  <TrendingUp size={16} style={{marginRight: 8}}/> Recettes
                </button>
                <button className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
                  <Users size={16} style={{marginRight: 8}}/> Par Employé
                </button>
                <button className={`tab-btn ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
                  <TrendingDown size={16} style={{marginRight: 8}}/> Dépenses
                </button>
                <button className={`tab-btn ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
                  <Clock size={16} style={{marginRight: 8}}/> Historique
                </button>
              </>
            )}
          </div>

          {/* ===== DEVIS TAB ===== */}
          {activeTab === 0 && (
            <div className="tab-content">
              {/* Filters */}
              <div className="caisse-filters">
                <div className="caisse-search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher par référence, client, employé..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="form-input" 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tous les statuts</option>
                  <option value="DRAFT">Brouillon</option>
                  <option value="VALIDATED">Validé</option>
                  <option value="INVOICED">Facturé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>

              {/* Status summary badges */}
              <div className="status-badge-row">
                <span className="badge badge-warning">{devisSummary.draft} Brouillon</span>
                <span className="badge badge-info">{devisSummary.validated} Validé</span>
                <span className="badge badge-success">{devisSummary.invoiced} Facturé</span>
              </div>

              {/* Devis list */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{width: 30}}></th>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Créé par</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Montant (TND)</th>
                      <th>Date</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevis.length > 0 ? filteredDevis.map((d) => {
                      const isExpanded = expandedDevisId === d.id;
                      const totalPaid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
                      return (
                        <React.Fragment key={d.id}>
                          <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedDevisId(isExpanded ? null : d.id)}>
                            <td>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                            <td><span className="font-medium">{d.reference}</span></td>
                            <td>{d.client?.name || '-'}</td>
                            <td>
                              <span>{d.createdBy?.firstName} {d.createdBy?.lastName}</span>
                              {d.createdBy?.role && (
                                <span className={`badge ${d.createdBy.role === 'ADMIN' ? 'badge-admin' : 'badge-employee'}`} style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                                  {d.createdBy.role}
                                </span>
                              )}
                            </td>
                            <td><span className={`badge ${STATUS_COLORS[d.status] || ''}`}>{STATUS_LABELS[d.status] || d.status}</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(d.totalAmount).toFixed(3)}</td>
                            <td><span className="table-date"><Clock size={14} />{formatDateShort(d.createdAt)}</span></td>
                            {isAdmin && (
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="action-buttons" style={{ display: 'flex', gap: 4 }}>
                                  {d.status === 'VALIDATED' && !d.invoice && totalPaid >= Number(d.totalAmount) && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleInvoiceDevis(d.id)} title="Facturer">
                                      <Receipt size={14} /> Facturer
                                    </button>
                                  )}
                                  <button className="btn btn-secondary btn-sm" onClick={() => { setPaymentModalDevis(d); setPaymentForm({ amount: 0, paymentMethod: 'Espèces', devisId: d.id }); }} title="Paiement">
                                    <DollarSign size={14} /> Paiement
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                          {/* Expanded details row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={isAdmin ? 8 : 7} style={{ padding: 0 }}>
                                <div className="devis-detail-panel">
                                  <div className="devis-detail-grid">
                                    {/* Lines */}
                                    <div className="devis-detail-section">
                                      <h4>Lignes du devis</h4>
                                      {d.lines && d.lines.length > 0 ? (
                                        <table className="detail-table">
                                          <thead><tr><th>Machine</th><th>Description</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
                                          <tbody>
                                            {d.lines.map(line => (
                                              <tr key={line.id}>
                                                <td><span className="badge badge-info">{line.machineType}</span></td>
                                                <td>{line.description || '-'}{line.material ? ` (${line.material.name})` : ''}</td>
                                                <td style={{textAlign:'right'}} className="font-semibold">{Number(line.lineTotal).toFixed(3)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : <p className="no-data-msg">Aucune ligne</p>}

                                      {d.services && d.services.length > 0 && (
                                        <>
                                          <h4 style={{ marginTop: 'var(--space-4)' }}>Services</h4>
                                          <table className="detail-table">
                                            <thead><tr><th>Service</th><th style={{textAlign:'right'}}>Prix</th></tr></thead>
                                            <tbody>
                                              {d.services.map(s => (
                                                <tr key={s.id}>
                                                  <td>{s.service?.name || '-'}</td>
                                                  <td style={{textAlign:'right'}} className="font-semibold">{Number(s.price).toFixed(3)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </>
                                      )}
                                    </div>

                                    {/* Payments & Info */}
                                    <div className="devis-detail-section">
                                      <h4>Infos Client</h4>
                                      <div className="client-info-card">
                                        <p className="client-name">{d.client?.name}</p>
                                        {d.client?.phone && <p>Tél: {d.client.phone}</p>}
                                        {d.client?.email && <p>Email: {d.client.email}</p>}
                                        {d.client?.address && <p>Adresse: {d.client.address}</p>}
                                      </div>

                                      {d.invoice && (
                                        <div className="invoice-info-card">
                                          <Receipt size={16} />
                                          <span>{d.invoice.reference} — {formatDateShort(d.invoice.createdAt)}</span>
                                        </div>
                                      )}

                                      <h4>Paiements ({(d.payments || []).length})</h4>
                                      {d.payments && d.payments.length > 0 ? (
                                        <>
                                          <table className="detail-table">
                                            <thead><tr><th>Date</th><th>Mode</th><th>Par</th><th style={{textAlign:'right'}}>Montant</th></tr></thead>
                                            <tbody>
                                              {d.payments.map(p => (
                                                <tr key={p.id}>
                                                  <td>{formatDateShort(p.paymentDate)}</td>
                                                  <td>{p.paymentMethod || 'Espèces'}</td>
                                                  <td>{p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '-'}</td>
                                                  <td style={{textAlign:'right'}} className="amount green font-semibold">+{Number(p.amount).toFixed(3)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          <div className="payment-total-row">
                                            <span>Total payé: <span className="paid-amount">{totalPaid.toFixed(3)} TND</span></span>
                                            <span className="total-amount">/ {Number(d.totalAmount).toFixed(3)} TND</span>
                                          </div>
                                        </>
                                      ) : <p className="no-data-msg">Aucun paiement enregistré</p>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="text-center" style={{ padding: 'var(--space-10)' }}>
                          <FileText size={48} strokeWidth={1} className="text-muted" style={{ margin: '0 auto var(--space-3)' }} />
                          <p className="text-muted">Aucun devis trouvé</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== RECETTES TAB (Admin) ===== */}
          {activeTab === 1 && isAdmin && (
            <div className="tab-content table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client / Description</th>
                    <th>Réf. Devis</th>
                    <th>Ref. Paiement</th>
                    <th>Effectué par</th>
                    <th>Mode</th>
                    <th style={{ textAlign: 'right' }}>Montant (TND)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.payments && stats.payments.length > 0 ? (
                    stats.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.paymentDate)}</td>
                        <td>{p.devis?.client?.name || p.invoice?.client?.name || p.description || '-'}</td>
                        <td>{p.devis?.reference || p.invoice?.reference || '-'}</td>
                        <td>{p.reference || '-'}</td>
                        <td>{p.createdBy?.firstName || '-'} {p.createdBy?.lastName || ''}</td>
                        <td><span className="badge badge-info">{p.paymentMethod || 'Espèces'}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>+{Number(p.amount).toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Aucune recette pour cette session</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== PAR EMPLOYÉ TAB (Admin) ===== */}
          {activeTab === 2 && isAdmin && (
            <div className="tab-content table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th style={{ textAlign: 'center' }}>Nombre de Paiements</th>
                    <th style={{ textAlign: 'right' }}>Montant Total (TND)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.revenueByEmployee && stats.revenueByEmployee.length > 0 ? (
                    stats.revenueByEmployee.map((item) => (
                      <tr key={item.employeeId}>
                        <td>{item.employeeName}</td>
                        <td style={{ textAlign: 'center' }}>{item.paymentCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>{Number(item.totalAmount).toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Aucune recette par employé</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== DÉPENSES TAB (Admin) ===== */}
          {activeTab === 3 && isAdmin && (
            <div className="tab-content table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Catégorie</th>
                    <th>Effectué par</th>
                    <th style={{ textAlign: 'right' }}>Montant (TND)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.expenses && stats.expenses.length > 0 ? (
                    stats.expenses.map((e) => (
                      <tr key={e.id}>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.description}</td>
                        <td><span className="badge badge-warning">{e.category}</span></td>
                        <td>{e.createdBy?.firstName || ''} {e.createdBy?.lastName || ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>-{Number(e.amount).toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Aucune dépense pour cette session</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== HISTORIQUE TAB (Admin) ===== */}
          {activeTab === 4 && isAdmin && (
            <div className="tab-content table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date de Clôture</th>
                    <th>Période</th>
                    <th style={{ textAlign: 'right' }}>Recettes</th>
                    <th style={{ textAlign: 'right' }}>Dépenses</th>
                    <th style={{ textAlign: 'right' }}>Solde</th>
                    <th>Niveau</th>
                    <th>Admin</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td><span className="table-date"><Clock size={14} />{formatDate(item.closureDate)}</span></td>
                      <td>{formatDateShort(item.periodStart)} - {formatDateShort(item.periodEnd)}</td>
                      <td style={{ textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{Number(item.totalIncome).toFixed(3)}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{Number(item.totalExpense).toFixed(3)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(item.balance || 0).toFixed(3)}</td>
                      <td>
                        <span className={`badge ${item.scope === 'ADMIN_LEVEL' ? 'badge-superadmin' : 'badge-employee'}`}>
                          {item.scope === 'ADMIN_LEVEL' ? 'Admin' : 'Employés'}
                        </span>
                      </td>
                      <td>{item.createdBy?.firstName} {item.createdBy?.lastName}</td>
                      <td>{item.notes || '-'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        <FileText size={48} strokeWidth={1} style={{ color: '#94a3b8' }} />
                        <p>Aucune clôture effectuée</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Closure Modal */}
      {openClosureDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Clôturer la Caisse</h2>
              <button className="close-btn" onClick={() => setOpenClosureDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Vous êtes sur le point de clôturer la session de caisse.</p>
              <div className="closure-summary">
                <div className="summary-row">
                  <span>Recettes Totales:</span>
                  <span className="amount green">{Number(stats?.totalIncome || 0).toFixed(3)} TND</span>
                </div>
                <div className="summary-row">
                  <span>Dépenses Totales:</span>
                  <span className="amount red">{Number(stats?.totalExpense || 0).toFixed(3)} TND</span>
                </div>
                <div className="summary-row total">
                  <span>Solde en Caisse:</span>
                  <span className="amount">{Number(stats?.balance || 0).toFixed(3)} TND</span>
                </div>
              </div>
              <div className="form-group">
                <label>Notes de Clôture</label>
                <textarea className="form-control" rows={3} value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} placeholder="Ex: Écart de caisse -0.500, Vérifié par..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOpenClosureDialog(false)} disabled={closureLoading}>Annuler</button>
              <button className="btn btn-primary" onClick={handleClosePeriod} disabled={closureLoading}>
                {closureLoading ? 'Clôture en cours...' : 'Confirmer la Clôture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalDevis && (() => {
        const modalTotalPaid = (paymentModalDevis.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const modalTotal = Number(paymentModalDevis.totalAmount);
        const modalRemaining = modalTotal - modalTotalPaid;
        const isFullyPaid = modalRemaining <= 0;
        const amountExceeds = paymentForm.amount > modalRemaining;

        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Enregistrer un Paiement</h2>
                <button className="close-btn" onClick={() => setPaymentModalDevis(null)}>×</button>
              </div>
              <div className="modal-body">
                {/* Summary */}
                <div className="closure-summary">
                  <div className="summary-row">
                    <span>Devis:</span>
                    <span className="font-semibold">{paymentModalDevis.reference}</span>
                  </div>
                  <div className="summary-row">
                    <span>Client:</span>
                    <span>{paymentModalDevis.client?.name || '-'}</span>
                  </div>
                  <div className="summary-row">
                    <span>Montant total:</span>
                    <span className="font-semibold">{modalTotal.toFixed(3)} TND</span>
                  </div>
                  <div className="summary-row">
                    <span>Déjà payé:</span>
                    <span className="amount green font-semibold">{modalTotalPaid.toFixed(3)} TND</span>
                  </div>
                  <div className="summary-row total">
                    <span>Reste à payer:</span>
                    <span className={modalRemaining > 0 ? 'amount red' : 'amount green'}>{modalRemaining.toFixed(3)} TND</span>
                  </div>
                </div>

                {/* Existing payments list */}
                {(paymentModalDevis.payments || []).length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Historique des paiements</h4>
                    <div className="devis-detail-section">
                      <table className="detail-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Mode</th>
                            <th>Par</th>
                            <th style={{ textAlign: 'right' }}>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentModalDevis.payments!.map(p => (
                            <tr key={p.id}>
                              <td>{formatDateShort(p.paymentDate)}</td>
                              <td>{p.paymentMethod || 'Espèces'}</td>
                              <td>{p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="amount green font-semibold">+{Number(p.amount).toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* New payment form */}
                {isFullyPaid ? (
                  <div className="closure-summary" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                    <p className="amount green font-semibold" style={{ fontSize: 'var(--text-base)' }}>Ce devis est entièrement payé</p>
                  </div>
                ) : (
                  <>
                    <div className="form-group mt-4">
                      <label>Montant * <span className="text-muted" style={{ fontWeight: 400 }}>(max: {modalRemaining.toFixed(3)} TND)</span></label>
                      <input
                        type="number"
                        className="form-control"
                        step="0.001"
                        min="0"
                        max={modalRemaining}
                        value={paymentForm.amount || ''}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.000"
                      />
                      {amountExceeds && (
                        <p className="form-error" style={{ marginTop: 'var(--space-1)' }}>Le montant dépasse le reste à payer ({modalRemaining.toFixed(3)} TND)</p>
                      )}
                    </div>

                    <div className="form-group mt-4">
                      <label>Mode de paiement</label>
                      <select className="form-control" value={paymentForm.paymentMethod || ''} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                        <option value="Espèces">Espèces</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Virement">Virement</option>
                        <option value="Carte">Carte</option>
                      </select>
                    </div>

                    <div className="form-group mt-4">
                      <label>Référence</label>
                      <input type="text" className="form-control" value={paymentForm.reference || ''} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="N° chèque, réf. virement..." />
                    </div>

                    <div className="form-group mt-4">
                      <label>Notes</label>
                      <textarea className="form-control" rows={2} value={paymentForm.notes || ''} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes..." />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setPaymentModalDevis(null)} disabled={paymentLoading}>Annuler</button>
                {!isFullyPaid && (
                  <button className="btn btn-primary" onClick={handleCreatePayment} disabled={paymentLoading || paymentForm.amount <= 0 || amountExceeds}>
                    {paymentLoading ? 'Enregistrement...' : 'Enregistrer le Paiement'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default FinancialPage;
