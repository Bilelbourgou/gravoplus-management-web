import api from './api';
import type {
    ApiResponse,
    AuthResponse,
    User,
    Client,
    Devis,
    Invoice,
    DashboardStats,
    MachinePricing,
    Material,
    FixedService,
    CreateClientFormData,
    CreateUserFormData,
    CreateDevisFormData,
    AddDevisLineFormData,
    MachineType,
} from '../types';

// ==================== Auth ====================

export const authApi = {
    login: async (username: string, password: string): Promise<AuthResponse> => {
        const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password });
        return res.data.data!;
    },

    me: async (): Promise<User> => {
        const res = await api.get<ApiResponse<User>>('/auth/me');
        return res.data.data!;
    },
};

// ==================== Users ====================

export const usersApi = {
    getAll: async (): Promise<User[]> => {
        const res = await api.get<ApiResponse<User[]>>('/users');
        return res.data.data!;
    },

    create: async (data: CreateUserFormData): Promise<User> => {
        const res = await api.post<ApiResponse<User>>('/users', data);
        return res.data.data!;
    },

    update: async (id: string, data: Partial<CreateUserFormData>): Promise<User> => {
        const res = await api.put<ApiResponse<User>>(`/users/${id}`, data);
        return res.data.data!;
    },

    assignMachines: async (id: string, machines: MachineType[]): Promise<User> => {
        const res = await api.put<ApiResponse<User>>(`/users/${id}/machines`, { machines });
        return res.data.data!;
    },

    deactivate: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};

// ==================== Clients ====================

export const clientsApi = {
    getAll: async (): Promise<Client[]> => {
        const res = await api.get<ApiResponse<Client[]>>('/clients');
        return res.data.data!;
    },

    getById: async (id: string): Promise<Client> => {
        const res = await api.get<ApiResponse<Client>>(`/clients/${id}`);
        return res.data.data!;
    },

    create: async (data: CreateClientFormData): Promise<Client> => {
        const res = await api.post<ApiResponse<Client>>('/clients', data);
        return res.data.data!;
    },

    update: async (id: string, data: Partial<CreateClientFormData>): Promise<Client> => {
        const res = await api.put<ApiResponse<Client>>(`/clients/${id}`, data);
        return res.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/clients/${id}`);
    },
};

// ==================== Devis ====================

export const devisApi = {
    getAll: async (filters?: { clientId?: string; status?: string }): Promise<Devis[]> => {
        const res = await api.get<ApiResponse<Devis[]>>('/devis', { params: filters });
        return res.data.data!;
    },

    getById: async (id: string): Promise<Devis> => {
        const res = await api.get<ApiResponse<Devis>>(`/devis/${id}`);
        return res.data.data!;
    },

    create: async (data: CreateDevisFormData): Promise<Devis> => {
        const res = await api.post<ApiResponse<Devis>>('/devis', data);
        return res.data.data!;
    },

    addLine: async (devisId: string, data: AddDevisLineFormData): Promise<{ line: any; calculation: any }> => {
        const res = await api.post<ApiResponse<{ line: any; calculation: any }>>(`/devis/${devisId}/lines`, data);
        return res.data.data!;
    },

    removeLine: async (devisId: string, lineId: string): Promise<void> => {
        await api.delete(`/devis/${devisId}/lines/${lineId}`);
    },

    addService: async (devisId: string, serviceId: string): Promise<any> => {
        const res = await api.post<ApiResponse<any>>(`/devis/${devisId}/services`, { serviceId });
        return res.data.data!;
    },

    removeService: async (devisId: string, serviceId: string): Promise<void> => {
        await api.delete(`/devis/${devisId}/services/${serviceId}`);
    },

    validate: async (id: string): Promise<Devis> => {
        const res = await api.post<ApiResponse<Devis>>(`/devis/${id}/validate`);
        return res.data.data!;
    },

    cancel: async (id: string): Promise<Devis> => {
        const res = await api.post<ApiResponse<Devis>>(`/devis/${id}/cancel`);
        return res.data.data!;
    },

    updateNotes: async (id: string, notes: string): Promise<Devis> => {
        const res = await api.put<ApiResponse<Devis>>(`/devis/${id}`, { notes });
        return res.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/devis/${id}`);
    },
};

// ==================== Invoices ====================

export const invoicesApi = {
    getAll: async (): Promise<Invoice[]> => {
        const res = await api.get<ApiResponse<Invoice[]>>('/invoices');
        return res.data.data!;
    },

    createFromDevis: async (devisIds: string | string[]): Promise<Invoice> => {
        // Support both single devis and multiple devis
        if (Array.isArray(devisIds)) {
            const res = await api.post<ApiResponse<Invoice>>('/invoices/from-devis', { devisIds });
            return res.data.data!;
        } else {
            // Backward compatible with single devisId
            const res = await api.post<ApiResponse<Invoice>>(`/invoices/from-devis/${devisIds}`);
            return res.data.data!;
        }
    },

    downloadPdf: async (invoiceId: string): Promise<Blob> => {
        const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
        return res.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/invoices/${id}`);
    },
};

// ==================== Machines & Pricing ====================

export const machinesApi = {
    getPricing: async (): Promise<MachinePricing[]> => {
        const res = await api.get<ApiResponse<MachinePricing[]>>('/machines/pricing');
        return res.data.data!;
    },

    updatePricing: async (machineType: MachineType, pricePerUnit: number): Promise<MachinePricing> => {
        const res = await api.put<ApiResponse<MachinePricing>>(`/machines/pricing/${machineType}`, { pricePerUnit });
        return res.data.data!;
    },

    getMyMachines: async (): Promise<MachineType[]> => {
        const res = await api.get<ApiResponse<MachineType[]>>('/machines/my');
        return res.data.data!;
    },
};

// ==================== Materials ====================

export const materialsApi = {
    getAll: async (): Promise<Material[]> => {
        const res = await api.get<ApiResponse<Material[]>>('/materials');
        return res.data.data!;
    },

    create: async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> => {
        const res = await api.post<ApiResponse<Material>>('/materials', data);
        return res.data.data!;
    },

    update: async (id: string, data: Partial<Material>): Promise<Material> => {
        const res = await api.put<ApiResponse<Material>>(`/materials/${id}`, data);
        return res.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/materials/${id}`);
    },
};

// ==================== Fixed Services ====================

export const servicesApi = {
    getAll: async (): Promise<FixedService[]> => {
        const res = await api.get<ApiResponse<FixedService[]>>('/services');
        return res.data.data!;
    },

    create: async (data: Omit<FixedService, 'id' | 'createdAt' | 'updatedAt'>): Promise<FixedService> => {
        const res = await api.post<ApiResponse<FixedService>>('/services', data);
        return res.data.data!;
    },

    update: async (id: string, data: Partial<FixedService>): Promise<FixedService> => {
        const res = await api.put<ApiResponse<FixedService>>(`/services/${id}`, data);
        return res.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/services/${id}`);
    },
};

// ==================== Payments ====================

export const paymentsApi = {
    getByInvoice: async (invoiceId: string) => {
        const res = await api.get<ApiResponse<any[]>>(`/payments/invoice/${invoiceId}`);
        return res.data.data!;
    },

    getStats: async (invoiceId: string) => {
        const res = await api.get<ApiResponse<any>>(`/payments/invoice/${invoiceId}/stats`);
        return res.data.data!;
    },

    create: async (invoiceId: string, data: any) => {
        const res = await api.post<ApiResponse<any>>(`/payments/invoice/${invoiceId}`, data);
        return res.data.data!;
    },

    update: async (paymentId: string, data: any) => {
        const res = await api.put<ApiResponse<any>>(`/payments/${paymentId}`, data);
        return res.data.data!;
    },

    delete: async (paymentId: string) => {
        await api.delete(`/payments/${paymentId}`);
    },
};

// ==================== Dashboard ====================

export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
        return res.data.data!;
    },
};
