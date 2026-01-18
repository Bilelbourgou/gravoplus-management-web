import { useState } from 'react';
import { X, Check, Receipt } from 'lucide-react';
import { invoicesApi } from '../services';
import type { Devis } from '../types';

interface CreateInvoiceModalProps {
  availableDevis: Devis[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvoiceModal({ availableDevis, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group devis by client
  const devisByClient = availableDevis.reduce((acc, devis) => {
    const clientId = devis.client.id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: devis.client,
        devis: [],
      };
    }
    acc[clientId].devis.push(devis);
    return acc;
  }, {} as Record<string, { client: Devis['client']; devis: Devis[] }>);

  const selectedDevis = availableDevis.filter(d => selectedIds.has(d.id));
  const totalAmount = selectedDevis.reduce((sum, d) => sum + Number(d.totalAmount), 0);

  const handleToggle = (devisId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(devisId)) {
      newSelected.delete(devisId);
    } else {
      newSelected.add(devisId);
    }
    setSelectedIds(newSelected);
    setError(null);
  };

  const handleSelectClient = (clientId: string) => {
    const clientDevis = devisByClient[clientId].devis;
    const clientDevisIds = clientDevis.map(d => d.id);
    const allSelected = clientDevisIds.every(id => selectedIds.has(id));

    const newSelected = new Set(selectedIds);
    if (allSelected) {
      clientDevisIds.forEach(id => newSelected.delete(id));
    } else {
      clientDevisIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
    setError(null);
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0) {
      setError('Veuillez sélectionner au moins un devis');
      return;
    }

    // Validate all selected devis belong to same client
    const clientIds = [...new Set(selectedDevis.map(d => d.clientId))];
    if (clientIds.length > 1) {
      setError('Tous les devis sélectionnés doivent appartenir au même client');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoicesApi.createFromDevis(Array.from(selectedIds));
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Créer une facture</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <p className="text-muted mb-4">
            Sélectionnez un ou plusieurs devis validés pour créer une facture. 
            Les devis doivent appartenir au même client.
          </p>

          {Object.entries(devisByClient).map(([clientId, { client, devis }]) => {
            const clientDevisIds = devis.map(d => d.id);
            const allSelected = clientDevisIds.every(id => selectedIds.has(id));
            const someSelected = clientDevisIds.some(id => selectedIds.has(id));

            return (
              <div key={clientId} className="client-devis-group">
                <div className="client-header">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => handleSelectClient(clientId)}
                      className="checkbox"
                    />
                    <div>
                      <h4 className="client-name">{client.name}</h4>
                      <p className="text-muted text-sm">
                        {devis.length} devis validé{devis.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="devis-list">
                  {devis.map((d) => (
                    <div
                      key={d.id}
                      className={`devis-item ${selectedIds.has(d.id) ? 'selected' : ''}`}
                      onClick={() => handleToggle(d.id)}
                    >
                      <div className="devis-checkbox">
                        {selectedIds.has(d.id) && <Check size={14} />}
                      </div>
                      <div className="devis-info">
                        <span className="devis-reference">{d.reference}</span>
                        <span className="devis-date text-muted">
                          {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="devis-amount">
                        {Number(d.totalAmount).toFixed(2)} TND
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {selectedIds.size > 0 && (
            <div className="invoice-summary">
              <div className="summary-row">
                <span>Devis sélectionnés:</span>
                <span className="font-medium">{selectedIds.size}</span>
              </div>
              <div className="summary-row total">
                <span>Montant total:</span>
                <span className="total-amount">{totalAmount.toFixed(2)} TND</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading || selectedIds.size === 0}
          >
            {loading ? <span className="spinner" /> : <Receipt size={18} />}
            Créer la facture
          </button>
        </div>
      </div>
    </div>
  );
}
