import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Check,
  X,
  Ban,
  Receipt,
  Clock,
  Filter,
  ChevronDown,
  Trash2,
  Download,
} from 'lucide-react';
import { Header } from '../components/layout';
import { CreateInvoiceModal } from '../components/CreateInvoiceModal';
import { DateRangeFilter } from '../components/common/DateRangeFilter';
import { devisApi, clientsApi, servicesApi, materialsApi, invoicesApi } from '../services';
import type { Devis, Client, DevisStatus, MachineType, FixedService, Material, AddDevisLineFormData } from '../types';
import './DevisPage.css';
import '../components/CreateInvoiceModal.css';

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
  PLIAGE: 'Pliage',
  CUSTOM: 'Personnalisé',
};

interface CreateDevisModalProps {
  clients: Client[];
  onClose: () => void;
  onSave: (clientId: string, notes?: string) => Promise<void>;
  preSelectedClientId?: string;
}

function CreateDevisModal({ clients, onClose, onSave, preSelectedClientId }: CreateDevisModalProps) {
  const [clientId, setClientId] = useState(preSelectedClientId || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchClient, setSearchClient] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchClient.trim()) return clients;
    const query = searchClient.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(query));
  }, [clients, searchClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(clientId, notes || undefined);
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
          <h2 className="modal-title">Nouveau devis</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Client *</label>
              <input
                type="text"
                className="form-input mb-2"
                placeholder="Rechercher un client..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
              />
              <div className="client-select-list">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className={`client-select-item ${clientId === client.id ? 'selected' : ''}`}
                    onClick={() => setClientId(client.id)}
                  >
                    <span className="client-select-name">{client.name}</span>
                    {client.phone && <span className="client-select-phone">{client.phone}</span>}
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-muted text-center p-4">Aucun client trouvé</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              Créer le devis
            </button>
          </div>
        </form>
      </div>
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

interface CustomField {
  id: string;
  name: string;
  value: string;
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
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<'material' | 'service' | 'manual'>('manual');

  const [lineForm, setLineForm] = useState<AddDevisLineFormData>({
    machineType: 'CNC',
    description: '',
    minutes: undefined,
    meters: undefined,
    quantity: undefined,
    materialId: undefined,
    width: undefined,
    height: undefined,
    dimensionUnit: 'm',
  });

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomFields([...customFields, { id: crypto.randomUUID(), name: newFieldName.trim(), value: '' }]);
    setNewFieldName('');
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const updateCustomFieldValue = (id: string, value: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f));
  };

  const handleAddLine = async () => {
    setLoading(true);
    try {
      // Build description with custom fields for CUSTOM machine type
      let finalDescription = lineForm.description || '';
      if (lineForm.machineType === 'CUSTOM' && customFields.length > 0) {
        const customFieldsText = customFields
          .filter(f => f.value.trim())
          .map(f => `${f.name}: ${f.value}`)
          .join(' | ');
        if (customFieldsText) {
          finalDescription += finalDescription ? ` (${customFieldsText})` : customFieldsText;
        }
      }

      await onAddLine(devis.id, { ...lineForm, description: finalDescription });
      setShowAddLine(false);
      setLineForm({
        machineType: 'CNC',
        description: '',
        minutes: undefined,
        meters: undefined,
        quantity: undefined,
        materialId: undefined,
        width: undefined,
        height: undefined,
        dimensionUnit: 'm',
      });
      setCustomFields([]);
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
    if (!confirm('Êtes-vous sûr de vouloir annuler ce devis ?')) {
      return;
    }

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

  const handleDownloadPdf = async () => {
    if (!devis.invoice) return;
    try {
      const blob = await invoicesApi.downloadPdf(devis.invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${devis.invoice.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  const addedServiceIds = (devis.services || []).map((s) => s.serviceId);
  const isEditable = devis.status === 'DRAFT';

  return (
    <div className="modal-overlay" onClick={onClose}>
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
                        {line.quantity && <span>{line.quantity} unités</span>}
                        {line.width && line.height && (
                            <span>
                                {Number(line.width)} x {Number(line.height)} {line.dimensionUnit}
                            </span>
                        )}
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
                  <p>Aucune ligne ajoutée</p>
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
                      <>
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
                        <div className="form-group">
                          <label className="form-label">Largeur</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.width || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, width: parseFloat(e.target.value) || undefined })
                            }
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Hauteur</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.height || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, height: parseFloat(e.target.value) || undefined })
                            }
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Unité</label>
                          <select
                            className="form-select"
                            value={lineForm.dimensionUnit || 'm'}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, dimensionUnit: e.target.value })
                            }
                          >
                            <option value="m">Mètres (m)</option>
                            <option value="cm">Centimètres (cm)</option>
                          </select>
                        </div>
                         <div className="form-group">
                        <label className="form-label">Matériau</label>
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
                      </>
                    )}
                    {lineForm.machineType === 'CHAMPS' && (
                      <div className="form-group">
                        <label className="form-label">Mètres</label>
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
                    {lineForm.machineType === 'PLIAGE' && (
                      <>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label">Matériau utilisé</label>
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
                        <div className="form-group">
                          <label className="form-label">Mètres machine</label>
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
                        <div className="form-group">
                          <label className="form-label">Mètres matériau</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.quantity || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || undefined })
                            }
                            placeholder="0"
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </>
                    )}
                    {lineForm.machineType === 'PANNEAUX' && (
                      <div className="form-group">
                        <label className="form-label">Quantité</label>
                        <input
                          type="number"
                          className="form-input"
                          value={lineForm.quantity || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || undefined })
                          }
                          placeholder="0"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                    )}
                    {lineForm.machineType === 'SERVICE_MAINTENANCE' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Type de calcul</label>
                          <select
                            className="form-select"
                            value={maintenanceType}
                            onChange={(e) => {
                              setMaintenanceType(e.target.value as 'material' | 'service' | 'manual');
                              setLineForm({ ...lineForm, materialId: undefined, serviceId: undefined, unitPrice: undefined, quantity: undefined, width: undefined, height: undefined });
                            }}
                          >
                            <option value="manual">Prix manuel</option>
                            <option value="material">Matériau utilisé</option>
                            <option value="service">Service fixe</option>
                          </select>
                        </div>

                        {maintenanceType === 'manual' && (
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

                        {maintenanceType === 'material' && (
                          <>
                            <div className="form-group">
                              <label className="form-label">Matériau *</label>
                              <select
                                className="form-select"
                                value={lineForm.materialId || ''}
                                onChange={(e) =>
                                  setLineForm({ ...lineForm, materialId: e.target.value || undefined })
                                }
                              >
                                <option value="">Sélectionner...</option>
                                {materials.filter((m) => m.isActive).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} - {Number(m.pricePerUnit).toFixed(2)} TND/{m.unit}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Quantité</label>
                              <input
                                type="number"
                                className="form-input"
                                value={lineForm.quantity || ''}
                                onChange={(e) =>
                                  setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || undefined })
                                }
                                placeholder="1"
                                min="0.01"
                                step="0.01"
                              />
                            </div>
                          </>
                        )}

                        {maintenanceType === 'service' && (
                          <>
                            <div className="form-group">
                              <label className="form-label">Service *</label>
                              <select
                                className="form-select"
                                value={lineForm.serviceId || ''}
                                onChange={(e) =>
                                  setLineForm({ ...lineForm, serviceId: e.target.value || undefined })
                                }
                              >
                                <option value="">Sélectionner...</option>
                                {services.filter((s) => s.isActive).map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} - {Number(s.price).toFixed(2)} TND
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Quantité</label>
                              <input
                                type="number"
                                className="form-input"
                                value={lineForm.quantity || ''}
                                onChange={(e) =>
                                  setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || undefined })
                                }
                                placeholder="1"
                                min="1"
                                step="1"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {lineForm.machineType === 'VENTE_MATERIAU' && (
                       <>
                       <div className="form-group">
                        <label className="form-label">Matériau *</label>
                        <select
                          className="form-select"
                          value={lineForm.materialId || ''}
                          onChange={(e) =>
                            setLineForm({ ...lineForm, materialId: e.target.value || undefined })
                          }
                        >
                          <option value="">Sélectionner...</option>
                          {materials.filter((m) => m.isActive).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} - {Number(m.pricePerUnit).toFixed(2)} TND/{m.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                       <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Largeur</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.width || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, width: parseFloat(e.target.value) || undefined })
                            }
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Hauteur</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.height || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, height: parseFloat(e.target.value) || undefined })
                            }
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                         <div className="form-group">
                          <label className="form-label">Unité</label>
                          <select
                            className="form-select"
                            value={lineForm.dimensionUnit || 'm'}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, dimensionUnit: e.target.value })
                            }
                          >
                            <option value="m">Mètres (m)</option>
                            <option value="cm">Centimètres (cm)</option>
                          </select>
                        </div>
                       </div>
                       </>
                    )}
                    {lineForm.machineType === 'CUSTOM' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Quantité *</label>
                          <input
                            type="number"
                            className="form-input"
                            value={lineForm.quantity || ''}
                            onChange={(e) =>
                              setLineForm({ ...lineForm, quantity: parseInt(e.target.value) || undefined })
                            }
                            placeholder="1"
                            min="1"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Prix Unitaire (TND) *</label>
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
                      </>
                    )}
                  </div>

                  {/* Custom Fields for CUSTOM machine type */}
                  {lineForm.machineType === 'CUSTOM' && (
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label className="form-label">Champs personnalisés</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nom du champ (ex: Dimensions, Couleur...)"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-secondary" onClick={addCustomField} disabled={!newFieldName.trim()}>
                          <Plus size={16} /> Ajouter
                        </button>
                      </div>
                      {customFields.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {customFields.map(field => (
                            <div key={field.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ minWidth: '120px', fontWeight: 500 }}>{field.name}:</span>
                              <input
                                type="text"
                                className="form-input"
                                placeholder={`Valeur pour ${field.name}`}
                                value={field.value}
                                onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                                style={{ flex: 1 }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-ghost btn-icon" 
                                onClick={() => removeCustomField(field.id)}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
          {devis.status === 'INVOICED' && devis.invoice && (
            <div className="invoice-details">
              <div className="invoice-info">
                <Receipt size={18} className="text-primary" />
                <div>
                  <div className="invoice-reference">{devis.invoice.reference}</div>
                  <div className="invoice-date text-muted">
                    Créé le {new Date(devis.invoice.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf}>
                <Download size={16} />
                Télécharger PDF
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function DevisPage() {
  const [searchParams] = useSearchParams();
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DevisStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
      const [devisData, clientsData, materialsData, servicesData] = await Promise.all([
        devisApi.getAll({ 
          status: statusFilter === 'ALL' ? undefined : statusFilter, 
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        }),
        clientsApi.getAll(),
        materialsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setDevisList(devisData);
      setClients(clientsData);
      setMaterials(materialsData);
      setServices(servicesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedDevis) return;
    try {
      const updated = await devisApi.getById(selectedDevis.id);
      setSelectedDevis(updated);
      setDevisList(devisList.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDevis = async (devis: Devis) => {
    try {
      const fullDevis = await devisApi.getById(devis.id);
      setSelectedDevis(fullDevis);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, dateFrom, dateTo]);

  const handleDateRangeChange = (start: string, end: string) => {
    setDateFrom(start);
    setDateTo(end);
  };

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && !showCreateModal) {
      setPreSelectedClientId(clientId);
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const filteredDevis = useMemo(() => {
    let result = devisList;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.reference.toLowerCase().includes(query) ||
          d.client.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [devisList, searchQuery]);

  const handleCreate = async (clientId: string, notes?: string) => {
    const newDevis = await devisApi.create({ clientId, notes });
    setDevisList([newDevis, ...devisList]);
    setSelectedDevis(newDevis);
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

  const handleValidate = async (devisId: string) => {
    await devisApi.validate(devisId);
  };

  const handleCancel = async (devisId: string) => {
    await devisApi.cancel(devisId);
  };

  const handleDelete = async (devisId: string, reference: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le devis ${reference} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await devisApi.delete(devisId);
      await fetchData();
      setSelectedDevis(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression du devis');
    }
  };

  const handleBatchInvoiceSuccess = () => {
    fetchData();
  };

  const validatedDevis = devisList.filter(d => d.status === 'VALIDATED' && !d.invoice);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des devis...</p>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Devis"
        subtitle={`${devisList.length} devis au total`}
      />

      <div className="page-content">
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
          <div className="actions-right">
            <DateRangeFilter
              startDate={dateFrom}
              endDate={dateTo}
              onChange={handleDateRangeChange}
            />
            <div className="filter-dropdown">
              <button
                className="btn btn-secondary"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Filter size={18} />
                {statusFilter === 'ALL' ? 'Tous les statuts' : STATUS_LABELS[statusFilter]}
                <ChevronDown size={16} />
              </button>
              {showFilterDropdown && (
                <div className="dropdown-menu">
                  <button
                    className={`dropdown-item ${statusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => {
                      setStatusFilter('ALL');
                      setShowFilterDropdown(false);
                    }}
                  >
                    Tous les statuts
                  </button>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={`dropdown-item ${statusFilter === key ? 'active' : ''}`}
                      onClick={() => {
                        setStatusFilter(key as DevisStatus);
                        setShowFilterDropdown(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {validatedDevis.length > 0 && (
              <button className="btn btn-success" onClick={() => setShowInvoiceModal(true)}>
                <Receipt size={20} />
                Créer facture ({validatedDevis.length})
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              Nouveau devis
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchData}>
              Réessayer
            </button>
          </div>
        )}

        {/* Devis Table */}
        {filteredDevis.length > 0 ? (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Employé</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevis.map((devis) => (
                    <tr key={devis.id}>
                      <td className="font-medium">{devis.reference}</td>
                      <td>{devis.client.name}</td>
                      <td className="text-muted">
                        {devis.createdBy.firstName} {devis.createdBy.lastName}
                      </td>
                      <td>{Number(devis.totalAmount).toFixed(2)} TND</td>
                      <td>
                        <span className={`badge badge-${devis.status.toLowerCase()}`}>
                          {STATUS_LABELS[devis.status]}
                        </span>
                      </td>
                      <td>
                        <span className="table-date">
                          <Clock size={14} />
                          {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => handleViewDevis(devis)}
                            title="Voir les détails"
                          >
                            <Eye size={18} />
                          </button>
                          {devis.status !== 'INVOICED' && !devis.invoice && (
                            <button
                              className="btn btn-ghost btn-icon text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(devis.id, devis.reference);
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
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
            <FileText size={64} strokeWidth={1} />
            <h3>Aucun devis trouvé</h3>
            <p>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Aucun devis ne correspond à vos critères.'
                : 'Commencez par créer votre premier devis.'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus size={20} />
                Créer un devis
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateDevisModal
          clients={clients}
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedClientId(undefined);
          }}
          onSave={handleCreate}
          preSelectedClientId={preSelectedClientId}
        />
      )}

      {selectedDevis && (
        <DevisDetailModal
          devis={selectedDevis}
          materials={materials}
          services={services}
          onClose={() => setSelectedDevis(null)}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onAddService={handleAddService}
          onRemoveService={handleRemoveService}
          onValidate={handleValidate}
          onCancel={handleCancel}
          onRefresh={handleRefresh}
        />
      )}

      {showInvoiceModal && (
        <CreateInvoiceModal
          availableDevis={validatedDevis}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={handleBatchInvoiceSuccess}
        />
      )}
    </>
  );
}
