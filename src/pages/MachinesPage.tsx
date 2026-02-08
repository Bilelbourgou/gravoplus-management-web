import { useState, useEffect } from 'react';
import {
  Edit2,
  X,
  Cpu,
  Zap,
  Layers,
  LayoutGrid,
  Save,
  Wrench,
  Ruler,
} from 'lucide-react';
import { Header } from '../components/layout';
import { machinesApi } from '../services';
import type { MachinePricing, MachineType } from '../types';
import './MachinesPage.css';

const MACHINE_INFO: Record<MachineType, { icon: typeof Cpu; label: string; unit: string; description: string }> = {
  CNC: {
    icon: Cpu,
    label: 'CNC',
    unit: 'TND/minute',
    description: 'Gravure CNC - tarification à la minute',
  },
  LASER: {
    icon: Zap,
    label: 'Laser',
    unit: 'TND/minute',
    description: 'Gravure Laser - tarification à la minute + matériaux',
  },
  CHAMPS: {
    icon: Layers,
    label: 'Champs',
    unit: 'TND/mètre',
    description: 'Gravure Champs - tarification au mètre linéaire',
  },
  PANNEAUX: {
    icon: LayoutGrid,
    label: 'Panneaux',
    unit: 'TND/unité',
    description: 'Panneaux - tarification à l\'unité',
  },
  SERVICE_MAINTENANCE: {
    icon: Wrench,
    label: 'Service Maintenance',
    unit: 'TND/service',
    description: 'Maintenance et services divers - prix forfaitaire',
  },
  VENTE_MATERIAU: {
    icon: Ruler,
    label: 'Vente Matériau',
    unit: 'TND/m²',
    description: 'Vente de matériaux au m²',
  },
};

interface EditPricingModalProps {
  pricing: MachinePricing;
  onClose: () => void;
  onSave: (machineType: MachineType, price: number) => Promise<void>;
}

function EditPricingModal({ pricing, onClose, onSave }: EditPricingModalProps) {
  const [price, setPrice] = useState(pricing.pricePerUnit.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const machineInfo = MACHINE_INFO[pricing.machineType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Veuillez entrer un prix valide');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(pricing.machineType, numPrice);
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
          <h2 className="modal-title">Modifier le tarif - {machineInfo.label}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            
            <p className="text-muted mb-4">{machineInfo.description}</p>

            <div className="form-group">
              <label className="form-label">Prix par unité ({machineInfo.unit})</label>
              <div className="price-input-wrapper">
                <input
                  type="number"
                  className="form-input price-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  autoFocus
                />
                <span className="price-currency">TND</span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <Save size={18} />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MachinesPage() {
  const [pricings, setPricings] = useState<MachinePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPricing, setEditingPricing] = useState<MachinePricing | null>(null);

  const fetchPricings = async () => {
    try {
      const data = await machinesApi.getPricing();
      setPricings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricings();
  }, []);

  const handleUpdatePricing = async (machineType: MachineType, price: number) => {
    const updated = await machinesApi.updatePricing(machineType, price);
    setPricings(pricings.map((p) => (p.machineType === updated.machineType ? updated : p)));
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des machines...</p>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Machines" 
        subtitle="Configuration des tarifs par type de machine"
      />

      <div className="page-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchPricings}>
              Réessayer
            </button>
          </div>
        )}

        <div className="machines-pricing-grid">
          {Object.entries(MACHINE_INFO).map(([type, info]) => {
            const pricing = pricings.find((p) => p.machineType === type);
            const Icon = info.icon;

            return (
              <div key={type} className="machine-pricing-card">
                <div className="machine-pricing-header">
                  <div className={`machine-icon ${type.toLowerCase()}`}>
                    <Icon size={28} />
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => pricing && setEditingPricing(pricing)}
                    title="Modifier le tarif"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                <div className="machine-pricing-body">
                  <h3 className="machine-name">{info.label}</h3>
                  <p className="machine-description">{info.description}</p>
                  <div className="machine-price">
                    <span className="price-value">
                      {pricing ? Number(pricing.pricePerUnit).toFixed(2) : '0.00'}
                    </span>
                    <span className="price-unit">{info.unit}</span>
                  </div>
                </div>
                <div className="machine-pricing-footer">
                  <span className="last-updated">
                    Dernière mise à jour: {pricing 
                      ? new Date(pricing.updatedAt).toLocaleDateString('fr-FR')
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="card mt-6">
          <div className="card-header">
            <h3>Formules de calcul</h3>
          </div>
          <div className="card-body">
            <div className="formulas-grid">
              <div className="formula-item">
                <div className="formula-icon cnc"><Cpu size={20} /></div>
                <div className="formula-content">
                  <h4>CNC</h4>
                  <code>Total = minutes × prix/minute</code>
                </div>
              </div>
              <div className="formula-item">
                <div className="formula-icon laser"><Zap size={20} /></div>
                <div className="formula-content">
                  <h4>Laser</h4>
                  <code>Total = (minutes × prix/minute) + coût matériau</code>
                </div>
              </div>
              <div className="formula-item">
                <div className="formula-icon champs"><Layers size={20} /></div>
                <div className="formula-content">
                  <h4>Champs</h4>
                  <code>Total = mètres × prix/mètre</code>
                </div>
              </div>
              <div className="formula-item">
                <div className="formula-icon panneaux"><LayoutGrid size={20} /></div>
                <div className="formula-content">
                  <h4>Panneaux</h4>
                  <code>Total = quantité × prix/unité</code>
                </div>
              </div>
              <div className="formula-item">
                <div className="formula-icon maintenance"><Wrench size={20} /></div>
                <div className="formula-content">
                  <h4>Service Maintenance</h4>
                  <code>Total = quantité × prix/service</code>
                </div>
              </div>
              <div className="formula-item">
                <div className="formula-icon vente_materiau"><Ruler size={20} /></div>
                <div className="formula-content">
                  <h4>Vente Matériau</h4>
                  <code>Total = (Largeur × Hauteur) × prix matériau/m²</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPricing && (
        <EditPricingModal
          pricing={editingPricing}
          onClose={() => setEditingPricing(null)}
          onSave={handleUpdatePricing}
        />
      )}
    </>
  );
}
