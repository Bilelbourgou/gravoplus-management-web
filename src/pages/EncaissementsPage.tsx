import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Plus,
  Search,
  Eye,
  Clock,
  Filter,
  ChevronDown,
  Trash2,
  Download,
  X,
} from 'lucide-react';
import { Header } from '../components/layout';
import { DateRangeFilter } from '../components/common/DateRangeFilter';
import { devisApi, clientsApi, servicesApi, materialsApi, maintenanceMaterialsApi } from '../services';
import type { Devis, Client, DevisStatus, MachineType, FixedService, Material, MaintenanceMaterial, AddDevisLineFormData } from '../types';
import './DevisPage.css';
import { exportToExcel } from '../utils/exportExcel';

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

interface CreateEncaissementModalProps {
  clients: Client[];
  onClose: () => void;
  onSave: (clientId: string, notes?: string) => Promise<void>;
  preSelectedClientId?: string;
}

function CreateEncaissementModal({ clients, onClose, onSave, preSelectedClientId }: CreateEncaissementModalProps) {
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
          <h2 className="modal-title">Nouvel encaissement</h2>
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
              Créer l'encaissement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EncaissementDetailModalProps {
  devis: Devis;
  materials: Material[];
  maintenanceMaterials: MaintenanceMaterial[];
  services: FixedService[];
  onClose: () => void;
  onAddLine: (devisId: string, data: AddDevisLineFormData) => Promise<void>;
  onRemoveLine: (devisId: string, lineId: string) => Promise<void>;
  onAddService: (devisId: string, serviceId: string) => Promise<void>;
  onRemoveService: (devisId: string, serviceId: string) => Promise<void>;
  onFinalize: (devisId: string) => Promise<void>;
  onRefresh: () => void;
}

function EncaissementDetailModal({
  devis,
  materials,
  maintenanceMaterials,
  services,
  onClose,
  onAddLine,
  onRemoveLine,
  onAddService,
  onRemoveService,
  onFinalize,
  onRefresh,
}: EncaissementDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'services'>('lines');
  const [showAddLine, setShowAddLine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<'material' | 'service' | 'manual'>('manual');

  const [lineForm, setLineForm] = useState<AddDevisLineFormData>({
    machineType: 'CNC',
    description: '',
    minutes: undefined,
    meters: undefined,
    quantity: undefined,
    unitPrice: undefined,
    materialId: undefined,
    width: undefined,
    height: undefined,
    dimensionUnit: 'm',
  });

  const [selectedService, setSelectedService] = useState('');

  const isDraft = devis.status === 'DRAFT';

  const handleAddLine = async () => {
    setLoading(true);
    try {
      await onAddLine(devis.id, lineForm);
      setShowAddLine(false);
      setLineForm({
        machineType: lineForm.machineType,
        description: '',
        minutes: undefined,
        meters: undefined,
        quantity: undefined,
        unitPrice: undefined,
        materialId: undefined,
        width: undefined,
        height: undefined,
        dimensionUnit: 'm',
      });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'ajout de la ligne');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    setLoading(true);
    try {
      await onRemoveLine(devis.id, lineId);
      onRefresh();
    } catch (err) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      await onAddService(devis.id, selectedService);
      setSelectedService('');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'ajout du service');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    setLoading(true);
    try {
      await onRemoveService(devis.id, serviceId);
      onRefresh();
    } catch (err) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finaliser cet encaissement ?')) return;
    setLoading(true);
    try {
      await onFinalize(devis.id);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la finalisation');
    } finally {
      setLoading(false);
    }
  };

  const needsMaterial = ['CNC', 'LASER', 'VENTE_MATERIAU', 'PLIAGE'].includes(lineForm.machineType);
  const needsDimensions = ['CNC', 'LASER', 'VENTE_MATERIAU'].includes(lineForm.machineType);
  const needsMinutes = ['CNC', 'LASER'].includes(lineForm.machineType);
  const needsMeters = ['CHAMPS', 'PLIAGE'].includes(lineForm.machineType);
  const needsQuantity = ['PANNEAUX', 'SERVICE_MAINTENANCE', 'PLIAGE'].includes(lineForm.machineType);
  const isServiceMaintenance = lineForm.machineType === 'SERVICE_MAINTENANCE';

  const availableServices = services.filter(
    (s) => s.isActive && !devis.services.some((ds) => ds.serviceId === s.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{devis.reference}</h2>
            <p className="text-muted">{devis.client.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge badge-${devis.status.toLowerCase()}`}>
              {devis.status === 'DRAFT' ? 'Brouillon' : STATUS_LABELS[devis.status]}
            </span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {/* Tabs */}
          <div className="tabs mb-4">
            <button
              className={`tab ${activeTab === 'lines' ? 'active' : ''}`}
              onClick={() => setActiveTab('lines')}
            >
              Lignes ({devis.lines.length})
            </button>
            <button
              className={`tab ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              Services ({devis.services.length})
            </button>
          </div>

          {activeTab === 'lines' && (
            <>
              {/* Lines list */}
              {devis.lines.length > 0 ? (
                <div className="table-container mb-4">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>Description</th>
                        <th>Total</th>
                        {isDraft && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {devis.lines.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <span className="badge">{MACHINE_LABELS[line.machineType] || line.machineType}</span>
                          </td>
                          <td>{line.description || '-'}</td>
                          <td className="font-medium">{Number(line.lineTotal).toFixed(3)} TND</td>
                          {isDraft && (
                            <td>
                              <button
                                className="btn btn-ghost btn-icon text-danger"
                                onClick={() => handleRemoveLine(line.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center p-4">Aucune ligne ajoutée</p>
              )}

              {/* Add line form */}
              {isDraft && (
                <>
                  {!showAddLine ? (
                    <button className="btn btn-secondary w-full" onClick={() => setShowAddLine(true)}>
                      <Plus size={18} /> Ajouter une ligne
                    </button>
                  ) : (
                    <div className="card p-4">
                      <h4 className="mb-3">Nouvelle ligne</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Machine *</label>
                          <select
                            className="form-select"
                            value={lineForm.machineType}
                            onChange={(e) => setLineForm({ ...lineForm, machineType: e.target.value as MachineType, materialId: undefined, maintenanceMaterialId: undefined })}
                          >
                            {Object.entries(MACHINE_LABELS).filter(([k]) => k !== 'CUSTOM').map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
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
                          />
                        </div>
                        {needsMinutes && (
                          <div className="form-group">
                            <label className="form-label">Minutes *</label>
                            <input
                              type="number"
                              className="form-input"
                              value={lineForm.minutes || ''}
                              onChange={(e) => setLineForm({ ...lineForm, minutes: Number(e.target.value) || undefined })}
                            />
                          </div>
                        )}
                        {needsMeters && (
                          <div className="form-group">
                            <label className="form-label">Mètres *</label>
                            <input
                              type="number"
                              className="form-input"
                              value={lineForm.meters || ''}
                              onChange={(e) => setLineForm({ ...lineForm, meters: Number(e.target.value) || undefined })}
                            />
                          </div>
                        )}
                        {needsQuantity && (
                          <div className="form-group">
                            <label className="form-label">{lineForm.machineType === 'PLIAGE' ? 'Mètres matériau' : 'Quantité *'}</label>
                            <input
                              type="number"
                              className="form-input"
                              value={lineForm.quantity || ''}
                              onChange={(e) => setLineForm({ ...lineForm, quantity: Number(e.target.value) || undefined })}
                            />
                          </div>
                        )}
                        {needsMaterial && !isServiceMaintenance && (
                          <div className="form-group">
                            <label className="form-label">Matériau</label>
                            <select
                              className="form-select"
                              value={lineForm.materialId || ''}
                              onChange={(e) => setLineForm({ ...lineForm, materialId: e.target.value || undefined })}
                            >
                              <option value="">Sans matériau</option>
                              {materials.filter(m => m.isActive).map((m) => (
                                <option key={m.id} value={m.id}>{m.name} ({m.pricePerUnit} TND/{m.unit})</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {needsDimensions && lineForm.materialId && (
                          <>
                            <div className="form-group">
                              <label className="form-label">Unité</label>
                              <select
                                className="form-select"
                                value={lineForm.dimensionUnit || 'm'}
                                onChange={(e) => setLineForm({ ...lineForm, dimensionUnit: e.target.value })}
                              >
                                <option value="m">Mètres</option>
                                <option value="cm">Centimètres</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Largeur</label>
                              <input
                                type="number"
                                className="form-input"
                                step="0.01"
                                value={lineForm.width || ''}
                                onChange={(e) => setLineForm({ ...lineForm, width: Number(e.target.value) || undefined })}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Hauteur</label>
                              <input
                                type="number"
                                className="form-input"
                                step="0.01"
                                value={lineForm.height || ''}
                                onChange={(e) => setLineForm({ ...lineForm, height: Number(e.target.value) || undefined })}
                              />
                            </div>
                          </>
                        )}
                        {isServiceMaintenance && (
                          <>
                            <div className="form-group">
                              <label className="form-label">Type</label>
                              <select
                                className="form-select"
                                value={maintenanceType}
                                onChange={(e) => {
                                  setMaintenanceType(e.target.value as any);
                                  setLineForm({ ...lineForm, materialId: undefined, maintenanceMaterialId: undefined, serviceId: undefined, unitPrice: undefined });
                                }}
                              >
                                <option value="manual">Prix manuel</option>
                                <option value="material">Matériau maintenance</option>
                                <option value="service">Service fixe</option>
                              </select>
                            </div>
                            {maintenanceType === 'material' && (
                              <div className="form-group">
                                <label className="form-label">Matériau maintenance</label>
                                <select
                                  className="form-select"
                                  value={(lineForm as any).maintenanceMaterialId || ''}
                                  onChange={(e) => setLineForm({ ...lineForm, maintenanceMaterialId: e.target.value || undefined } as any)}
                                >
                                  <option value="">Sélectionner...</option>
                                  {maintenanceMaterials.filter(m => m.isActive).map((m) => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.pricePerUnit} TND/{m.unit})</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {maintenanceType === 'service' && (
                              <div className="form-group">
                                <label className="form-label">Service</label>
                                <select
                                  className="form-select"
                                  value={(lineForm as any).serviceId || ''}
                                  onChange={(e) => setLineForm({ ...lineForm, serviceId: e.target.value || undefined } as any)}
                                >
                                  <option value="">Sélectionner...</option>
                                  {services.filter(s => s.isActive).map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.price} TND)</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {maintenanceType === 'manual' && (
                              <div className="form-group">
                                <label className="form-label">Prix unitaire *</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  step="0.001"
                                  value={lineForm.unitPrice || ''}
                                  onChange={(e) => setLineForm({ ...lineForm, unitPrice: Number(e.target.value) || undefined })}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="btn btn-secondary" onClick={() => setShowAddLine(false)}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleAddLine} disabled={loading}>
                          {loading ? <span className="spinner" /> : null}
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'services' && (
            <>
              {devis.services.length > 0 ? (
                <div className="table-container mb-4">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Prix</th>
                        {isDraft && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {devis.services.map((ds) => (
                        <tr key={ds.id}>
                          <td>{ds.service.name}</td>
                          <td className="font-medium">{Number(ds.price).toFixed(3)} TND</td>
                          {isDraft && (
                            <td>
                              <button
                                className="btn btn-ghost btn-icon text-danger"
                                onClick={() => handleRemoveService(ds.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center p-4">Aucun service ajouté</p>
              )}

              {isDraft && availableServices.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-select"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Sélectionner un service...</option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} - {s.price} TND</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={handleAddService} disabled={!selectedService || loading}>
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Total */}
          <div className="total-section mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>
                {Number(devis.totalAmount).toFixed(3)} TND
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          {isDraft && devis.lines.length > 0 && (
            <button className="btn btn-primary" onClick={handleFinalize} disabled={loading}>
              {loading ? <span className="spinner" /> : <Wallet size={18} />}
              Finaliser l'encaissement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EncaissementsPage() {
  const [searchParams] = useSearchParams();
  const [encaissementsList, setEncaissementsList] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<MaintenanceMaterial[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DevisStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEncaissement, setSelectedEncaissement] = useState<Devis | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
      const [encData, clientsData, materialsData, maintenanceMaterialsData, servicesData] = await Promise.all([
        devisApi.getAll({
          type: 'ENCAISSEMENT',
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        clientsApi.getAll(),
        materialsApi.getAll(),
        maintenanceMaterialsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setEncaissementsList(encData);
      setClients(clientsData);
      setMaterials(materialsData);
      setMaintenanceMaterials(maintenanceMaterialsData);
      setServices(servicesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedEncaissement) return;
    try {
      const updated = await devisApi.getById(selectedEncaissement.id);
      setSelectedEncaissement(updated);
      setEncaissementsList(encaissementsList.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewEncaissement = async (enc: Devis) => {
    try {
      const full = await devisApi.getById(enc.id);
      setSelectedEncaissement(full);
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

  const filteredList = useMemo(() => {
    let result = encaissementsList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.reference.toLowerCase().includes(query) ||
          d.client.name.toLowerCase().includes(query)
      );
    }
    return result;
  }, [encaissementsList, searchQuery]);

  const handleCreate = async (clientId: string, notes?: string) => {
    const newEnc = await devisApi.createEncaissement({ clientId, notes });
    setEncaissementsList([newEnc, ...encaissementsList]);
    // Open detail modal to add lines
    const full = await devisApi.getById(newEnc.id);
    setSelectedEncaissement(full);
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

  const handleFinalize = async (devisId: string) => {
    await devisApi.finalizeEncaissement(devisId);
    await fetchData();
    setSelectedEncaissement(null);
  };

  const handleDelete = async (devisId: string, reference: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'encaissement ${reference} ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await devisApi.delete(devisId);
      await fetchData();
      setSelectedEncaissement(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des encaissements...</p>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Encaissements"
        subtitle={`${encaissementsList.length} encaissement(s) au total`}
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
                    onClick={() => { setStatusFilter('ALL'); setShowFilterDropdown(false); }}
                  >
                    Tous les statuts
                  </button>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={`dropdown-item ${statusFilter === key ? 'active' : ''}`}
                      onClick={() => { setStatusFilter(key as DevisStatus); setShowFilterDropdown(false); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => exportToExcel(
              filteredList,
              [
                { header: 'Référence', accessor: (d) => d.reference },
                { header: 'Client', accessor: (d) => d.client?.name || '' },
                { header: 'Statut', accessor: (d) => STATUS_LABELS[d.status] || d.status },
                { header: 'Montant (TND)', accessor: (d) => Number(d.totalAmount).toFixed(3) },
                { header: 'Créé par', accessor: (d) => `${d.createdBy?.firstName || ''} ${d.createdBy?.lastName || ''}`.trim() },
                { header: 'Date', accessor: (d) => new Date(d.createdAt).toLocaleDateString('fr-FR') },
              ],
              'encaissements'
            )}>
              <Download size={18} />
              Exporter Excel
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              Nouvel encaissement
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

        {/* Encaissements Table */}
        {filteredList.length > 0 ? (
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
                  {filteredList.map((enc) => (
                    <tr key={enc.id}>
                      <td className="font-medium">{enc.reference}</td>
                      <td>{enc.client.name}</td>
                      <td className="text-muted">
                        {enc.createdBy.firstName} {enc.createdBy.lastName}
                      </td>
                      <td>{Number(enc.totalAmount).toFixed(3)} TND</td>
                      <td>
                        <span className={`badge badge-${enc.status.toLowerCase()}`}>
                          {STATUS_LABELS[enc.status]}
                        </span>
                      </td>
                      <td>
                        <span className="table-date">
                          <Clock size={14} />
                          {new Date(enc.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => handleViewEncaissement(enc)}
                            title="Voir les détails"
                          >
                            <Eye size={18} />
                          </button>
                          {enc.status === 'DRAFT' && (
                            <button
                              className="btn btn-ghost btn-icon text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(enc.id, enc.reference);
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
            <Wallet size={64} strokeWidth={1} />
            <h3>Aucun encaissement trouvé</h3>
            <p>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Aucun encaissement ne correspond à vos critères.'
                : 'Commencez par créer votre premier encaissement.'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus size={20} />
                Créer un encaissement
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEncaissementModal
          clients={clients}
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedClientId(undefined);
          }}
          onSave={handleCreate}
          preSelectedClientId={preSelectedClientId}
        />
      )}

      {selectedEncaissement && (
        <EncaissementDetailModal
          devis={selectedEncaissement}
          materials={materials}
          maintenanceMaterials={maintenanceMaterials}
          services={services}
          onClose={() => setSelectedEncaissement(null)}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onAddService={handleAddService}
          onRemoveService={handleRemoveService}
          onFinalize={handleFinalize}
          onRefresh={handleRefresh}
        />
      )}
    </>
  );
}
