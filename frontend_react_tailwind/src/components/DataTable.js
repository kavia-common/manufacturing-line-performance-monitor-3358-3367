import React from "react";

// PUBLIC_INTERFACE
export default function DataTable({ columns, rows, rowKey = "id" }) {
  /** Simple responsive table with columns [{key,label,render?}] */
  return (
    <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
      <table className="min-w-full bg-white text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r[rowKey]} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-slate-700">
                  {c.render ? c.render(r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-slate-500" colSpan={columns.length}>
                No data
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
