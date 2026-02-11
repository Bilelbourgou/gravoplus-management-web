import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  Wallet,
  Receipt,
  Check,
  Ban,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from '../components/layout';
import { clientsApi, devisApi, invoicesApi, materialsApi, servicesApi } from '../services';
import { financialService } from '../services/financial.service';
import type { Client, CreateClientFormData, ClientBalanceData, ClientBalanceDevis, Devis, Material, FixedService, AddDevisLineFormData, MachineType, DevisStatus } from '../types';
import './ClientsPage.css';
import '../pages/DevisPage.css';

const STATUS_LABELS: Record<DevisStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé',
};

const MACHINE_LABELS: Record<MachineType, string> = {
  CNC: 'CNC',
  LASER: 'Laser',
  CHAMPS: 'Champs',
  PANNEAUX: 'Panneaux',
  SERVICE_MAINTENANCE: 'Service Maintenance',
  VENTE_MATERIAU: 'Vente Matériau',
  CUSTOM: 'Personnalisé',
};

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: (data: CreateClientFormData) => Promise<void>;
}

function ClientModal({ client, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState<CreateClientFormData>({
    name: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    notes: client?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {client ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du client"
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+216 XX XXX XXX"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input
                type="text"
                className="form-input"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes supplémentaires..."
                rows={3}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {client ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  client: Client;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

interface ClientBalanceModalProps {
  client: Client;
  onClose: () => void;
}

function ClientBalanceModal({ client, onClose }: ClientBalanceModalProps) {
  const [balanceData, setBalanceData] = useState<ClientBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDevis, setShowCreateDevis] = useState(false);
  const [creatingDevis, setCreatingDevis] = useState(false);
  const [devisNotes, setDevisNotes] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [expandedDevisId, setExpandedDevisId] = useState<string | null>(null);
  const [paymentDevis, setPaymentDevis] = useState<ClientBalanceDevis | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paymentMethod: 'Espèces', reference: '', notes: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const data = await clientsApi.getBalance(client.id);
      setBalanceData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchMaterialsAndServices();
  }, [client.id]);

  const fetchMaterialsAndServices = async () => {
    try {
      const [materialsData, servicesData] = await Promise.all([
        materialsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setMaterials(materialsData);
      setServices(servicesData);
    } catch (err) {
      console.error('Error fetching materials/services:', err);
    }
  };

  const handleCreateDevis = async () => {
    setCreatingDevis(true);
    try {
      const newDevis = await devisApi.create({ clientId: client.id, notes: devisNotes || undefined });
      setShowCreateDevis(false);
      setDevisNotes('');
      const fullDevis = await devisApi.getById(newDevis.id);
      setEditingDevis(fullDevis);
      await fetchBalance();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création du devis');
    } finally {
      setCreatingDevis(false);
    }
  };

  const handleRefreshDevis = async () => {
    if (!editingDevis) return;
    try {
      const updated = await devisApi.getById(editingDevis.id);
      setEditingDevis(updated);
      await fetchBalance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLine = async (devisId: string, data: AddDevisLineFormData) => {
    await devisApi.addLine(devisId, data);
  };

  const handleRemoveLine = async (devisId: string, lineId: string) => {
    await devisApi.removeLine(devisId, lineId);
  };

  const handleAddService = async (devisId: string, serviceId: string) => {
    await devisApi.addService(devisId, serviceId);
  };

  const handleRemoveService = async (devisId: string, serviceId: string) => {
    await devisApi.removeService(devisId, serviceId);
  };

  const handleValidateDevis = async (devisId: string) => {
    await devisApi.validate(devisId);
  };

  const handleCancelDevis = async (devisId: string) => {
    await devisApi.cancel(devisId);
  };

  const handleInvoiceDevis = async (devisId: string) => {
    try {
      await invoicesApi.createFromDevis([devisId]);
      await fetchBalance();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la facturation');
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentDevis || paymentForm.amount <= 0) return;
    setPaymentLoading(true);
    try {
      await financialService.createCaissePayment({
        amount: paymentForm.amount,
        devisId: paymentDevis.id,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentDevis(null);
      setPaymentForm({ amount: 0, paymentMethod: 'Espèces', reference: '', notes: '' });
      await fetchBalance();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(3)} TND`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge badge-draft';
      case 'VALIDATED': return 'badge badge-validated';
      case 'INVOICED': return 'badge badge-invoiced';
      case 'CANCELLED': return 'badge badge-cancelled';
      default: return 'badge';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Wallet size={24} style={{ marginRight: '8px' }} />
            Solde Client — {client.name}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
              <p>Chargement du solde...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error" style={{ margin: 'var(--space-4)' }}>{error}</div>
          ) : balanceData ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
                <div className="stat-card">
                  <div className="stat-label">Total Devis</div>
                  <div className="stat-value" style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-primary-400)' }}>
                    {formatCurrency(balanceData.summary.totalDevisAmount)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{balanceData.summary.devisCount} devis</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Payé</div>
                  <div className="stat-value" style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-primary-400)' }}>
                    {formatCurrency(balanceData.summary.totalPaid)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{balanceData.summary.fullyPaidCount} payé(s)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Reste à Payer</div>
                  <div className="stat-value" style={{ fontSize: 'var(--text-2xl)', color: balanceData.summary.outstandingBalance > 0 ? 'var(--color-error-500)' : 'var(--color-primary-400)' }}>
                    {formatCurrency(balanceData.summary.outstandingBalance)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{balanceData.summary.pendingPaymentCount} en attente</div>
                </div>
              </div>

              {/* Devis List */}
              <div style={{ padding: '0 var(--space-6) var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FileText size={18} />
                  Devis ({balanceData.devis.length})
                </h3>
              </div>

              {balanceData.devis.length > 0 ? (
                <div className="table-container" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-subtle)' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}></th>
                        <th>Référence</th>
                        <th>Statut</th>
                        <th style={{ textAlign: 'right' }}>Montant</th>
                        <th style={{ textAlign: 'right' }}>Payé</th>
                        <th style={{ textAlign: 'right' }}>Reste</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceData.devis.map((d) => {
                        const isExpanded = expandedDevisId === d.id;
                        return (
                          <React.Fragment key={d.id}>
                            <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedDevisId(isExpanded ? null : d.id)}>
                              <td>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                              <td className="font-semibold">{d.reference}</td>
                              <td><span className={statusBadgeClass(d.status)}>{STATUS_LABELS[d.status as DevisStatus] || d.status}</span></td>
                              <td style={{ textAlign: 'right' }} className="font-semibold">{formatCurrency(d.totalAmount)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--color-primary-400)' }} className="font-semibold">{formatCurrency(d.paidAmount)}</td>
                              <td style={{ textAlign: 'right', color: d.remaining > 0 ? 'var(--color-error-500)' : 'var(--color-primary-400)', fontWeight: 600 }}>{formatCurrency(d.remaining)}</td>
                              <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {d.status === 'VALIDATED' && !d.isFullyPaid && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setPaymentDevis(d); setPaymentForm({ amount: 0, paymentMethod: 'Espèces', reference: '', notes: '' }); }} title="Paiement">
                                      <DollarSign size={14} />
                                    </button>
                                  )}
                                  {d.status === 'VALIDATED' && d.isFullyPaid && !d.invoice && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleInvoiceDevis(d.id)} title="Facturer">
                                      <Receipt size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ padding: 0 }}>
                                  <div className="devis-detail-panel">
                                    <div className="devis-detail-grid">
                                      {/* Lines & Services */}
                                      <div className="devis-detail-section">
                                        <h4>Lignes du devis</h4>
                                        {d.lines.length > 0 ? (
                                          <table className="detail-table">
                                            <thead><tr><th>Machine</th><th>Description</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                                            <tbody>
                                              {d.lines.map(l => (
                                                <tr key={l.id}>
                                                  <td><span className="badge badge-info">{l.machineType}</span></td>
                                                  <td>{l.description || '-'}{l.material ? ` (${l.material.name})` : ''}</td>
                                                  <td style={{ textAlign: 'right' }} className="font-semibold">{l.lineTotal.toFixed(3)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : <p className="no-data-msg">Aucune ligne</p>}

                                        {d.services.length > 0 && (
                                          <>
                                            <h4 style={{ marginTop: 'var(--space-4)' }}>Services</h4>
                                            <table className="detail-table">
                                              <thead><tr><th>Service</th><th style={{ textAlign: 'right' }}>Prix</th></tr></thead>
                                              <tbody>
                                                {d.services.map(s => (
                                                  <tr key={s.id}>
                                                    <td>{s.service?.name || '-'}</td>
                                                    <td style={{ textAlign: 'right' }} className="font-semibold">{s.price.toFixed(3)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </>
                                        )}
                                      </div>

                                      {/* Payments */}
                                      <div className="devis-detail-section">
                                        {d.invoice && (
                                          <div className="invoice-info-card">
                                            <Receipt size={16} />
                                            <span>{d.invoice.reference} — {formatDate(d.invoice.createdAt)}</span>
                                          </div>
                                        )}

                                        <h4>Paiements ({d.payments.length})</h4>
                                        {d.payments.length > 0 ? (
                                          <>
                                            <table className="detail-table">
                                              <thead><tr><th>Date</th><th>Mode</th><th>Par</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
                                              <tbody>
                                                {d.payments.map(p => (
                                                  <tr key={p.id}>
                                                    <td>{formatDate(p.paymentDate)}</td>
                                                    <td>{p.paymentMethod || 'Espèces'}</td>
                                                    <td>{p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '-'}</td>
                                                    <td style={{ textAlign: 'right' }} className="amount green font-semibold">+{p.amount.toFixed(3)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                            <div className="payment-total-row">
                                              <span>Total payé: <span className="paid-amount">{d.paidAmount.toFixed(3)} TND</span></span>
                                              <span className="total-amount">/ {d.totalAmount.toFixed(3)} TND</span>
                                            </div>
                                          </>
                                        ) : <p className="no-data-msg">Aucun paiement enregistré</p>}

                                        {d.status === 'VALIDATED' && !d.isFullyPaid && (
                                          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => { setPaymentDevis(d); setPaymentForm({ amount: 0, paymentMethod: 'Espèces', reference: '', notes: '' }); }}>
                                            <DollarSign size={14} /> Ajouter un paiement
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
                  <FileText size={48} strokeWidth={1} />
                  <p>Aucun devis pour ce client</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateDevis(true)}
            title="Créer un nouveau devis pour ce client"
          >
            <Plus size={18} /> Nouveau Devis
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>

      {/* Create Devis Modal */}
      {showCreateDevis && (
        <div className="modal-overlay" onClick={() => setShowCreateDevis(false)} style={{ zIndex: 1001 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Nouveau Devis - {client.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateDevis(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={devisNotes}
                  onChange={(e) => setDevisNotes(e.target.value)}
                  placeholder="Notes supplémentaires..."
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateDevis(false)} disabled={creatingDevis}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleCreateDevis} disabled={creatingDevis}>
                {creatingDevis ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : null}
                Créer le devis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentDevis && (() => {
        const remaining = paymentDevis.remaining;
        const amountExceeds = paymentForm.amount > remaining;

        return (
          <div className="modal-overlay" onClick={() => setPaymentDevis(null)} style={{ zIndex: 1001 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Paiement — {paymentDevis.reference}</h2>
                <button className="close-btn" onClick={() => setPaymentDevis(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="closure-summary">
                  <div className="summary-row">
                    <span>Montant total:</span>
                    <span className="font-semibold">{paymentDevis.totalAmount.toFixed(3)} TND</span>
                  </div>
                  <div className="summary-row">
                    <span>Déjà payé:</span>
                    <span className="amount green font-semibold">{paymentDevis.paidAmount.toFixed(3)} TND</span>
                  </div>
                  <div className="summary-row total">
                    <span>Reste à payer:</span>
                    <span className="amount red">{remaining.toFixed(3)} TND</span>
                  </div>
                </div>

                {paymentDevis.payments.length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Historique des paiements</h4>
                    <div className="devis-detail-section">
                      <table className="detail-table">
                        <thead><tr><th>Date</th><th>Mode</th><th>Par</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
                        <tbody>
                          {paymentDevis.payments.map(p => (
                            <tr key={p.id}>
                              <td>{formatDate(p.paymentDate)}</td>
                              <td>{p.paymentMethod || 'Espèces'}</td>
                              <td>{p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="amount green font-semibold">+{p.amount.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="form-group mt-4">
                  <label>Montant * <span className="text-muted" style={{ fontWeight: 400 }}>(max: {remaining.toFixed(3)} TND)</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.001"
                    min="0"
                    max={remaining}
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.000"
                  />
                  {amountExceeds && (
                    <p className="form-error" style={{ marginTop: 'var(--space-1)' }}>Le montant dépasse le reste à payer ({remaining.toFixed(3)} TND)</p>
                  )}
                </div>

                <div className="form-group mt-4">
                  <label>Mode de paiement</label>
                  <select className="form-control" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                    <option value="Carte">Carte</option>
                  </select>
                </div>

                <div className="form-group mt-4">
                  <label>Référence</label>
                  <input type="text" className="form-control" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="N° chèque, réf. virement..." />
                </div>

                <div className="form-group mt-4">
                  <label>Notes</label>
                  <textarea className="form-control" rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes..." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setPaymentDevis(null)} disabled={paymentLoading}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreatePayment} disabled={paymentLoading || paymentForm.amount <= 0 || amountExceeds}>
                  {paymentLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Devis Detail Modal */}
      {editingDevis && (
        <DevisDetailModal
          devis={editingDevis}
          materials={materials}
          services={services}
          onClose={() => setEditingDevis(null)}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onAddService={handleAddService}
          onRemoveService={handleRemoveService}
          onValidate={handleValidateDevis}
          onCancel={handleCancelDevis}
          onRefresh={handleRefreshDevis}
        />
      )}
    </div>
  );
}

interface DevisDetailModalProps {
  devis: Devis;
  materials: Material[];
  services: FixedService[];
  onClose: () => void;
  onAddLine: (devisId: string, data: AddDevisLineFormData) => Promise<void>;
  onRemoveLine: (devisId: string, lineId: string) => Promise<void>;
  onAddService: (devisId: string, serviceId: string) => Promise<void>;
  onRemoveService: (devisId: string, serviceId: string) => Promise<void>;
  onValidate: (devisId: string) => Promise<void>;
  onCancel: (devisId: string) => Promise<void>;
  onRefresh: () => void;
}

function DevisDetailModal({
  devis,
  materials,
  services,
  onClose,
  onAddLine,
  onRemoveLine,
  onAddService,
  onRemoveService,
  onValidate,
  onCancel,
  onRefresh,
}: DevisDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'services'>('lines');
  const [showAddLine, setShowAddLine] = useState(false);
  const [loading, setLoading] = useState(false);

  const [lineForm, setLineForm] = useState<AddDevisLineFormData>({
    machineType: 'CNC',
    description: '',
    minutes: undefined,
    meters: undefined,
    quantity: undefined,
    materialId: undefined,
  });

  const handleAddLine = async () => {
    setLoading(true);
    try {
      await onAddLine(devis.id, lineForm);
      setShowAddLine(false);
      setLineForm({
        machineType: 'CNC',
        description: '',
        minutes: undefined,
        meters: undefined,
        quantity: undefined,
        materialId: undefined,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    try {
      await onRemoveLine(devis.id, lineId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleService = async (serviceId: string, isAdded: boolean) => {
    try {
      if (isAdded) {
        await onRemoveService(devis.id, serviceId);
      } else {
        await onAddService(devis.id, serviceId);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      await onValidate(devis.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(devis.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addedServiceIds = (devis.services || []).map((s) => s.serviceId);
  const isEditable = devis.status === 'DRAFT';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1002 }}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{devis.reference}</h2>
            <p className="text-muted">{devis.client.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge badge-${devis.status.toLowerCase()}`}>
              {STATUS_LABELS[devis.status]}
            </span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'lines' ? 'active' : ''}`}
              onClick={() => setActiveTab('lines')}
            >
              Lignes ({(devis.lines || []).length})
            </button>
            <button
              className={`tab ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              Services ({(devis.services || []).length})
            </button>
          </div>

          {/* Lines Tab */}
          {activeTab === 'lines' && (
            <div className="tab-content">
              {(devis.lines || []).length > 0 ? (
                <div className="devis-lines-list">
                  {(devis.lines || []).map((line) => (
                    <div key={line.id} className="devis-line-item">
                      <div className="devis-line-info">
                        <span className={`machine-badge ${line.machineType.toLowerCase()}`}>
                          {MACHINE_LABELS[line.machineType]}
                        </span>
                        <span className="line-description">
                          {line.description || 'Sans description'}
                        </span>
                      </div>
                      <div className="devis-line-details">
                        {line.minutes && <span>{Number(line.minutes)} min</span>}
                        {line.meters && <span>{Number(line.meters)} m</span>}
                        {line.quantity && <span>{line.quantity} unit\u00e9s</span>}
                      </div>
                      <div className="devis-line-total">
                        {Number(line.lineTotal).toFixed(2)} TND
                      </div>
                      {isEditable && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleRemoveLine(line.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-tab">
                  <p>Aucune ligne ajout\u00e9e</p>
                </div>
              )}

              {isEditable && !showAddLine && (
                <button
                  className="btn btn-secondary w-full mt-4"
                  onClick={() => setShowAddLine(true)}
                >
                  <Plus size={18} />
                  Ajouter une ligne
                </button>
              )}

              {showAddLine && (
                <div className="add-line-form">
                  <h4>Nouvelle ligne</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Machine</label>
                      <select
                        className="form-select"
                        value={lineForm.machineType}
                        onChange={(e) =>
                          setLineForm({ ...lineForm, machineType: e.target.value as MachineType })
                        }
                      >
                        {Object.entries(MACHINE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="form-input"
                        value={lineForm.description || ''}
                        onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                        placeholder="Description..."
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    {(lineForm.machineType === 'CNC' || lineForm.machineType === 'LASER') && (
                      <div className="form-group">
                        <label className="form-label">Minutes</label>
                        <input
                          type="number"
                          className="form-input"
                          value={lineForm.minutes || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, minutes: parseFloat(e.target.value) || undefined })
                          }
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    )}
                    {lineForm.machineType === 'CHAMPS' && (
                      <div className="form-group">
                        <label className="form-label">M\u00e8tres</label>
                        <input
                          type="number"
                          className="form-input"
                          value={lineForm.meters || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, meters: parseFloat(e.target.value) || undefined })
                          }
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    )}
                    {lineForm.machineType === 'PANNEAUX' && (
                      <div className="form-group">
                        <label className="form-label">Quantit\u00e9</label>
                        <input
                          type="number"
                          className="form-input"
                          value={lineForm.quantity || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, quantity: parseInt(e.target.value) || undefined })
                          }
                          placeholder="0"
                          min="1"
                        />
                      </div>
                    )}
                    {lineForm.machineType === 'SERVICE_MAINTENANCE' && (
                      <div className="form-group">
                        <label className="form-label">Prix (TND)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={lineForm.unitPrice || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, unitPrice: parseFloat(e.target.value) || undefined })
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                    {lineForm.machineType === 'LASER' && (
                      <div className="form-group">
                        <label className="form-label">Mat\u00e9riau</label>
                        <select
                          className="form-select"
                          value={lineForm.materialId || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, materialId: e.target.value || undefined })
                          }
                        >
                          <option value="">Aucun</option>
                          {materials.filter((m) => m.isActive).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} - {Number(m.pricePerUnit).toFixed(2)} TND/{m.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowAddLine(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleAddLine}
                      disabled={loading}
                    >
                      {loading ? <span className="spinner" /> : null}
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="tab-content">
              <div className="services-list">
                {services.filter((s) => s.isActive).map((service) => {
                  const isAdded = addedServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className={`service-item ${isAdded ? 'selected' : ''}`}
                      onClick={() => isEditable && handleToggleService(service.id, isAdded)}
                    >
                      <div className="service-info">
                        <span className="service-name">{service.name}</span>
                        {service.description && (
                          <span className="service-description">{service.description}</span>
                        )}
                      </div>
                      <div className="service-price">
                        {Number(service.price).toFixed(2)} TND
                      </div>
                      {isEditable && (
                        <div className={`service-check ${isAdded ? 'checked' : ''}`}>
                          {isAdded && <Check size={14} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="devis-total">
            <span>Total</span>
            <span className="total-amount">{Number(devis.totalAmount).toFixed(2)} TND</span>
          </div>
        </div>

        <div className="modal-footer">
          {devis.status === 'DRAFT' && (
            <>
              <button className="btn btn-danger" onClick={handleCancel} disabled={loading}>
                <Ban size={18} />
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
                <Check size={18} />
                Valider
              </button>
            </>
          )}
          {devis.status === 'VALIDATED' && (
            <div className="text-muted">
              Ce devis est valid\u00e9 et ne peut plus \u00eatre modifi\u00e9
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ client, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmer la suppression</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            Êtes-vous sûr de vouloir supprimer le client <strong>{client.name}</strong> ?
          </p>
          <p className="text-muted mt-2">Cette action est irréversible.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [viewingBalance, setViewingBalance] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      const data = await clientsApi.getAll();
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.includes(query) ||
        client.address?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleCreate = async (data: CreateClientFormData) => {
    const newClient = await clientsApi.create(data);
    setClients([newClient, ...clients]);
  };

  const handleUpdate = async (data: CreateClientFormData) => {
    if (!editingClient) return;
    const updated = await clientsApi.update(editingClient.id, data);
    setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    await clientsApi.delete(deletingClient.id);
    setClients(clients.filter((c) => c.id !== deletingClient.id));
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des clients...</p>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Clients" 
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''} enregistré${clients.length > 1 ? 's' : ''}`}
      />

      <div className="page-content">
        {/* Actions Bar */}
        <div className="actions-bar">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={20} />
            Nouveau client
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchClients}>
              Réessayer
            </button>
          </div>
        )}

        {/* Clients Grid */}
        {filteredClients.length > 0 ? (
          <div className="clients-grid">
            {filteredClients.map((client) => (
              <div key={client.id} className="client-card">
                <div className="client-card-header">
                  <div className="client-avatar">
                    <Users size={24} />
                  </div>
                  <div className="client-info">
                    <h3 className="client-name">{client.name}</h3>
                    <span className="client-date">
                      Créé le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="client-actions">
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setViewingBalance(client)}
                      title="Voir le solde"
                    >
                      <Wallet size={18} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => openEditModal(client)}
                      title="Modifier"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setDeletingClient(client)}
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="client-card-body">
                  {client.phone && (
                    <div className="client-detail">
                      <Phone size={16} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="client-detail">
                      <Mail size={16} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="client-detail">
                      <MapPin size={16} />
                      <span>{client.address}</span>
                    </div>
                  )}
                  {client.notes && (
                    <div className="client-detail client-notes">
                      <FileText size={16} />
                      <span>{client.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users size={64} strokeWidth={1} />
            <h3>Aucun client trouvé</h3>
            <p>
              {searchQuery
                ? 'Aucun client ne correspond à votre recherche.'
                : 'Commencez par ajouter votre premier client.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary mt-4" onClick={openCreateModal}>
                <Plus size={20} />
                Ajouter un client
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={closeModal}
          onSave={editingClient ? handleUpdate : handleCreate}
        />
      )}

      {deletingClient && (
        <DeleteConfirmModal
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onConfirm={handleDelete}
        />
      )}

      {viewingBalance && (
        <ClientBalanceModal
          client={viewingBalance}
          onClose={() => setViewingBalance(null)}
        />
      )}
    </>
  );
}
