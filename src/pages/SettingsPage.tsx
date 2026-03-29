import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Package,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import { Header } from '../components/layout';
import { materialsApi, servicesApi, maintenanceMaterialsApi, materialCategoriesApi } from '../services';
import type { Material, MaintenanceMaterial, FixedService, MaterialCategory } from '../types';
import './SettingsPage.css';

interface MaterialModalProps {
  material: Material | null;
  categories: MaterialCategory[];
  onClose: () => void;
  onSave: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> & { categoryId?: string }) => Promise<void>;
}

function MaterialModal({ material, categories, onClose, onSave }: MaterialModalProps) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    pricePerUnit: material?.pricePerUnit?.toString() || '',
    unit: material?.unit || 'm²',
    description: material?.description || '',
    isActive: material?.isActive ?? true,
    categoryId: material?.categoryId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pricePerUnit) {
      setError('Nom et prix sont requis');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: formData.name,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        unit: formData.unit,
        description: formData.description || undefined,
        isActive: formData.isActive,
        categoryId: formData.categoryId || undefined,
      });
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
            {material ? 'Modifier le matériau' : 'Nouveau matériau'}
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
                placeholder="Nom du matériau"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Aucune</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prix par unité *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unité</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="m²">m² (mètre carré)</option>
                  <option value="m">m (mètre)</option>
                  <option value="pièce">pièce</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="toggle-switch"></span>
                <span>Actif</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {material ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ServiceModalProps {
  service: FixedService | null;
  onClose: () => void;
  onSave: (data: Omit<FixedService, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function ServiceModal({ service, onClose, onSave }: ServiceModalProps) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    price: service?.price?.toString() || '',
    description: service?.description || '',
    isActive: service?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      setError('Nom et prix sont requis');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description || undefined,
        isActive: formData.isActive,
      });
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
            {service ? 'Modifier le service' : 'Nouveau service'}
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
                placeholder="Nom du service"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prix fixe (TND) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="toggle-switch"></span>
                <span>Actif</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {service ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MaintenanceMaterialModalProps {
  material: MaintenanceMaterial | null;
  onClose: () => void;
  onSave: (data: Omit<MaintenanceMaterial, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function MaintenanceMaterialModal({ material, onClose, onSave }: MaintenanceMaterialModalProps) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    pricePerUnit: material?.pricePerUnit?.toString() || '',
    unit: material?.unit || 'pièce',
    description: material?.description || '',
    isActive: material?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pricePerUnit) {
      setError('Nom et prix sont requis');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: formData.name,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        unit: formData.unit,
        description: formData.description || undefined,
        isActive: formData.isActive,
      });
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
            {material ? 'Modifier le matériau maintenance' : 'Nouveau matériau maintenance'}
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
                placeholder="Nom du matériau"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prix par unité *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unité</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="pièce">pièce</option>
                  <option value="m²">m² (mètre carré)</option>
                  <option value="m">m (mètre)</option>
                  <option value="kg">kg</option>
                  <option value="L">L (litre)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="toggle-switch"></span>
                <span>Actif</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {material ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialCategoryModal({ category, onClose, onSave }: {
  category: MaterialCategory | null;
  onClose: () => void;
  onSave: (data: { name: string; color?: string; icon?: string }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    color: category?.color || '#3b82f6',
    icon: category?.icon || 'Package',
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
            {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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
                placeholder="Nom de la catégorie"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Couleur</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="form-input-color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-input flex-1"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {category ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'materials' | 'maintenanceMaterials' | 'services' | 'materialCategories'>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<MaintenanceMaterial[]>([]);
  const [services, setServices] = useState<FixedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMaintenanceMaterialModal, setShowMaintenanceMaterialModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
  const [editingMaintenanceMaterial, setEditingMaintenanceMaterial] = useState<MaintenanceMaterial | null>(null);
  const [editingService, setEditingService] = useState<FixedService | null>(null);

  const fetchData = async () => {
    try {
      const [materialsData, categoriesData, maintenanceMaterialsData, servicesData] = await Promise.all([
        materialsApi.getAll(),
        materialCategoriesApi.getAll(),
        maintenanceMaterialsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setMaterials(materialsData);
      setCategories(categoriesData);
      setMaintenanceMaterials(maintenanceMaterialsData);
      setServices(servicesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Material handlers
  const handleCreateMaterial = async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newMaterial = await materialsApi.create(data);
    setMaterials([newMaterial, ...materials]);
  };

  const handleUpdateMaterial = async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> & { categoryId?: string }) => {
    if (!editingMaterial) return;
    const updated = await materialsApi.update(editingMaterial.id, data);
    setMaterials(materials.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce matériau ?')) return;
    await materialsApi.delete(id);
    setMaterials(materials.filter((m) => m.id !== id));
  };

  // Category handlers
  const handleCreateCategory = async (data: { name: string; color?: string; icon?: string }) => {
    const newCat = await materialCategoriesApi.create(data);
    setCategories([newCat, ...categories]);
  };

  const handleUpdateCategory = async (data: { name?: string; color?: string; icon?: string }) => {
    if (!editingCategory) return;
    const updated = await materialCategoriesApi.update(editingCategory.id, data);
    setCategories(categories.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
    try {
      await materialCategoriesApi.delete(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  // Maintenance Material handlers
  const handleCreateMaintenanceMaterial = async (data: Omit<MaintenanceMaterial, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newMaterial = await maintenanceMaterialsApi.create(data);
    setMaintenanceMaterials([newMaterial, ...maintenanceMaterials]);
  };

  const handleUpdateMaintenanceMaterial = async (data: Omit<MaintenanceMaterial, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingMaintenanceMaterial) return;
    const updated = await maintenanceMaterialsApi.update(editingMaintenanceMaterial.id, data);
    setMaintenanceMaterials(maintenanceMaterials.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleDeleteMaintenanceMaterial = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce matériau maintenance ?')) return;
    await maintenanceMaterialsApi.delete(id);
    setMaintenanceMaterials(maintenanceMaterials.filter((m) => m.id !== id));
  };

  // Service handlers
  const handleCreateService = async (data: Omit<FixedService, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newService = await servicesApi.create(data);
    setServices([newService, ...services]);
  };

  const handleUpdateService = async (data: Omit<FixedService, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingService) return;
    const updated = await servicesApi.update(editingService.id, data);
    setServices(services.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;
    await servicesApi.delete(id);
    setServices(services.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Paramètres"
        subtitle="Gérez les matériaux et services fixes"
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

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <Package size={20} />
            Matériaux
            <span className="tab-count">{materials.length}</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'maintenanceMaterials' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenanceMaterials')}
          >
            <ShieldCheck size={20} />
            Mat. Maintenance
            <span className="tab-count">{maintenanceMaterials.length}</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Wrench size={20} />
            Services fixes
            <span className="tab-count">{services.length}</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'materialCategories' ? 'active' : ''}`}
            onClick={() => setActiveTab('materialCategories')}
          >
            <ShieldCheck size={20} />
            Catégories Mat.
            <span className="tab-count">{categories.length}</span>
          </button>
        </div>

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="settings-content">
            <div className="settings-header">
              <h3>Matériaux</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingMaterial(null);
                  setShowMaterialModal(true);
                }}
              >
                <Plus size={18} />
                Nouveau matériau
              </button>
            </div>

            {(() => {
              const grouped: Record<string, Material[]> = {};
              materials.forEach(m => {
                const catName = m.category?.name || 'Autres';
                if (!grouped[catName]) grouped[catName] = [];
                grouped[catName].push(m);
              });

              const sortedCats = Object.keys(grouped).sort((a, b) => {
                if (a === 'Autres') return 1;
                if (b === 'Autres') return -1;
                return a.localeCompare(b);
              });

              if (materials.length === 0) {
                return (
                  <div className="empty-state">
                    <Package size={64} strokeWidth={1} />
                    <h3>Aucun matériau</h3>
                    <p>Ajoutez des matériaux pour les utiliser dans vos devis.</p>
                  </div>
                );
              }

              return sortedCats.map(cat => (
                <div key={cat} className="settings-category-group">
                  <div className="settings-category-header">
                    <h4>{cat}</h4>
                    <div className="settings-category-line"></div>
                  </div>
                  <div className="settings-grid">
                    {grouped[cat].map((material) => (
                      <div key={material.id} className={`settings-card ${!material.isActive ? 'inactive' : ''}`}>
                        <div className="settings-card-header">
                          <div className="settings-card-icon">
                            <Package size={20} />
                          </div>
                          <div className="settings-card-actions">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => {
                                setEditingMaterial(material);
                                setShowMaterialModal(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleDeleteMaterial(material.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="settings-card-body">
                          <h4>{material.name}</h4>
                          <div className="flex gap-2 items-center mb-1">
                            {material.category ? (
                              <span className="badge badge-secondary" style={{ backgroundColor: material.category.color + '20', color: material.category.color }}>
                                {material.category.name}
                              </span>
                            ) : (
                              <span className="badge badge-ghost text-xs">Sans catégorie</span>
                            )}
                          </div>
                          {material.description && (
                            <p className="text-muted">{material.description}</p>
                          )}
                          <div className="settings-card-price">
                            {Number(material.pricePerUnit).toFixed(2)} TND/{material.unit}
                          </div>
                        </div>
                        <div className="settings-card-footer">
                          <span className={`status-dot ${material.isActive ? 'active' : ''}`}></span>
                          {material.isActive ? 'Actif' : 'Inactif'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* Maintenance Materials Tab */}
        {activeTab === 'maintenanceMaterials' && (
          <div className="settings-content">
            <div className="settings-header">
              <h3>Matériaux Maintenance</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingMaintenanceMaterial(null);
                  setShowMaintenanceMaterialModal(true);
                }}
              >
                <Plus size={18} />
                Nouveau matériau maintenance
              </button>
            </div>

            {maintenanceMaterials.length > 0 ? (
              <div className="settings-grid">
                {maintenanceMaterials.map((material) => (
                  <div key={material.id} className={`settings-card ${!material.isActive ? 'inactive' : ''}`}>
                    <div className="settings-card-header">
                      <div className="settings-card-icon">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="settings-card-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => {
                            setEditingMaintenanceMaterial(material);
                            setShowMaintenanceMaterialModal(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDeleteMaintenanceMaterial(material.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="settings-card-body">
                      <h4>{material.name}</h4>
                      {material.description && (
                        <p className="text-muted">{material.description}</p>
                      )}
                      <div className="settings-card-price">
                        {Number(material.pricePerUnit).toFixed(2)} TND/{material.unit}
                      </div>
                    </div>
                    <div className="settings-card-footer">
                      <span className={`status-dot ${material.isActive ? 'active' : ''}`}></span>
                      {material.isActive ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ShieldCheck size={64} strokeWidth={1} />
                <h3>Aucun matériau maintenance</h3>
                <p>Ajoutez des matériaux maintenance pour les utiliser dans vos devis de service maintenance.</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="settings-content">
            <div className="settings-header">
              <h3>Services fixes</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
              >
                <Plus size={18} />
                Nouveau service
              </button>
            </div>

            {services.length > 0 ? (
              <div className="settings-grid">
                {services.map((service) => (
                  <div key={service.id} className={`settings-card ${!service.isActive ? 'inactive' : ''}`}>
                    <div className="settings-card-header">
                      <div className="settings-card-icon service">
                        <Wrench size={20} />
                      </div>
                      <div className="settings-card-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => {
                            setEditingService(service);
                            setShowServiceModal(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="settings-card-body">
                      <h4>{service.name}</h4>
                      {service.description && (
                        <p className="text-muted">{service.description}</p>
                      )}
                      <div className="settings-card-price">
                        {Number(service.price).toFixed(2)} TND
                      </div>
                    </div>
                    <div className="settings-card-footer">
                      <span className={`status-dot ${service.isActive ? 'active' : ''}`}></span>
                      {service.isActive ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Wrench size={64} strokeWidth={1} />
                <h3>Aucun service</h3>
                <p>Ajoutez des services fixes pour les utiliser dans vos devis.</p>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'materialCategories' && (
          <div className="settings-content">
            <div className="settings-header">
              <h3>Catégories de Matériaux</h3>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
              >
                <Plus size={18} />
                Nouvelle catégorie
              </button>
            </div>

            {categories.length > 0 ? (
              <div className="settings-grid">
                {categories.map((cat) => (
                  <div key={cat.id} className="settings-card">
                    <div className="settings-card-header">
                      <div className="settings-card-icon" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                        <ShieldCheck size={20} />
                      </div>
                      <div className="settings-card-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => {
                            setEditingCategory(cat);
                            setShowCategoryModal(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="settings-card-body">
                      <h4>{cat.name}</h4>
                      <p className="text-muted">
                        {cat._count?.materials || 0} matériaux associés
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ShieldCheck size={64} strokeWidth={1} />
                <h3>Aucune catégorie</h3>
                <p>Organisez vos matériaux en créant des catégories.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showMaterialModal && (
        <MaterialModal
          material={editingMaterial}
          categories={categories}
          onClose={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          onSave={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
        />
      )}

      {showCategoryModal && (
        <MaterialCategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={editingCategory ? handleUpdateCategory : handleCreateCategory}
        />
      )}

      {showMaintenanceMaterialModal && (
        <MaintenanceMaterialModal
          material={editingMaintenanceMaterial}
          onClose={() => {
            setShowMaintenanceMaterialModal(false);
            setEditingMaintenanceMaterial(null);
          }}
          onSave={editingMaintenanceMaterial ? handleUpdateMaintenanceMaterial : handleCreateMaintenanceMaterial}
        />
      )}

      {showServiceModal && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSave={editingService ? handleUpdateService : handleCreateService}
        />
      )}
    </>
  );
}
