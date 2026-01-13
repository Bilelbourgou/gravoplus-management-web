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
} from 'lucide-react';
import { Header } from '../components/layout';
import { clientsApi } from '../services';
import type { Client, CreateClientFormData } from '../types';
import './ClientsPage.css';

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
    </>
  );
}
