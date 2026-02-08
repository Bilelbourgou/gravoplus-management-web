
import api from './api';

export interface FinancialStats {
    periodStart: string | null;
    periodEnd: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    scope?: string; // "ADMIN_LEVEL" | "EMPLOYEE_LEVEL"
    lastClosureDate: string | null;
    payments: Array<{
        id: string;
        amount: number;
        paymentMethod: string;
        paymentDate: string;
        reference: string;
        invoice: {
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

export const financialService = {
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
