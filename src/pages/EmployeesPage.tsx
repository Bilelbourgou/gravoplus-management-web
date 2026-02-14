import { useState, useEffect, useMemo } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Shield,
  Settings2,
} from 'lucide-react';
import { Header } from '../components/layout';
import { usersApi } from '../services';
import type { User, CreateUserFormData, MachineType } from '../types';
import './EmployeesPage.css';

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

const ALL_MACHINES: MachineType[] = ['CNC', 'LASER', 'CHAMPS', 'PANNEAUX', 'SERVICE_MAINTENANCE', 'VENTE_MATERIAU', 'PLIAGE'];

interface EmployeeModalProps {
  employee: User | null;
  onClose: () => void;
  onSave: (data: CreateUserFormData) => Promise<void>;
}

function EmployeeModal({ employee, onClose, onSave }: EmployeeModalProps) {
  const [formData, setFormData] = useState<CreateUserFormData>({
    username: employee?.username || '',
    password: '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    role: employee?.role || 'EMPLOYEE',
    allowedMachines: employee?.allowedMachines?.map((m) => m.machine) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Tous les champs obligatoires doivent être remplis');
      return;
    }
    if (!employee && !formData.password) {
      setError('Le mot de passe est requis pour un nouvel employé');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dataToSend = { ...formData };
      if (employee && !formData.password) {
        delete (dataToSend as any).password;
      }
      await onSave(dataToSend);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleMachine = (machine: MachineType) => {
    const current = formData.allowedMachines || [];
    if (current.includes(machine)) {
      setFormData({
        ...formData,
        allowedMachines: current.filter((m) => m !== machine),
      });
    } else {
      setFormData({
        ...formData,
        allowedMachines: [...current, machine],
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {employee ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-section">
              <h4 className="form-section-title">Informations personnelles</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Nom"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4 className="form-section-title">Authentification</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom d'utilisateur *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Nom d'utilisateur"
                    disabled={!!employee}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Mot de passe {employee ? '(laisser vide pour conserver)' : '*'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4 className="form-section-title">Rôle et permissions</h4>
              <div className="form-group">
                <label className="form-label">Rôle *</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-option ${formData.role === 'EMPLOYEE' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, role: 'EMPLOYEE' })}
                  >
                    <UserCog size={20} />
                    <span>Employé</span>
                    <small>Accès limité aux devis</small>
                  </button>
                  <button
                    type="button"
                    className={`role-option ${formData.role === 'ADMIN' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                  >
                    <Shield size={20} />
                    <span>Administrateur</span>
                    <small>Accès complet au système</small>
                  </button>
                </div>
              </div>

              {formData.role === 'EMPLOYEE' && (
                <div className="form-group">
                  <label className="form-label">Machines autorisées</label>
                  <div className="machines-grid">
                    {ALL_MACHINES.map((machine) => (
                      <button
                        key={machine}
                        type="button"
                        className={`machine-option ${
                          formData.allowedMachines?.includes(machine) ? 'active' : ''
                        }`}
                        onClick={() => toggleMachine(machine)}
                      >
                        <Settings2 size={18} />
                        <span>{MACHINE_LABELS[machine]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {employee ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  employee: User;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteConfirmModal({ employee, onClose, onConfirm }: DeleteConfirmModalProps) {
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
          <h2 className="modal-title">Supprimer l'employé</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            Êtes-vous sûr de vouloir supprimer <strong>{employee.firstName} {employee.lastName}</strong> ?
          </p>
          <p className="text-muted mt-2">Cette action est irréversible. Toutes les données de cet employé seront supprimées.</p>
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

export function EmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<User | null>(null);

  const fetchEmployees = async () => {
    try {
      const data = await usersApi.getAll();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(query) ||
        emp.lastName.toLowerCase().includes(query) ||
        emp.username.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleCreate = async (data: CreateUserFormData) => {
    const newEmployee = await usersApi.create(data);
    setEmployees([newEmployee, ...employees]);
  };

  const handleUpdate = async (data: CreateUserFormData) => {
    if (!editingEmployee) return;
    const updated = await usersApi.update(editingEmployee.id, data);
    if (data.allowedMachines) {
      await usersApi.assignMachines(editingEmployee.id, data.allowedMachines);
    }
    setEmployees(employees.map((e) => (e.id === updated.id ? { ...updated, allowedMachines: editingEmployee.allowedMachines } : e)));
    fetchEmployees();
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    await usersApi.delete(deletingEmployee.id);
    setEmployees(employees.filter((e) => e.id !== deletingEmployee.id));
  };

  const openEditModal = (employee: User) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des employés...</p>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Employés" 
        subtitle={`${employees.length} employé${employees.length > 1 ? 's' : ''}`}
      />

      <div className="page-content">
        {/* Actions Bar */}
        <div className="actions-bar">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={20} />
            Nouvel employé
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchEmployees}>
              Réessayer
            </button>
          </div>
        )}

        {/* Employees Table */}
        {filteredEmployees.length > 0 ? (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th>Nom d'utilisateur</th>
                    <th>Rôle</th>
                    <th>Machines</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className={!employee.isActive ? 'inactive-row' : ''}>
                      <td>
                        <div className="employee-cell">
                          <div className={`employee-avatar ${employee.role === 'ADMIN' || employee.role === 'SUPERADMIN' ? 'admin' : ''}`}>
                            {employee.firstName[0]}{employee.lastName[0]}
                          </div>
                          <div>
                            <div className="employee-name">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">@{employee.username}</td>
                      <td>
                        <span className={`badge badge-${employee.role.toLowerCase()}`}>
                          {employee.role === 'SUPERADMIN' ? 'Super Admin' : employee.role === 'ADMIN' ? 'Admin' : 'Employé'}
                        </span>
                      </td>
                      <td>
                        {employee.role === 'ADMIN' ? (
                          <span className="text-muted">Toutes</span>
                        ) : (
                          <div className="machine-tags">
                            {employee.allowedMachines?.map((m) => (
                              <span key={m.id} className="machine-tag">
                                {MACHINE_LABELS[m.machine]}
                              </span>
                            ))}
                            {(!employee.allowedMachines || employee.allowedMachines.length === 0) && (
                              <span className="text-muted">Aucune</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-indicator ${employee.isActive ? 'active' : 'inactive'}`}>
                          {employee.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => openEditModal(employee)}
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setDeletingEmployee(employee)}
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
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
            <UserCog size={64} strokeWidth={1} />
            <h3>Aucun employé trouvé</h3>
            <p>
              {searchQuery
                ? 'Aucun employé ne correspond à votre recherche.'
                : 'Commencez par ajouter votre premier employé.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary mt-4" onClick={openCreateModal}>
                <Plus size={20} />
                Ajouter un employé
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={closeModal}
          onSave={editingEmployee ? handleUpdate : handleCreate}
        />
      )}

      {deletingEmployee && (
        <DeleteConfirmModal
          employee={deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
