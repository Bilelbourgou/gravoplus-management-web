import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, Trash2, Plus } from 'lucide-react';
import { paymentsApi } from '../services';
import './PaymentModal.css';

interface PaymentModalProps {
  invoiceId: string;
  invoiceReference: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

interface PaymentStats {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  percentPaid: number;
  isPaid: boolean;
}

export function PaymentModal({ invoiceId, invoiceReference, totalAmount, onClose, onSuccess }: PaymentModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsData, statsData] = await Promise.all([
        paymentsApi.getByInvoice(invoiceId),
        paymentsApi.getStats(invoiceId),
      ]);
      setPayments(paymentsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [invoiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await paymentsApi.create(invoiceId, {
        amount: Number(formData.amount),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod || undefined,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });

      setFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        reference: '',
        notes: '',
      });
      setShowAddForm(false);
      await fetchData();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur lors de l\'ajout du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) return;

    try {
      await paymentsApi.delete(paymentId);
      await fetchData();
      onSuccess();
    } catch (err) {
      setError('Erreur lors de la suppression du paiement');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Suivi des paiements - {invoiceReference}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Chargement...</p>
            </div>
          ) : (
            <>
              {stats && (
                <div className="payment-summary">
                  <div className="summary-card">
                    <div className="summary-label">Montant total</div>
                    <div className="summary-value">{stats.totalAmount.toFixed(2)} TND</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Déjà payé</div>
                    <div className="summary-value success">{stats.totalPaid.toFixed(2)} TND</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Reste à payer</div>
                    <div className="summary-value warning">{stats.remaining.toFixed(2)} TND</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Pourcentage</div>
                    <div className="summary-value">{stats.percentPaid.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${stats?.percentPaid || 0}%` }}
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <div className="payments-section">
                <div className="section-header">
                  <h3>Historique des paiements ({payments.length})</h3>
                  {!showAddForm && stats && stats.remaining > 0 && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus size={16} />
                      Ajouter un paiement
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <form onSubmit={handleSubmit} className="payment-form card">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Montant *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder={`Max: ${stats?.remaining.toFixed(2)} TND`}
                          max={stats?.remaining}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date de paiement</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.paymentDate}
                          onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Méthode de paiement</label>
                        <select
                          className="form-input"
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement</option>
                          <option value="Carte bancaire">Carte bancaire</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Référence</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                          placeholder="N° chèque, transaction..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        className="form-input"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        placeholder="Informations complémentaires..."
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowAddForm(false);
                          setError(null);
                        }}
                        disabled={submitting}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? <span className="spinner spinner-sm" /> : <DollarSign size={16} />}
                        Enregistrer
                      </button>
                    </div>
                  </form>
                )}

                {payments.length > 0 ? (
                  <div className="payments-list">
                    {payments.map((payment) => (
                      <div key={payment.id} className="payment-item card">
                        <div className="payment-info">
                          <div className="payment-amount">
                            {Number(payment.amount).toFixed(2)} TND
                          </div>
                          <div className="payment-details">
                            <div className="detail-row">
                              <Calendar size={14} />
                              {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                            </div>
                            {payment.paymentMethod && (
                              <div className="detail-row">
                                <CreditCard size={14} />
                                {payment.paymentMethod}
                              </div>
                            )}
                            {payment.reference && (
                              <div className="detail-row">
                                <FileText size={14} />
                                {payment.reference}
                              </div>
                            )}
                            {payment.notes && (
                              <div className="payment-notes">{payment.notes}</div>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => handleDelete(payment.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <p>Aucun paiement enregistré</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
