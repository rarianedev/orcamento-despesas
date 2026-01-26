"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  calculateTotals,
  formatCurrencyInput,
  isValidDate,
  parseDateToNumber,
  sanitizeDate,
  sanitizeText,
  toNumber,
  type Payment,
} from "../lib/finance";

type SortOrder =
  | "vencimento-asc"
  | "vencimento-desc"
  | "valor-asc"
  | "valor-desc"
  | "status-abertos"
  | "status-pagos"
  | "nenhum";

export default function FinanceClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valorFixoId = useId();
  const destinadoId = useId();
  const statusFilterId = useId();
  const sortOrderId = useId();
  const importErrorId = useId();
  const [valorFixo, setValorFixo] = useState("");
  const [destinado, setDestinado] = useState("");
  const [pagamentos, setPagamentos] = useState<Payment[]>([
    { id: "p-1", descricao: "", valor: "", vencimento: "", pago: false },
    { id: "p-2", descricao: "", valor: "", vencimento: "", pago: false },
    { id: "p-3", descricao: "", valor: "", vencimento: "", pago: false },
  ]);
  const [statusFilter, setStatusFilter] = useState<"todos" | "abertos" | "pagos">("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("vencimento-asc");
  const [importError, setImportError] = useState<string | null>(null);

  const storageKey = "finance-state-v1";

  const createPayment = (): Payment => ({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    descricao: "",
    valor: "",
    vencimento: "",
    pago: false,
  });

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const totals = useMemo(
    () => calculateTotals({ valorFixo, destinado, pagamentos }),
    [valorFixo, destinado, pagamentos]
  );

  const normalizeMoneyValue = (value: unknown) => {
    if (typeof value === "number") {
      return formatBRL(value);
    }
    if (typeof value === "string") {
      return formatCurrencyInput(value);
    }
    return "";
  };

  const normalizeTextValue = (value: unknown) =>
    typeof value === "string" ? sanitizeText(value) : "";

  const normalizeDateValue = (value: unknown) =>
    typeof value === "string" ? sanitizeDate(value) : "";

  const normalizePayment = (value: unknown): Payment | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<Payment>;

    return {
      id: typeof record.id === "string" && record.id.trim() ? record.id : createPayment().id,
      descricao: normalizeTextValue(record.descricao),
      valor: normalizeMoneyValue(record.valor),
      vencimento: normalizeDateValue(record.vencimento),
      pago: Boolean(record.pago),
    };
  };

  const normalizeState = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<{
      valorFixo: unknown;
      destinado: unknown;
      pagamentos: unknown;
      statusFilter: unknown;
      sortOrder: unknown;
    }>;

    const nextValorFixo = normalizeMoneyValue(record.valorFixo);
    const nextDestinado = normalizeMoneyValue(record.destinado);

    if (
      typeof record.statusFilter === "string" &&
      !["todos", "abertos", "pagos"].includes(record.statusFilter)
    ) {
      return null;
    }

    if (
      typeof record.sortOrder === "string" &&
      ![
        "vencimento-asc",
        "vencimento-desc",
        "valor-asc",
        "valor-desc",
        "status-abertos",
        "status-pagos",
        "nenhum",
      ].includes(record.sortOrder)
    ) {
      return null;
    }

    if (record.pagamentos !== undefined && !Array.isArray(record.pagamentos)) {
      return null;
    }

    const nextPagamentos =
      Array.isArray(record.pagamentos) && record.pagamentos.length
        ? record.pagamentos
            .map((item) => normalizePayment(item))
            .filter((item): item is Payment => Boolean(item))
        : null;

    return {
      valorFixo: nextValorFixo,
      destinado: nextDestinado,
      pagamentos: nextPagamentos,
      statusFilter:
        typeof record.statusFilter === "string"
          ? (record.statusFilter as "todos" | "abertos" | "pagos")
          : null,
      sortOrder: typeof record.sortOrder === "string" ? (record.sortOrder as SortOrder) : null,
    };
  };

  const handlePagamentoChange = (
    id: string,
    field: "descricao" | "valor" | "vencimento" | "pago",
    value: string | boolean
  ) => {
    const nextValue =
      field === "descricao"
        ? sanitizeText(value as string)
        : field === "valor"
        ? formatCurrencyInput(value as string)
        : field === "vencimento"
        ? sanitizeDate(value as string)
        : value;

    setPagamentos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: nextValue } : item))
    );
  };

  const addPagamento = () => {
    setPagamentos((prev) => [...prev, createPayment()]);
  };

  const removePagamento = (id: string) => {
    setPagamentos((prev) => prev.filter((item) => item.id !== id));
  };

  const visiblePagamentos = useMemo(() => {
    const filtered =
      statusFilter === "todos"
        ? pagamentos
        : pagamentos.filter((item) => (statusFilter === "pagos" ? item.pago : !item.pago));

    if (sortOrder === "nenhum") {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aDate = parseDateToNumber(a.vencimento);
      const bDate = parseDateToNumber(b.vencimento);

      if (aDate === null && bDate === null) return 0;
      if (sortOrder === "vencimento-asc") {
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return aDate - bDate;
      }
      if (sortOrder === "vencimento-desc") {
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return bDate - aDate;
      }

      const aValue = a.valor ? toNumber(a.valor) : null;
      const bValue = b.valor ? toNumber(b.valor) : null;

      if (sortOrder === "valor-asc") {
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return aValue - bValue;
      }

      if (sortOrder === "valor-desc") {
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        return bValue - aValue;
      }

      if (sortOrder === "status-abertos") {
        if (a.pago !== b.pago) {
          return Number(a.pago) - Number(b.pago);
        }
      }

      if (sortOrder === "status-pagos") {
        if (a.pago !== b.pago) {
          return Number(b.pago) - Number(a.pago);
        }
      }

      if (aDate === null && bDate === null) return 0;
      if (aDate === null) return 1;
      if (bDate === null) return -1;

      return aDate - bDate;
    });
  }, [pagamentos, sortOrder, statusFilter]);

  const handleExport = () => {
    const payload = JSON.stringify(
      { valorFixo, destinado, pagamentos, statusFilter, sortOrder },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "financeiro.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const normalized = normalizeState(parsed);

      if (!normalized) {
        setImportError("Arquivo inválido.");
        return;
      }

      setImportError(null);
      setValorFixo(normalized.valorFixo);
      setDestinado(normalized.destinado);
      setStatusFilter(normalized.statusFilter ?? "todos");
      setSortOrder(normalized.sortOrder ?? "vencimento-asc");
      if (Array.isArray(normalized.pagamentos)) {
        setPagamentos(normalized.pagamentos);
      }
    } catch {
      setImportError("Arquivo inválido.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const normalized = normalizeState(parsed);
      if (!normalized) return;

      setValorFixo(normalized.valorFixo);
      setDestinado(normalized.destinado);
      if (Array.isArray(normalized.pagamentos)) {
        setPagamentos(normalized.pagamentos);
      }
      if (normalized.statusFilter) setStatusFilter(normalized.statusFilter);
      if (normalized.sortOrder) setSortOrder(normalized.sortOrder);
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({
      valorFixo,
      destinado,
      pagamentos,
      statusFilter,
      sortOrder,
    });

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, payload);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [valorFixo, destinado, pagamentos, statusFilter, sortOrder]);

  return (
    <main className="finance-screen">
      <section className="finance-card finance-card--top">
        <div className="finance-field">
          <label className="finance-label" htmlFor={valorFixoId}>
            Valor Fixo
          </label>
          <input
            className="finance-input finance-input--control"
            inputMode="decimal"
            placeholder="R$ 00,00"
            value={valorFixo}
            id={valorFixoId}
            onChange={(event) => setValorFixo(formatCurrencyInput(event.target.value))}
          />
        </div>
        <div className="finance-field">
          <label className="finance-label" htmlFor={destinadoId}>
            Destinado ao Cofrinho
          </label>
          <input
            className="finance-input finance-input--control"
            inputMode="decimal"
            placeholder="R$ 00,00"
            value={destinado}
            id={destinadoId}
            onChange={(event) => setDestinado(formatCurrencyInput(event.target.value))}
          />
        </div>
        {/*<div className="finance-add">
          <span className="finance-divider" />
          <button className="finance-add-button" type="button" aria-label="Adicionar">
            +
          </button>
          <span className="finance-divider" />
        </div>*/}
      </section>

      <section className="finance-layout">
        <div className="finance-card finance-card--payments">
          {importError && (
            <div className="finance-banner finance-banner--error" role="alert" aria-live="polite">
              <span id={importErrorId}>{importError}</span>
              <button
                className="finance-banner-close"
                type="button"
                aria-label="Fechar alerta"
                onClick={() => setImportError(null)}
              >
                ×
              </button>
            </div>
          )}
          <div className="finance-controls">
            <div className="finance-control">
              <label className="finance-control-label" htmlFor={statusFilterId}>
                Filtro
              </label>
              <select
                className="finance-select"
                id={statusFilterId}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "todos" | "abertos" | "pagos")
                }
              >
                <option value="todos">Todos</option>
                <option value="abertos">Abertos</option>
                <option value="pagos">Pagos</option>
              </select>
            </div>
            <div className="finance-control">
              <label className="finance-control-label" htmlFor={sortOrderId}>
                Ordenar
              </label>
              <select
                className="finance-select"
                value={sortOrder}
                id={sortOrderId}
                onChange={(event) =>
                  setSortOrder(event.target.value as SortOrder)
                }
              >
                <option value="vencimento-asc">Vencimento ↑</option>
                <option value="vencimento-desc">Vencimento ↓</option>
                <option value="valor-asc">Valor ↑</option>
                <option value="valor-desc">Valor ↓</option>
                <option value="status-abertos">Status (Abertos)</option>
                <option value="status-pagos">Status (Pagos)</option>
                <option value="nenhum">Sem ordem</option>
              </select>
            </div>
            <div className="finance-control-actions">
              <button
                className="finance-secondary-button"
                type="button"
                onClick={handleExport}
              >
                Exportar JSON
              </button>
              <button
                className="finance-secondary-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Importar JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={(event) => handleImport(event.target.files?.[0])}
                className="finance-file-input"
              />
            </div>
          </div>
          <div className="finance-table-head">
            <span>Pagamentos</span>
            <span>Valor</span>
            <span>Vencimento</span>
            <span>Pago</span>
            <span className="finance-table-action" aria-hidden="true" />
          </div>
          {visiblePagamentos.map((pagamento) => (
            <div className="finance-row" key={pagamento.id}>
              <label className="sr-only" htmlFor={`descricao-${pagamento.id}`}>
                Descrição do pagamento
              </label>
              <input
                className="finance-input finance-input--wide finance-input--control"
                placeholder="descrição"
                value={pagamento.descricao}
                id={`descricao-${pagamento.id}`}
                onChange={(event) =>
                  handlePagamentoChange(pagamento.id, "descricao", event.target.value)
                }
              />
              <label className="sr-only" htmlFor={`valor-${pagamento.id}`}>
                Valor do pagamento
              </label>
              <input
                className="finance-input finance-input--medium finance-input--control"
                inputMode="decimal"
                placeholder="R$ 00,00"
                value={pagamento.valor}
                id={`valor-${pagamento.id}`}
                onChange={(event) =>
                  handlePagamentoChange(pagamento.id, "valor", event.target.value)
                }
              />
              <div className="finance-date-field">
                <label className="sr-only" htmlFor={`vencimento-${pagamento.id}`}>
                  Vencimento
                </label>
                <input
                  className={`finance-input finance-input--medium finance-input--control ${
                    pagamento.vencimento.length === 10 && !isValidDate(pagamento.vencimento)
                      ? "finance-input--invalid"
                      : ""
                  }`}
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  pattern="\\d{2}/\\d{2}/\\d{4}"
                  value={pagamento.vencimento}
                  id={`vencimento-${pagamento.id}`}
                  aria-invalid={
                    pagamento.vencimento.length === 10 && !isValidDate(pagamento.vencimento)
                  }
                  aria-describedby={
                    pagamento.vencimento.length === 10 && !isValidDate(pagamento.vencimento)
                      ? `vencimento-hint-${pagamento.id}`
                      : undefined
                  }
                  title={
                    pagamento.vencimento.length === 10 && !isValidDate(pagamento.vencimento)
                      ? "Data inválida"
                      : undefined
                  }
                  onChange={(event) =>
                    handlePagamentoChange(pagamento.id, "vencimento", event.target.value)
                  }
                />
                {pagamento.vencimento.length === 10 && !isValidDate(pagamento.vencimento) && (
                  <span
                    className="finance-date-hint"
                    id={`vencimento-hint-${pagamento.id}`}
                    role="status"
                    aria-live="polite"
                  >
                    Data inválida
                  </span>
                )}
              </div>
              <button
                className={`finance-paid-button ${
                  pagamento.pago ? "finance-paid-button--active" : ""
                }`}
                type="button"
                aria-pressed={pagamento.pago}
                onClick={() => handlePagamentoChange(pagamento.id, "pago", !pagamento.pago)}
              >
                {pagamento.pago ? "Pago" : "Aberto"}
              </button>
              <button
                className="finance-remove-button"
                type="button"
                aria-label="Remover pagamento"
                onClick={() => removePagamento(pagamento.id)}
              >
                −
              </button>
            </div>
          ))}
          <div className="finance-footer">
            <span className="finance-underline" />
            <button
              className="finance-add-button"
              type="button"
              aria-label="Adicionar pagamento"
              onClick={addPagamento}
            >
              +
            </button>
            <span className="finance-underline" />
          </div>
        </div>

        <aside className="finance-side">
          <div className="finance-card finance-card--summary">
            <span className="finance-label">Valor Utilizável</span>
            <div className="finance-input finance-input--summary">
              {formatBRL(totals.valorUtilizavel)}
            </div>
          </div>
          <div className="finance-card finance-card--summary">
            <span className="finance-label">Restanto ao Cofrinho</span>
            <div className="finance-input finance-input--summary">
              {formatBRL(totals.restanteCofrinho)}
            </div>
          </div>
          <div className="finance-card finance-card--summary">
            <span className="finance-label">Previsão (Pagamentos Abertos)</span>
            <div className="finance-input finance-input--summary">
              {formatBRL(totals.totalAbertos)}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
