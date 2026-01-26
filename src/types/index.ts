// API Types matching backend responses

export type UserRole = 'ADMIN' | 'EMPLOYEE';
export type MachineType = 'CNC' | 'LASER' | 'CHAMPS' | 'PANNEAUX';
export type DevisStatus = 'DRAFT' | 'VALIDATED' | 'INVOICED' | 'CANCELLED';

export interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    allowedMachines?: UserMachine[];
}

export interface UserMachine {
    id: string;
    userId: string;
    machine: MachineType;
}

export interface Client {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MachinePricing {
    id: string;
    machineType: MachineType;
    pricePerUnit: number;
    description?: string;
    updatedAt: string;
}

export interface Material {
    id: string;
    name: string;
    pricePerUnit: number;
    unit: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FixedService {
    id: string;
    name: string;
    price: number;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Devis {
    id: string;
    reference: string;
    status: DevisStatus;
    totalAmount: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    validatedAt?: string;
    clientId: string;
    client: Client;
    createdById: string;
    createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
    lines: DevisLine[];
    services: DevisServiceItem[];
    invoiceId?: string;
    invoice?: Invoice;
}

export interface DevisLine {
    id: string;
    machineType: MachineType;
    description?: string;
    minutes?: number;
    meters?: number;
    quantity?: number;
    unitPrice: number;
    materialCost: number;
    lineTotal: number;
    createdAt: string;
    materialId?: string;
    material?: Material;
}

export interface DevisServiceItem {
    id: string;
    price: number;
    serviceId: string;
    service: FixedService;
}

export interface Invoice {
    id: string;
    reference: string;
    totalAmount: number;
    pdfUrl?: string;
    createdAt: string;
    clientId: string;
    client?: Client;
    devis?: Devis[];
}

export interface Payment {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    invoiceId: string;
}

export interface PaymentStats {
    invoiceId: string;
    invoiceReference: string;
    totalAmount: number;
    totalPaid: number;
    remaining: number;
    percentPaid: number;
    paymentCount: number;
    isPaid: boolean;
}

export interface CreatePaymentFormData {
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
}

export interface DashboardStats {
    totalClients: number;
    totalDevis: number;
    totalInvoices: number;
    totalRevenue: number;
    devisByStatus: {
        draft: number;
        validated: number;
        invoiced: number;
        cancelled: number;
    };
    recentDevis: {
        id: string;
        reference: string;
        clientName: string;
        totalAmount: number;
        status: DevisStatus;
        createdAt: string;
    }[];
    monthlyRevenue: {
        month: string;
        revenue: number;
    }[];
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Form types
export interface LoginFormData {
    username: string;
    password: string;
}

export interface CreateUserFormData {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    allowedMachines?: MachineType[];
}

export interface CreateClientFormData {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
}

export interface CreateDevisFormData {
    clientId: string;
    notes?: string;
}

export interface AddDevisLineFormData {
    machineType: MachineType;
    description?: string;
    minutes?: number;
    meters?: number;
    quantity?: number;
    materialId?: string;
}

export interface ClientBalancePayment {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
}

export interface ClientBalanceInvoice {
    id: string;
    reference: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    createdAt: string;
    devisCount: number;
    payments: ClientBalancePayment[];
}

export interface ClientBalancePendingDevis {
    id: string;
    reference: string;
    status: string;
    totalAmount: number;
    createdAt: string;
}

export interface ClientBalanceData {
    client: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    summary: {
        totalInvoiced: number;
        totalPaid: number;
        outstandingBalance: number;
        pendingDevisTotal: number;
        pendingDevisCount: number;
    };
    invoices: ClientBalanceInvoice[];
    pendingDevis: ClientBalancePendingDevis[];
}
