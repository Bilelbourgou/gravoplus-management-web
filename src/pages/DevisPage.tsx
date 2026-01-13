import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Header } from '../components/layout';
import { devisApi, clientsApi, servicesApi, materialsApi, invoicesApi } from '../services';
import type { Devis, Client, DevisStatus, MachineType, FixedService, Material, AddDevisLineFormData } from '../types';
import './DevisPage.css';

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

interface CreateDevisModalProps {
  clients: Client[];
  onClose: () => void;
  onSave: (clientId: string, notes?: string) => Promise<void>;
}

function CreateDevisModal({ clients, onClose, onSave }: CreateDevisModalProps) {
  const [clientId, setClientId] = useState('');
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
  onCreateInvoice: (devisId: string) => Promise<void>;
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
  onCreateInvoice,
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

  const handleCreateInvoice = async () => {
    setLoading(true);
    try {
      await onCreateInvoice(devis.id);
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
                    {lineForm.machineType === 'PANNEAUX' && (
                      <div className="form-group">
                        <label className="form-label">Quantité</label>
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
            <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={loading}>
              <Receipt size={18} />
              Créer la facture
            </button>
          )}
          {devis.status === 'INVOICED' && devis.invoice && (
            <span className="text-muted">Facture: {devis.invoice.reference}</span>
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

  const fetchData = async () => {
    try {
      const [devisData, clientsData, materialsData, servicesData] = await Promise.all([
        devisApi.getAll(),
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

  const refreshSelectedDevis = async () => {
    if (!selectedDevis) return;
    try {
      const updated = await devisApi.getById(selectedDevis.id);
      setSelectedDevis(updated);
      setDevisList(devisList.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDevis = useMemo(() => {
    let result = devisList;

    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.reference.toLowerCase().includes(query) ||
          d.client.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [devisList, statusFilter, searchQuery]);

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

  const handleCreateInvoice = async (devisId: string) => {
    await invoicesApi.createFromDevis(devisId);
  };

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
                      <td>{Number(devis.totalAmount).toFixed(2)} TND</td>
                      <td>
                        <span className={`badge badge-${devis.status.toLowerCase()}`}>
                          {STATUS_LABELS[devis.status]}
                        </span>
                      </td>
                      <td className="flex items-center gap-2 text-muted">
                        <Clock size={14} />
                        {new Date(devis.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => setSelectedDevis(devis)}
                          title="Voir les détails"
                        >
                          <Eye size={18} />
                        </button>
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
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
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
          onCreateInvoice={handleCreateInvoice}
          onRefresh={refreshSelectedDevis}
        />
      )}
    </>
  );
}
