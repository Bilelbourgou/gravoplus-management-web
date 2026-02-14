import * as XLSX from 'xlsx';

interface ColumnDef<T> {
    header: string;
    accessor: (row: T) => string | number;
}

export function exportToExcel<T>(
    data: T[],
    columns: ColumnDef<T>[],
    filename: string
) {
    const headers = columns.map((c) => c.header);
    const rows = data.map((row) => columns.map((c) => c.accessor(row)));

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-size columns
    ws['!cols'] = columns.map((_, i) => {
        const maxLen = Math.max(
            headers[i].length,
            ...rows.map((r) => String(r[i] ?? '').length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
