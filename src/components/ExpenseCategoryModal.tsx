import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { expenseCategoriesApi } from '../services';
import type { ExpenseCategory } from '../types';

interface ExpenseCategoryModalProps {
  onClose: () => void;
  onCategoriesChange: () => void;
}

export function ExpenseCategoryModal({ onClose, onCategoriesChange }: ExpenseCategoryModalProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6c757d', icon: 'Package' });
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await expenseCategoriesApi.getAll();
      setCategories(data);
    } catch (err) {
      setError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await expenseCategoriesApi.create(newCategory);
      setNewCategory({ name: '', color: '#6c757d', icon: 'Package' });
      await fetchCategories();
      onCategoriesChange();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;

    try {
      await expenseCategoriesApi.delete(id);
      await fetchCategories();
      onCategoriesChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression (vérifiez si elle est utilisée)');
    }
  };

  const PRESET_COLORS = [
    '#0066cc', '#28a745', '#856404', '#6f42c1', 
    '#17a2b8', '#fd7e14', '#d39e00', '#6c757d',
    '#e83e8c', '#20c997', '#007bff', '#dc3545'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Gérer les catégories</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* New Category Form */}
          <form onSubmit={handleCreate} className="category-form">
            <div className="form-group">
              <label className="form-label">Nom de la catégorie</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ex: Marketing, Bureau..."
                />
                <button type="submit" className="btn btn-primary" disabled={saving || !newCategory.name}>
                  {saving ? <span className="spinner" /> : <Plus size={18} />}
                  Ajouter
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div className="color-presets">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-preset ${newCategory.color === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                  />
                ))}
                <div className="color-picker-wrapper">
                   <input 
                    type="color" 
                    value={newCategory.color} 
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                   />
                </div>
              </div>
            </div>
          </form>

          <hr className="my-4" />

          {/* Categories List */}
          <div className="categories-list">
            {loading ? (
              <div className="flex justify-center p-4"><span className="spinner" /></div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="category-item">
                  <div className="category-info">
                    <div className="category-color-dot" style={{ backgroundColor: cat.color }} />
                    <span className="category-name">{cat.name}</span>
                  </div>
                  <button 
                    className="btn btn-ghost btn-icon btn-sm text-danger" 
                    onClick={() => handleDelete(cat.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
      <style>{`
        .category-form {
          background: var(--bg-secondary);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .color-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .color-preset {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .color-preset:hover { transform: scale(1.1); }
        .color-preset.active { border-color: var(--text-primary); }
        .color-picker-wrapper input {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
        }
        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
        }
        .category-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .category-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .category-name {
          font-weight: 500;
        }
        .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
        .text-danger { color: var(--error-color); }
        .flex { display: flex; }
        .justify-center { justify-content: center; }
        .p-4 { padding: 1rem; }
      `}</style>
    </div>
  );
}
