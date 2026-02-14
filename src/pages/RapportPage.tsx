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
} from 'lucide-react';
import { Header } from '../components/layout';
import { rapportApi } from '../services';
import { exportToExcel } from '../utils/exportExcel';
import './RapportPage.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

export function RapportPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await rapportApi.getYearly(year);
      setData(result);
    } catch (err) {
      console.error('Error fetching rapport:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

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
      `rapport_depenses_${year}`
    );
  };

  const handleExportAll = () => {
    handleExportDevis();
    handleExportInvoices();
    handleExportExpenses();
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
          <div className="year-selector">
            <label>Année :</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
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
          <div className="rapport-section-header">
            <h3>Devis ({data?.devis?.length || 0})</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleExportDevis}>
              <Download size={16} /> Excel
            </button>
          </div>
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
        </div>

        {/* Invoices Table */}
        <div className="rapport-section">
          <div className="rapport-section-header">
            <h3>Factures ({data?.invoices?.length || 0})</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleExportInvoices}>
              <Download size={16} /> Excel
            </button>
          </div>
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
        </div>

        {/* Expenses Table */}
        <div className="rapport-section">
          <div className="rapport-section-header">
            <h3>Dépenses ({data?.expenses?.length || 0})</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleExportExpenses}>
              <Download size={16} /> Excel
            </button>
          </div>
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
