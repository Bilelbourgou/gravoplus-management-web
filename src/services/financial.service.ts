
import api from './api';
import type { ApiResponse, Devis } from '../types';

export interface CaisseDevis extends Devis {
    createdBy: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
    };
    payments: Array<{
        id: string;
        amount: number;
        paymentDate: string;
        paymentMethod?: string;
        reference?: string;
        createdBy?: { firstName: string; lastName: string };
    }>;
}

export interface FinancialStats {
    periodStart: string | null;
    periodEnd: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    scope?: string;
    lastClosureDate: string | null;
    payments: Array<{
        id: string;
        amount: number;
        paymentMethod: string;
        paymentDate: string;
        reference: string;
        description?: string;
        invoice?: {
            reference: string;
            client: { name: string };
        };
        devis?: {
            reference: string;
            client: { name: string };
        };
        createdBy?: {
            firstName: string;
            lastName: string;
        };
    }>;
    expenses: Array<{
        id: string;
        amount: number;
        description: string;
        category: string;
        date: string;
        reference: string;
        createdBy: { firstName: string; lastName: string };
    }>;
    revenueByEmployee: Array<{
        employeeId: string;
        employeeName: string;
        totalAmount: number;
        paymentCount: number;
    }>;
}

export interface FinancialClosure {
    id: string;
    closureDate: string;
    periodStart: string;
    periodEnd: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    scope?: string;
    notes?: string;
    createdBy: {
        firstName: string;
        lastName: string;
    };
}

export interface CreateCaissePaymentData {
    amount: number;
    devisId?: string;
    description?: string;
    paymentDate?: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
}

export const financialService = {
    getCaisseDevis: async (): Promise<CaisseDevis[]> => {
        const response = await api.get<ApiResponse<CaisseDevis[]>>('/financial/caisse');
        return response.data.data!;
    },

    createCaissePayment: async (data: CreateCaissePaymentData) => {
        const response = await api.post<ApiResponse<any>>('/payments/caisse', data);
        return response.data.data!;
    },

    getStats: async (): Promise<FinancialStats> => {
        const response = await api.get('/financial/stats');
        return response.data;
    },

    createClosure: async (notes?: string): Promise<FinancialClosure> => {
        const response = await api.post('/financial/close', { notes });
        return response.data;
    },

    getHistory: async (): Promise<FinancialClosure[]> => {
        const response = await api.get('/financial/history');
        return response.data;
    },
};
