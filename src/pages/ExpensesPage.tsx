import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Wallet,
  TrendingDown,
  Calendar,
  Filter,
  Receipt,
  Package,
  Truck,
  Wrench,
  Users,
  Home,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import { Header } from '../components/layout';
import { expensesApi } from '../services';
import type { Expense, CreateExpenseFormData, ExpenseCategory, ExpenseStats } from '../types';
import './ExpensesPage.css';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'Matériel', label: 'Matériel', icon: Package, color: '#0066cc' },
  { value: 'Fournitures', label: 'Fournitures', icon: Receipt, color: '#28a745' },
  { value: 'Transport', label: 'Transport', icon: Truck, color: '#856404' },
  { value: 'Maintenance', label: 'Maintenance', icon: Wrench, color: '#6f42c1' },
  { value: 'Salaires', label: 'Salaires', icon: Users, color: '#17a2b8' },
  { value: 'Loyer', label: 'Loyer', icon: Home, color: '#fd7e14' },
  { value: 'Électricité', label: 'Électricité', icon: Zap, color: '#d39e00' },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal, color: '#6c757d' },
];

const getCategoryClass = (category: string): string => {
  const map: Record<string, string> = {
    'Matériel': 'materiel',
    'Fournitures': 'fournitures',
    'Transport': 'transport',
    'Maintenance': 'maintenance',
    'Salaires': 'salaires',
    'Loyer': 'loyer',
    'Électricité': 'electricite',
    'Autre': 'autre',
  };
  return map[category] || 'autre';
};

const getCategoryColor = (category: string): string => {
  const found = EXPENSE_CATEGORIES.find(c => c.value === category);
  return found?.color || '#6c757d';
};

interface ExpenseModalProps {
  expense: Expense | null;
  onClose: () => void;
  onSave: (data: CreateExpenseFormData) => Promise<void>;
}

function ExpenseModal({ expense, onClose, onSave }: ExpenseModalProps) {
  const [formData, setFormData] = useState<CreateExpenseFormData>({
    description: expense?.description || '',
    amount: expense?.amount || 0,
    category: expense?.category || 'Autre',
    date: expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
    reference: expense?.reference || '',
    notes: expense?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError('La description est requise');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
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
            {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Description *</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la dépense"
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Montant (TND) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Référence</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.reference || ''}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="N° facture, reçu..."
                />
              </div>
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
              {expense ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  expense: Expense;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteConfirmModal({ expense, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmer la suppression</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            Êtes-vous sûr de vouloir supprimer cette dépense ?
          </p>
          <p style={{ fontWeight: 600, marginTop: 8 }}>
            "{expense.description}" - {Number(expense.amount).toFixed(2)} TND
          </p>
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

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesData, statsData] = await Promise.all([
        expensesApi.getAll(categoryFilter ? { category: categoryFilter } : undefined),
        expensesApi.getStats(),
      ]);
      setExpenses(expensesData);
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
  }, [categoryFilter]);

  const handleCreate = async (data: CreateExpenseFormData) => {
    const newExpense = await expensesApi.create(data);
    setExpenses([newExpense, ...expenses]);
    await fetchData();
  };

  const handleUpdate = async (data: CreateExpenseFormData) => {
    if (!editingExpense) return;
    const updated = await expensesApi.update(editingExpense.id, data);
    setExpenses(expenses.map((e) => (e.id === updated.id ? updated : e)));
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    await expensesApi.delete(deletingExpense.id);
    setExpenses(expenses.filter((e) => e.id !== deletingExpense.id));
    setDeletingExpense(null);
    setShowDeleteModal(false);
    await fetchData();
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

  if (loading && expenses.length === 0) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des dépenses...</p>
      </div>
    );
  }

  const maxCategoryAmount = stats ? Math.max(...Object.values(stats.byCategory)) : 0;

  return (
    <>
      <Header
        title="Dépenses"
        subtitle="Gérez et suivez les dépenses de l'entreprise"
      />

      <div className="page-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="btn btn-sm btn-secondary ml-4" onClick={fetchData}>
              Réessayer
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="expenses-stats">
            <div className="expense-stat-card">
              <div className="stat-icon total">
                <Wallet size={24} />
              </div>
              <span className="stat-label">Total des dépenses</span>
              <span className="stat-value">{formatCurrency(stats.totalAmount)}</span>
            </div>
            <div className="expense-stat-card">
              <div className="stat-icon count">
                <TrendingDown size={24} />
              </div>
              <span className="stat-label">Nombre de dépenses</span>
              <span className="stat-value">{stats.count}</span>
            </div>
          </div>
        )}

        {/* Category Chart */}
        {stats && Object.keys(stats.byCategory).length > 0 && (
          <div className="category-chart">
            <h3>Répartition par catégorie</h3>
            <div className="category-bars">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="category-bar-item">
                    <span className="category-bar-label">{category}</span>
                    <div className="category-bar-container">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${(amount / maxCategoryAmount) * 100}%`,
                          backgroundColor: getCategoryColor(category),
                        }}
                      />
                    </div>
                    <span className="category-bar-value">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Header with filters and add button */}
        <div className="expenses-header">
          <div className="expenses-filters">
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">Toutes les catégories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingExpense(null);
              setShowModal(true);
            }}
          >
            <Plus size={18} />
            Nouvelle dépense
          </button>
        </div>

        {/* Expenses Table */}
        {expenses.length > 0 ? (
          <div className="expenses-table-container">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Créé par</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const CategoryIcon = EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.icon || MoreHorizontal;
                  return (
                    <tr key={expense.id}>
                      <td className="expense-date">
                        <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {formatDate(expense.date)}
                      </td>
                      <td>
                        <div>
                          <strong>{expense.description}</strong>
                          {expense.notes && (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 2 }}>
                              {expense.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`expense-category ${getCategoryClass(expense.category)}`}>
                          <CategoryIcon size={14} />
                          {expense.category}
                        </span>
                      </td>
                      <td className="expense-reference">
                        {expense.reference || '-'}
                      </td>
                      <td className="expense-amount">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td>
                        {expense.createdBy.firstName} {expense.createdBy.lastName}
                      </td>
                      <td>
                        <div className="expense-actions">
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowModal(true);
                            }}
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => {
                              setDeletingExpense(expense);
                              setShowDeleteModal(true);
                            }}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Wallet size={64} strokeWidth={1} />
            <h3>Aucune dépense</h3>
            <p>Ajoutez des dépenses pour suivre les coûts de l'entreprise.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSave={editingExpense ? handleUpdate : handleCreate}
        />
      )}

      {showDeleteModal && deletingExpense && (
        <DeleteConfirmModal
          expense={deletingExpense}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingExpense(null);
          }}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
