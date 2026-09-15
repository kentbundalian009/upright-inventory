import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function TablePagination({
  currentPage = 1,
  setCurrentPage,
  rowsPerPage = 10,
  setRowsPerPage,
  totalRows = 0,
  options = [5, 10, 20, 50, 100]
}) {
  const { isDark } = useTheme();

  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t ${
        isDark ? 'bg-[#0f111d] border-slate-800/80 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'
      } text-xs font-semibold select-none`}
    >
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            if (setRowsPerPage) setRowsPerPage(Number(e.target.value));
            if (setCurrentPage) setCurrentPage(1);
          }}
          className={`border rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer outline-none transition-colors ${
            isDark
              ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
              : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
          }`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="text-slate-400 dark:text-slate-500 ml-1">
          {totalRows > 0
            ? `(${indexOfFirstRow + 1}-${Math.min(indexOfLastRow, totalRows)} of ${totalRows})`
            : '(0 items)'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-700 dark:text-slate-200">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            title="Previous Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-700 bg-[#141622] text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            title="Next Page"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-700 bg-[#141622] text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
