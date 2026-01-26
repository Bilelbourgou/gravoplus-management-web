import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  CreditCard,
  FileCheck,
  Receipt,
  Check,
  Ban,
} from 'lucide-react';
import { Header } from '../components/layout';
import { clientsApi, devisApi, invoicesApi, materialsApi, servicesApi } from '../services';
import type { Client, CreateClientFormData, ClientBalanceData, Devis, Material, FixedService, AddDevisLineFormData, MachineType, DevisStatus } from '../types';
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
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [creatingDevis, setCreatingDevis] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [devisNotes, setDevisNotes] = useState('');
  const [selectedDevisIds, setSelectedDevisIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [showManualInvoice, setShowManualInvoice] = useState(false);
  const [creatingManualInvoice, setCreatingManualInvoice] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

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
      // Fetch full devis details and open detail modal
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

  const handleCreateManualInvoice = async () => {
    const validItems = invoiceItems.filter(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert('Veuillez ajouter au moins un article valide avec un prix supérieur à 0');
      return;
    }
    setCreatingManualInvoice(true);
    try {
      await invoicesApi.createDirect(client.id, validItems);
      setShowManualInvoice(false);
      setInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      await fetchBalance();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création de la facture');
    } finally {
      setCreatingManualInvoice(false);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const updateInvoiceItem = (index: number, field: keyof typeof invoiceItems[0], value: string | number) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceItems(newItems);
  };

  const handleCreateInvoice = async () => {
    if (selectedDevisIds.size === 0) {
      alert('Veuillez sélectionner au moins un devis');
      return;
    }
    setCreatingInvoice(true);
    try {
      await invoicesApi.createFromDevis(Array.from(selectedDevisIds));
      setShowCreateInvoice(false);
      setSelectedDevisIds(new Set());
      await fetchBalance();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création de la facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const toggleDevisSelection = (devisId: string) => {
    const newSelected = new Set(selectedDevisIds);
    if (newSelected.has(devisId)) {
      newSelected.delete(devisId);
    } else {
      newSelected.add(devisId);
    }
    setSelectedDevisIds(newSelected);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Wallet size={24} style={{ marginRight: '8px' }} />
            Solde Client - {client.name}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
              <p>Chargement du solde...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : balanceData ? (
            <div>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Facturé</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                    {formatCurrency(balanceData.summary.totalInvoiced)}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Payé</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {formatCurrency(balanceData.summary.totalPaid)}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Solde Restant</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: balanceData.summary.outstandingBalance > 0 ? '#dc3545' : '#28a745' }}>
                    {formatCurrency(balanceData.summary.outstandingBalance)}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Devis en Attente</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                    {balanceData.summary.pendingDevisCount}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {formatCurrency(balanceData.summary.pendingDevisTotal)}
                  </div>
                </div>
              </div>

              {/* Invoices Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                  <FileCheck size={20} style={{ marginRight: '8px' }} />
                  Factures ({balanceData.invoices.length})
                </h3>
                {balanceData.invoices.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {balanceData.invoices.map((invoice) => (
                      <div key={invoice.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: 'var(--bg-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '16px' }}>{invoice.reference}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                              {formatDate(invoice.createdAt)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total: {formatCurrency(invoice.totalAmount)}</div>
                            <div style={{ fontSize: '14px', color: '#28a745' }}>Payé: {formatCurrency(invoice.paidAmount)}</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: invoice.balance > 0 ? '#dc3545' : '#28a745' }}>
                              Reste: {formatCurrency(invoice.balance)}
                            </div>
                          </div>
                        </div>
                        {invoice.payments.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
                              <CreditCard size={14} style={{ display: 'inline', marginRight: '4px' }} />
                              Paiements ({invoice.payments.length})
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {invoice.payments.map((payment) => (
                                <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                                  <div>
                                    <span style={{ fontWeight: '500' }}>{formatDate(payment.paymentDate)}</span>
                                    {payment.paymentMethod && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({payment.paymentMethod})</span>}
                                    {payment.reference && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>Réf: {payment.reference}</span>}
                                  </div>
                                  <span style={{ fontWeight: '600', color: '#28a745' }}>{formatCurrency(payment.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <FileCheck size={48} strokeWidth={1} />
                    <p>Aucune facture</p>
                  </div>
                )}
              </div>

              {/* Pending Devis Section */}
              {balanceData.pendingDevis.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                    <FileText size={20} style={{ marginRight: '8px' }} />
                    Devis en Attente ({balanceData.pendingDevis.length})
                  </h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {balanceData.pendingDevis.map((devis) => (
                      <div key={devis.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', background: 'var(--bg-surface)' }}>
                        <div>
                          <span style={{ fontWeight: '600' }}>{devis.reference}</span>
                          <span style={{ marginLeft: '12px', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: devis.status === 'VALIDATED' ? '#d4edda' : '#e2e3e5', color: devis.status === 'VALIDATED' ? '#155724' : '#383d41' }}>
                            {devis.status}
                          </span>
                          <span style={{ marginLeft: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>{formatDate(devis.createdAt)}</span>
                        </div>
                        <span style={{ fontWeight: '600', color: '#ffc107' }}>{formatCurrency(devis.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateDevis(true)}
              title="Créer un nouveau devis pour ce client"
            >
              <Plus size={18} style={{ marginRight: '4px' }} />
              Nouveau Devis
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowManualInvoice(true)}
              title="Créer une facture directe sans devis"
            >
              <Receipt size={18} style={{ marginRight: '4px' }} />
              Facture Directe
            </button>
            {balanceData && balanceData.pendingDevis.filter(d => d.status === 'VALIDATED').length > 0 && (
              <button
                className="btn btn-success"
                onClick={() => setShowCreateInvoice(true)}
                title="Créer une facture à partir des devis validés"
              >
                <Receipt size={18} style={{ marginRight: '4px' }} />
                Facture depuis Devis
              </button>
            )}
          </div>
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

      {/* Manual Invoice Modal */}
      {showManualInvoice && (
        <div className="modal-overlay" onClick={() => setShowManualInvoice(false)} style={{ zIndex: 1001 }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Facture Directe - {client.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowManualInvoice(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Créez une facture personnalisée avec vos propres articles.
              </p>
              <div style={{ display: 'grid', gap: '16px' }}>
                {invoiceItems.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description de l'article..."
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Quantité</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="1"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Prix Unitaire (TND)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeInvoiceItem(index)}
                        disabled={invoiceItems.length === 1}
                        title="Supprimer l'article"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-secondary"
                  onClick={addInvoiceItem}
                  style={{ justifySelf: 'start' }}
                >
                  <Plus size={18} style={{ marginRight: '4px' }} />
                  Ajouter un article
                </button>
              </div>
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: '600' }}>Total:</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-500)' }}>
                  {formatCurrency(
                    invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                  )}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowManualInvoice(false)} disabled={creatingManualInvoice}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleCreateManualInvoice} disabled={creatingManualInvoice}>
                {creatingManualInvoice ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : null}
                Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoice && balanceData && (
        <div className="modal-overlay" onClick={() => setShowCreateInvoice(false)} style={{ zIndex: 1001 }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Créer une Facture - {client.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateInvoice(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Sélectionnez les devis validés à inclure dans la facture.
              </p>
              {balanceData.pendingDevis.filter(d => d.status === 'VALIDATED').length > 0 ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {balanceData.pendingDevis.filter(d => d.status === 'VALIDATED').map((devis) => (
                    <div
                      key={devis.id}
                      onClick={() => toggleDevisSelection(devis.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        border: `2px solid ${selectedDevisIds.has(devis.id) ? 'var(--color-primary-500)' : 'var(--border-subtle)'}`,
                        borderRadius: '6px',
                        background: selectedDevisIds.has(devis.id) ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '2px solid var(--color-primary-500)',
                            background: selectedDevisIds.has(devis.id) ? 'var(--color-primary-500)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          {selectedDevisIds.has(devis.id) && <Check size={14} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{devis.reference}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(devis.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: '600', color: 'var(--color-primary-500)' }}>
                        {formatCurrency(devis.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <Receipt size={48} strokeWidth={1} />
                  <p>Aucun devis validé disponible</p>
                </div>
              )}
              {selectedDevisIds.size > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>Total sélectionné:</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-500)' }}>
                    {formatCurrency(
                      balanceData.pendingDevis
                        .filter(d => selectedDevisIds.has(d.id))
                        .reduce((sum, d) => sum + d.totalAmount, 0)
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateInvoice(false)} disabled={creatingInvoice}>
                Annuler
              </button>
              <button className="btn btn-success" onClick={handleCreateInvoice} disabled={creatingInvoice || selectedDevisIds.size === 0}>
                {creatingInvoice ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : null}
                Créer la facture ({selectedDevisIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

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
