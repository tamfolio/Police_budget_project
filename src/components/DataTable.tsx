import { X, Pencil } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { _id: string }> {
  columns: Column<T>[];
  data: T[];
  onDelete?: (id: string) => void;
  onEdit?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { _id: string }>({ columns, data, onDelete, onEdit, emptyMessage = "No entries yet. Use the input form above to add data." }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[#F7F8FA] border-b-2 border-border">
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground font-sans whitespace-nowrap">
                {col.label}
              </th>
            ))}
            {(onDelete || onEdit) && <th className="px-3 py-2.5 w-16" />}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id} className={i % 2 === 0 ? 'bg-card' : 'bg-[#FAFBFC]'}>
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2 text-[12.5px] font-sans whitespace-nowrap">
                  {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                </td>
              ))}
              {(onDelete || onEdit) && (
                <td className="px-2 py-2 flex items-center gap-1">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row._id)} className="text-destructive hover:text-destructive/80 transition-colors" title="Delete">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
