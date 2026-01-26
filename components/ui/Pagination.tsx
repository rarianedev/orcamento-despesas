"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-end gap-2">
      <button
        className="h-8 w-8 rounded-full border border-[#E5E7EB] text-xs text-[#6B7280] disabled:opacity-40"
        disabled={currentPage === 1}
      >
        {"<"}
      </button>
      {pages.map((page) => (
        <button
          key={page}
          className={`h-8 w-8 rounded-full text-xs font-semibold ${
            page === currentPage
              ? "bg-[#0B2E6F] text-white"
              : "border border-[#E5E7EB] text-[#4B5563] bg-white"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        className="h-8 w-8 rounded-full border border-[#E5E7EB] text-xs text-[#6B7280] disabled:opacity-40"
        disabled={currentPage === totalPages}
      >
        {">"}
      </button>
    </nav>
  );
}
