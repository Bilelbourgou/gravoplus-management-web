import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  AlertCircle,
  FileText,
  Lock
} from 'lucide-react';
import { Header } from '../components/layout';
import { financialService, type FinancialStats, type FinancialClosure } from '../services/financial.service';
import './FinancialPage.css';

const FinancialPage: React.FC = () => {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [history, setHistory] = useState<FinancialClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [openClosureDialog, setOpenClosureDialog] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closureLoading, setClosureLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData] = await Promise.all([
        financialService.getStats(),
        financialService.getHistory()
      ]);
      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données financières');
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
      await fetchData(); // Refresh data
    } catch (err) {
      console.error(err);
      setError('Échec de la clôture de la période');
    } finally {
      setClosureLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Chargement des données financières...</p>
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
          </div>
        )}

        {/* Current Stats Cards */}
        <div className="stats-grid financial-stats">
          <div className="stat-card income">
            <div className="stat-icon green">
              <TrendingUp size={24} />
            </div>
            <div className="stat-value">{Number(stats?.totalIncome || 0).toFixed(3)} <span className="currency">TND</span></div>
            <div className="stat-label">Recettes (Session)</div>
          </div>

          <div className="stat-card expenses">
            <div className="stat-icon red">
              <TrendingDown size={24} />
            </div>
            <div className="stat-value">{Number(stats?.totalExpense || 0).toFixed(3)} <span className="currency">TND</span></div>
            <div className="stat-label">Dépenses (Session)</div>
          </div>

          <div className={`stat-card profit ${stats && stats.balance >= 0 ? 'positive' : 'negative'}`}>
            <div className={`stat-icon ${stats && stats.balance >= 0 ? 'green' : 'red'}`}>
              <Wallet size={24} />
            </div>
            <div className="stat-value">{Number(stats?.balance || 0).toFixed(3)} <span className="currency">TND</span></div>
            <div className="stat-label">Solde Caisse</div>
          </div>
        </div>

        {/* Period Info & Actions */}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem' }}>
          <div>
            <h3>
              Session en cours: <span style={{ color: 'var(--color-primary-500)' }}>
                {stats?.scope === 'ADMIN_LEVEL' ? 'Caisse Admin (Superadmin View)' : 'Caisse Employés (Admin View)'}
              </span>
            </h3>
            <p className="subtitle">
              Ouverture: {stats?.periodStart ? formatDate(stats.periodStart) : 'Première Session'}
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setOpenClosureDialog(true)}
            disabled={stats?.balance === 0 && stats?.totalIncome === 0 && stats?.totalExpense === 0}
          >
            <Lock size={18} style={{ marginRight: '8px' }} />
            Clôturer la Caisse
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="card">
            <div className="custom-tabs">
                <button 
                    className={`tab-btn ${activeTab === 0 ? 'active' : ''}`} 
                    onClick={() => setActiveTab(0)}
                >
                    <TrendingUp size={16} style={{marginRight: 8}}/> Recettes / Paiements
                </button>
                <button 
                    className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} 
                    onClick={() => setActiveTab(1)}
                >
                    <TrendingDown size={16} style={{marginRight: 8}}/> Dépenses / Sorties
                </button>
                <button 
                    className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} 
                    onClick={() => setActiveTab(2)}
                >
                    <Clock size={16} style={{marginRight: 8}}/> Historique
                </button>
            </div>
          
          {/* Recettes Tab */}
          {activeTab === 0 && (
              <div className="tab-content table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Facture</th>
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
                          <td>{p.invoice?.client?.name || 'Client Inconnu'}</td>
                          <td>{p.invoice?.reference || '-'}</td>
                          <td>{p.reference || '-'}</td>
                          <td>{p.createdBy?.firstName || '-'} {p.createdBy?.lastName || ''}</td>
                          <td>
                            <span className="badge badge-info">{p.paymentMethod || 'Espèces'}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                            +{Number(p.amount).toFixed(3)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Aucune recette pour cette session</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          )}
          
          {/* Dépenses Tab */}
          {activeTab === 1 && (
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
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                            -{Number(e.amount).toFixed(3)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Aucune dépense pour cette session</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          )}
          
           {/* Historique Tab */}
          {activeTab === 2 && (
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
                      <td>
                        <span className="table-date">
                          <Clock size={14} />
                          {formatDate(item.closureDate)}
                        </span>
                      </td>
                      <td>
                        {new Date(item.periodStart).toLocaleDateString('fr-FR')} - {new Date(item.periodEnd).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>
                        {Number(item.totalIncome).toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                        {Number(item.totalExpense).toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {Number(item.balance || 0).toFixed(3)}
                      </td>
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="no-data">
                          <FileText size={48} strokeWidth={1} />
                          <p>Aucune clôture effectuée</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {openClosureDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Clôturer la Caisse</h2>
              <button className="close-btn" onClick={() => setOpenClosureDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Vous êtes sur le point de clôturer la session de caisse. 
                Vérifiez les totaux ci-dessous :
              </p>
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
                <textarea 
                  className="form-control"
                  rows={3}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Ex: Écart de caisse -0.500, Vérifié par..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOpenClosureDialog(false)} disabled={closureLoading}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleClosePeriod} disabled={closureLoading}>
                {closureLoading ? 'Clôture en cours...' : 'Confirmer la Clôture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancialPage;

