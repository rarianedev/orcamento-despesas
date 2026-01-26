import React from "react";

export function TopBar() {
  return (
    <header className="w-full bg-[#0B2E6F] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <button
          aria-label="Abrir menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
        >
          <span className="block h-0.5 w-4 bg-white" />
          <span className="mt-1 block h-0.5 w-4 bg-white" />
          <span className="mt-1 block h-0.5 w-4 bg-white" />
        </button>

        <div className="flex flex-col items-end text-right">
          <span className="text-xs uppercase tracking-[0.2em] text-white/70">
            TEFÊ • Matrículas
          </span>
          <span className="text-sm font-semibold">
            Sistema de Matrículas 2025
          </span>
        </div>
      </div>
    </header>
  );
}
