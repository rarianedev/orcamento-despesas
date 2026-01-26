"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateTotals,
  isValidDate,
  parseDateToNumber,
  sanitizeDate,
  sanitizeMoney,
  sanitizeText,
  type Payment,
} from "../lib/finance";

export default function FinanceClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [valorFixo, setValorFixo] = useState("");
  const [destinado, setDestinado] = useState("");
  const [pagamentos, setPagamentos] = useState<Payment[]>([
    { id: "p-1", descricao: "", valor: "", vencimento: "", pago: false },
    { id: "p-2", descricao: "", valor: "", vencimento: "", pago: false },
    { id: "p-3", descricao: "", valor: "", vencimento: "", pago: false },
  ]);
  const [statusFilter, setStatusFilter] = useState<"todos" | "abertos" | "pagos">(
    "todos"
  );
  const [sortOrder, setSortOrder] = useState<"vencimento-asc" | "vencimento-desc" | "nenhum">(
    "vencimento-asc"
  );

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

  const handlePagamentoChange = (
    id: string,
    field: "descricao" | "valor" | "vencimento" | "pago",
    value: string | boolean
  ) => {
    const nextValue =
      field === "descricao"
        ? sanitizeText(value as string)
        : field === "valor"
        ? sanitizeMoney(value as string)
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

  const handleDateBlur = (id: string, value: string) => {
    if (value.length === 10 && !isValidDate(value)) {
      handlePagamentoChange(id, "vencimento", "");
    }
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
      if (aDate === null) return 1;
      if (bDate === null) return -1;

      return sortOrder === "vencimento-asc" ? aDate - bDate : bDate - aDate;
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
      const parsed = JSON.parse(text) as Partial<{
        valorFixo: string;
        destinado: string;
        pagamentos: Payment[];
        statusFilter: "todos" | "abertos" | "pagos";
        sortOrder: "vencimento-asc" | "vencimento-desc" | "nenhum";
      }>;

      setValorFixo(parsed.valorFixo ?? "");
      setDestinado(parsed.destinado ?? "");
      setStatusFilter(parsed.statusFilter ?? "todos");
      setSortOrder(parsed.sortOrder ?? "vencimento-asc");
      if (Array.isArray(parsed.pagamentos)) {
        const normalized = parsed.pagamentos.map((item) => ({
          id: item.id ?? createPayment().id,
          descricao: item.descricao ?? "",
          valor: item.valor ?? "",
          vencimento: item.vencimento ?? "",
          pago: Boolean(item.pago),
        }));
        setPagamentos(normalized);
      }
    } catch {
      // ignore malformed import
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<{
        valorFixo: string;
        destinado: string;
        pagamentos: Payment[];
        statusFilter: "todos" | "abertos" | "pagos";
        sortOrder: "vencimento-asc" | "vencimento-desc" | "nenhum";
      }>;
      if (parsed.valorFixo !== undefined) setValorFixo(parsed.valorFixo);
      if (parsed.destinado !== undefined) setDestinado(parsed.destinado);
      if (Array.isArray(parsed.pagamentos)) {
        setPagamentos(
          parsed.pagamentos.map((item) => ({
            id: item.id ?? createPayment().id,
            descricao: item.descricao ?? "",
            valor: item.valor ?? "",
            vencimento: item.vencimento ?? "",
            pago: Boolean(item.pago),
          }))
        );
      }
      if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
      if (parsed.sortOrder) setSortOrder(parsed.sortOrder);
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
    localStorage.setItem(storageKey, payload);
  }, [valorFixo, destinado, pagamentos, statusFilter, sortOrder]);

  return (
    <main className="finance-screen">
      <section className="finance-card finance-card--top">
        <div className="finance-field">
          <span className="finance-label">Valor Fixo</span>
          <input
            className="finance-input finance-input--control"
            inputMode="decimal"
            placeholder="R$ 00,00"
            value={valorFixo}
            onChange={(event) => setValorFixo(sanitizeMoney(event.target.value))}
          />
        </div>
        <div className="finance-field">
          <span className="finance-label">Destinado ao Cofrinho</span>
          <input
            className="finance-input finance-input--control"
            inputMode="decimal"
            placeholder="R$ 00,00"
            value={destinado}
            onChange={(event) => setDestinado(sanitizeMoney(event.target.value))}
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
          <div className="finance-controls">
            <div className="finance-control">
              <span className="finance-control-label">Filtro</span>
              <select
                className="finance-select"
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
              <span className="finance-control-label">Ordenar</span>
              <select
                className="finance-select"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target.value as "vencimento-asc" | "vencimento-desc" | "nenhum"
                  )
                }
              >
                <option value="vencimento-asc">Vencimento ↑</option>
                <option value="vencimento-desc">Vencimento ↓</option>
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
              <input
                className="finance-input finance-input--wide finance-input--control"
                placeholder="descrição"
                value={pagamento.descricao}
                onChange={(event) =>
                  handlePagamentoChange(pagamento.id, "descricao", event.target.value)
                }
              />
              <input
                className="finance-input finance-input--medium finance-input--control"
                inputMode="decimal"
                placeholder="R$ 00,00"
                value={pagamento.valor}
                onChange={(event) =>
                  handlePagamentoChange(pagamento.id, "valor", event.target.value)
                }
              />
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
                onChange={(event) =>
                  handlePagamentoChange(pagamento.id, "vencimento", event.target.value)
                }
                onBlur={(event) => handleDateBlur(pagamento.id, event.target.value)}
              />
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
