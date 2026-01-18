import { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Download,
  Clock,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Header } from '../components/layout';
import { PaymentModal } from '../components/PaymentModal';
import { invoicesApi, paymentsApi } from '../services';
import './InvoicesPage.css';

interface InvoiceWithDevis {
  id: string;
  reference: string;
  totalAmount: number;
  pdfUrl?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
  };
  devis: {
    id: string;
    reference: string;
    totalAmount: number;
  }[];
  paymentStats?: {
    totalPaid: number;
    remaining: number;
    percentPaid: number;
    isPaid: boolean;
  };
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDevis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDevis | null>(null);

  const fetchInvoices = async () => {
    try {
      const invoicesList = await invoicesApi.getAll();
      const invoicesData: InvoiceWithDevis[] = await Promise.all(
        invoicesList.map(async (invoice) => {
          try {
            const stats = await paymentsApi.getStats(invoice.id);
            return {
              id: invoice.id,
              reference: invoice.reference,
              totalAmount: invoice.totalAmount,
              pdfUrl: invoice.pdfUrl,
              createdAt: invoice.createdAt,
              client: invoice.client!,
              devis: invoice.devis || [],
              paymentStats: stats,
            };
          } catch {
            return {
              id: invoice.id,
              reference: invoice.reference,
              totalAmount: invoice.totalAmount,
              pdfUrl: invoice.pdfUrl,
              createdAt: invoice.createdAt,
              client: invoice.client!,
              devis: invoice.devis || [],
            };
          }
        })
      );
      setInvoices(invoicesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const query = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.reference.toLowerCase().includes(query) ||
        inv.client.name.toLowerCase().includes(query) ||
        inv.devis.some(d => d.reference.toLowerCase().includes(query))
    );
  }, [invoices, searchQuery]);

  const handleDownloadPdf = async (invoiceId: string, reference: string) => {
    setDownloadingId(invoiceId);
    try {
      const blob = await invoicesApi.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.paymentStats?.totalPaid || 0), 0);
  }, [invoices]);

  const totalRemaining = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.paymentStats?.remaining || Number(inv.totalAmount)), 0);
  }, [invoices]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des factures...</p>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Factures"
        subtitle={`${invoices.length} facture${invoices.length > 1 ? 's' : ''} générée${invoices.length > 1 ? 's' : ''}`}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="invoices-stats">
          <div className="stat-card">
            <div className="stat-icon green">
              <Receipt size={24} />
            </div>
            <div className="stat-value">{invoices.length}</div>
            <div className="stat-label">Total factures</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <FileText size={24} />
            </div>
            <div className="stat-value">
              {totalRevenue.toFixed(2)} <span className="currency">TND</span>
            </div>
            <div className="stat-label">Chiffre d'affaires</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <DollarSign size={24} />
            </div>
            <div className="stat-value">
              {totalPaid.toFixed(2)} <span className="currency">TND</span>
            </div>
            <div className="stat-label">Total payé</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <DollarSign size={24} />
            </div>
            <div className="stat-value">
              {totalRemaining.toFixed(2)} <span className="currency">TND</span>
            </div>
            <div className="stat-label">Reste à payer</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="actions-bar">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Rechercher par référence ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchInvoices}>
              Réessayer
            </button>
          </div>
        )}

        {/* Invoices Table */}
        {filteredInvoices.length > 0 ? (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Devis</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Statut paiement</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <div className="invoice-ref">
                          <Receipt size={16} className="text-muted" />
                          <span className="font-medium">{invoice.reference}</span>
                        </div>
                      </td>
                      <td>
                        <div className="devis-references">
                          {invoice.devis.map((d, idx) => (
                            <span key={d.id} className="devis-ref-tag">
                              {d.reference}
                              {idx < invoice.devis.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{invoice.client.name}</td>
                      <td className="font-medium">
                        {Number(invoice.totalAmount).toFixed(2)} TND
                      </td>
                      <td>
                        {invoice.paymentStats ? (
                          <div className="payment-status">
                            <div className="payment-progress-mini">
                              <div 
                                className="payment-progress-bar" 
                                style={{ width: `${invoice.paymentStats.percentPaid}%` }}
                              />
                            </div>
                            <span className={`payment-badge ${invoice.paymentStats.isPaid ? 'paid' : 'partial'}`}>
                              {invoice.paymentStats.isPaid ? 'Payé' : `${invoice.paymentStats.percentPaid.toFixed(0)}%`}
                            </span>
                          </div>
                        ) : (
                          <span className="payment-badge unpaid">Non payé</span>
                        )}
                      </td>
                      <td>
                        <span className="table-date">
                          <Clock size={14} />
                          {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            title="Gérer les paiements"
                          >
                            <DollarSign size={16} />
                            Paiements
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownloadPdf(invoice.id, invoice.reference)}
                            disabled={downloadingId === invoice.id}
                          >
                            {downloadingId === invoice.id ? (
                              <span className="spinner spinner-sm" />
                            ) : (
                              <Download size={16} />
                            )}
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Receipt size={64} strokeWidth={1} />
            <h3>Aucune facture trouvée</h3>
            <p>
              {searchQuery
                ? 'Aucune facture ne correspond à votre recherche.'
                : 'Les factures apparaîtront ici une fois que vous aurez converti des devis.'}
            </p>
          </div>
        )}

        {selectedInvoice && (
          <PaymentModal
            invoiceId={selectedInvoice.id}
            invoiceReference={selectedInvoice.reference}
            totalAmount={Number(selectedInvoice.totalAmount)}
            onClose={() => setSelectedInvoice(null)}
            onSuccess={() => {
              fetchInvoices();
            }}
          />
        )}
      </div>
    </>
  );
}
