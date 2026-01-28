"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Filter,
  PiggyBank,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import FinanceHeader from "../components/header";
import {
  calculateTotals,
  formatCurrencyInput,
  isValidDate,
  parseDateToNumber,
  sanitizeDate,
  sanitizeText,
  toNumber,
  type CofrinhoConfig,
  type FinanceMonth,
  type FinanceStore,
  type MonthKey,
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
  const rendaExtraId = useId();
  const destinadoId = useId();
  const statusFilterId = useId();
  const sortOrderId = useId();
  const importErrorId = useId();
  const storageKey = "finance-state-v1";
  const storeVersion = 2;
  const [store, setStore] = useState<FinanceStore>(() => createEmptyStore());
  const [statusFilter, setStatusFilter] = useState<"todos" | "abertos" | "pagos">("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("vencimento-asc");
  const [importError, setImportError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  function createPayment(): Payment {
    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descricao: "",
      valor: "",
      vencimento: "",
      pago: false,
    };
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function getCurrentMonthKey(): MonthKey {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}` as MonthKey;
  }

  function parseMonthKey(key: MonthKey) {
    const [yearStr, monthStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return null;
    return { year, month };
  }

  const monthLabels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  function formatMonthLabel(key: MonthKey) {
    const parsed = parseMonthKey(key);
    if (!parsed) return key;
    return `${monthLabels[parsed.month - 1]}/${parsed.year}`;
  }

  function getNextMonthKey(key: MonthKey): MonthKey {
    const parsed = parseMonthKey(key);
    if (!parsed) return getCurrentMonthKey();
    const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
    const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}` as MonthKey;
  }

  function createEmptyMonth(key: MonthKey): FinanceMonth {
    const now = nowISO();
    return {
      competence: key,
      valorFixo: "",
      rendaExtra: "",
      cofrinho: null,
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function createMonthFromPrevious(key: MonthKey, previous: FinanceMonth): FinanceMonth {
    const now = nowISO();
    const recurringPayments = previous.payments
      .filter((payment) => payment.recorrente)
      .map((payment) => ({
        ...payment,
        id: createPayment().id,
      }));

    return {
      competence: key,
      valorFixo: previous.valorFixo,
      rendaExtra: formatCurrencyInput("0"),
      cofrinho: previous.cofrinho ? { ...previous.cofrinho } : null,
      payments: recurringPayments,
      createdAt: now,
      updatedAt: now,
    };
  }

  function createEmptyStore(): FinanceStore {
    const key = getCurrentMonthKey();
    return {
      version: storeVersion,
      selectedMonth: key,
      months: {
        [key]: createEmptyMonth(key),
      },
    };
  }

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const selectedMonth = store.selectedMonth;
  const selectedMonthData = useMemo(
    () => store.months[selectedMonth] ?? createEmptyMonth(selectedMonth),
    [store.months, selectedMonth]
  );

  const valorFixo = selectedMonthData.valorFixo;
  const rendaExtra = selectedMonthData.rendaExtra;
  const destinado = selectedMonthData.cofrinho?.value ?? "";
  const pagamentos = selectedMonthData.payments;

  const totals = useMemo(
    () =>
      calculateTotals({
        valorFixo,
        rendaExtra,
        cofrinho: selectedMonthData.cofrinho,
        pagamentos,
      }),
    [pagamentos, rendaExtra, selectedMonthData.cofrinho, valorFixo]
  );

  const filterOptions = useMemo(
    () => [
      { value: "todos", label: "Todos" },
      { value: "pagos", label: "Pagos" },
      { value: "abertos", label: "Abertos" },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: "vencimento-asc", label: "Vencimento" },
      { value: "vencimento-desc", label: "Vencimento ↓" },
      { value: "valor-asc", label: "Valor ↑" },
      { value: "valor-desc", label: "Valor ↓" },
      { value: "status-abertos", label: "Status (Abertos)" },
      { value: "status-pagos", label: "Status (Pagos)" },
      { value: "nenhum", label: "Sem ordem" },
    ],
    []
  );

  const getLabel = (value: string, options: { value: string; label: string }[]) =>
    options.find((option) => option.value === value)?.label ?? "";

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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
      recorrente: Boolean(record.recorrente),
    };
  };

  const normalizeCofrinho = (value: unknown): CofrinhoConfig | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<CofrinhoConfig>;
    const enabled = Boolean(record.enabled);
    const normalizedValue = normalizeMoneyValue(record.value);
    const normalizedGoal =
      record.goal !== undefined ? normalizeMoneyValue(record.goal) : undefined;

    if (!enabled && !normalizedValue && !normalizedGoal) return null;

    return {
      enabled,
      value: normalizedValue,
      ...(normalizedGoal ? { goal: normalizedGoal } : {}),
    };
  };

  const isMonthKey = (value: unknown): value is MonthKey =>
    typeof value === "string" && /^\d{4}-\d{2}$/.test(value);

  const normalizeMonth = (key: MonthKey, value: unknown): FinanceMonth | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<
      FinanceMonth & {
        pagamentos?: unknown;
        destinado?: unknown;
      }
    >;

    const paymentsValue = Array.isArray(record.payments)
      ? record.payments
      : Array.isArray(record.pagamentos)
      ? record.pagamentos
      : [];

    const normalizedPayments = Array.isArray(paymentsValue)
      ? paymentsValue
          .map((item) => normalizePayment(item))
          .filter((item): item is Payment => Boolean(item))
      : [];

    const normalizedCofrinho =
      record.cofrinho !== undefined
        ? normalizeCofrinho(record.cofrinho)
        : record.destinado !== undefined
        ? {
            enabled: true,
            value: normalizeMoneyValue(record.destinado),
          }
        : null;

    const now = nowISO();
    return {
      competence: isMonthKey(record.competence) ? record.competence : key,
      valorFixo: normalizeMoneyValue(record.valorFixo),
      rendaExtra: normalizeMoneyValue(record.rendaExtra),
      cofrinho: normalizedCofrinho,
      payments: normalizedPayments,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    };
  };

  const isValidStatusFilter = (
    value: unknown
  ): value is "todos" | "abertos" | "pagos" =>
    typeof value === "string" && ["todos", "abertos", "pagos"].includes(value);

  const isValidSortOrder = (value: unknown): value is SortOrder =>
    typeof value === "string" &&
    [
      "vencimento-asc",
      "vencimento-desc",
      "valor-asc",
      "valor-desc",
      "status-abertos",
      "status-pagos",
      "nenhum",
    ].includes(value);

  const normalizeLegacyState = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<{
      valorFixo: unknown;
      destinado: unknown;
      pagamentos: unknown;
      statusFilter: unknown;
      sortOrder: unknown;
      rendaExtra: unknown;
    }>;

    const nextValorFixo = normalizeMoneyValue(record.valorFixo);
    const nextDestinado = normalizeMoneyValue(record.destinado);
    const nextRendaExtra = normalizeMoneyValue(record.rendaExtra);

    if (record.statusFilter !== undefined && !isValidStatusFilter(record.statusFilter)) {
      return null;
    }

    if (record.sortOrder !== undefined && !isValidSortOrder(record.sortOrder)) {
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
      rendaExtra: nextRendaExtra,
      destinado: nextDestinado,
      pagamentos: nextPagamentos,
      statusFilter:
        typeof record.statusFilter === "string" && isValidStatusFilter(record.statusFilter)
          ? record.statusFilter
          : null,
      sortOrder:
        typeof record.sortOrder === "string" && isValidSortOrder(record.sortOrder)
          ? record.sortOrder
          : null,
    };
  };

  const normalizeStore = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<
      FinanceStore & {
        statusFilter?: unknown;
        sortOrder?: unknown;
      }
    >;

    if (record.months && typeof record.months === "object") {
      const monthsRecord = record.months as Record<string, unknown>;
      const months: Record<MonthKey, FinanceMonth> = {};

      Object.entries(monthsRecord).forEach(([key, monthValue]) => {
        if (!isMonthKey(key)) return;
        const normalizedMonth = normalizeMonth(key as MonthKey, monthValue);
        if (normalizedMonth) {
          months[key as MonthKey] = normalizedMonth;
        }
      });

      const keys = Object.keys(months).sort() as MonthKey[];
      const fallbackKey = getCurrentMonthKey();
      const selected = isMonthKey(record.selectedMonth)
        ? (record.selectedMonth as MonthKey)
        : keys.length
        ? keys[keys.length - 1]
        : fallbackKey;

      if (!months[selected]) {
        months[selected] = createEmptyMonth(selected);
      }

      return {
        store: {
          version: storeVersion,
          selectedMonth: selected,
          months,
        },
        statusFilter:
          typeof record.statusFilter === "string" && isValidStatusFilter(record.statusFilter)
            ? record.statusFilter
            : null,
        sortOrder:
          typeof record.sortOrder === "string" && isValidSortOrder(record.sortOrder)
            ? record.sortOrder
            : null,
      };
    }

    const legacy = normalizeLegacyState(value);
    if (!legacy) return null;

    const key = getCurrentMonthKey();
    const month = createEmptyMonth(key);
    const cofrinho =
      legacy.destinado || legacy.destinado === ""
        ? ({ enabled: true, value: legacy.destinado } as CofrinhoConfig)
        : null;

    return {
      store: {
        version: storeVersion,
        selectedMonth: key,
        months: {
          [key]: {
            ...month,
            valorFixo: legacy.valorFixo,
            rendaExtra: legacy.rendaExtra ?? "",
            cofrinho,
            payments: legacy.pagamentos ?? [],
          },
        },
      },
      statusFilter: legacy.statusFilter,
      sortOrder: legacy.sortOrder,
    };
  };

  const updateSelectedMonth = (updater: (month: FinanceMonth) => FinanceMonth) => {
    setStore((prev) => {
      const selected = prev.selectedMonth;
      const base = prev.months[selected] ?? createEmptyMonth(selected);
      const nextMonth = updater(base);
      return {
        ...prev,
        months: {
          ...prev.months,
          [selected]: {
            ...nextMonth,
            updatedAt: nowISO(),
          },
        },
      };
    });
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

    updateSelectedMonth((month) => ({
      ...month,
      payments: month.payments.map((item) =>
        item.id === id ? { ...item, [field]: nextValue } : item
      ),
    }));
  };

  const addPagamento = () => {
    updateSelectedMonth((month) => ({
      ...month,
      payments: [...month.payments, createPayment()],
    }));
  };

  const removePagamento = (id: string) => {
    updateSelectedMonth((month) => ({
      ...month,
      payments: month.payments.filter((item) => item.id !== id),
    }));
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

  const monthKeys = useMemo(
    () => (Object.keys(store.months).sort() as MonthKey[]),
    [store.months]
  );
  const selectedMonthIndex = monthKeys.indexOf(selectedMonth);
  const prevMonth = selectedMonthIndex > 0 ? monthKeys[selectedMonthIndex - 1] : null;
  const nextMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < monthKeys.length - 1
      ? monthKeys[selectedMonthIndex + 1]
      : null;

  const handleSelectMonth = (key: MonthKey) => {
    setStore((prev) => ({
      ...prev,
      selectedMonth: key,
    }));
  };

  const handleAddMonth = () => {
    setStore((prev) => {
      const keys = (Object.keys(prev.months).sort() as MonthKey[]);
      const latestKey = keys.length ? keys[keys.length - 1] : getCurrentMonthKey();
      let nextKey = getNextMonthKey(latestKey);
      while (prev.months[nextKey]) {
        nextKey = getNextMonthKey(nextKey);
      }
      const baseMonth = prev.months[latestKey] ?? createEmptyMonth(latestKey);
      const newMonth = createMonthFromPrevious(nextKey, baseMonth);
      return {
        ...prev,
        selectedMonth: nextKey,
        months: {
          ...prev.months,
          [nextKey]: newMonth,
        },
      };
    });
  };

  const handleValorFixoChange = (value: string) => {
    updateSelectedMonth((month) => ({
      ...month,
      valorFixo: formatCurrencyInput(value),
    }));
  };

  const handleRendaExtraChange = (value: string) => {
    updateSelectedMonth((month) => ({
      ...month,
      rendaExtra: formatCurrencyInput(value),
    }));
  };

  const handleCofrinhoChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    updateSelectedMonth((month) => {
      if (!formatted && !month.cofrinho?.goal) {
        return { ...month, cofrinho: null };
      }
      return {
        ...month,
        cofrinho: {
          enabled: true,
          value: formatted,
          goal: month.cofrinho?.goal,
        },
      };
    });
  };

  const handleExport = () => {
    const payload = JSON.stringify(
      { ...store, statusFilter, sortOrder },
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
      const normalized = normalizeStore(parsed);

      if (!normalized) {
        setImportError("Arquivo inválido.");
        return;
      }

      setImportError(null);
      setStore((prev) => ({
        ...prev,
        version: storeVersion,
        selectedMonth: normalized.store.selectedMonth,
        months: {
          ...prev.months,
          ...normalized.store.months,
        },
      }));
      setStatusFilter(normalized.statusFilter ?? "todos");
      setSortOrder(normalized.sortOrder ?? "vencimento-asc");
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
      const normalized = normalizeStore(parsed);
      if (!normalized) return;

      setStore(normalized.store);
      if (normalized.statusFilter) setStatusFilter(normalized.statusFilter);
      if (normalized.sortOrder) setSortOrder(normalized.sortOrder);
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    if (!store.months[store.selectedMonth]) {
      setStore((prev) => ({
        ...prev,
        months: {
          ...prev.months,
          [prev.selectedMonth]: createEmptyMonth(prev.selectedMonth),
        },
      }));
      return;
    }

    const payload = JSON.stringify({
      ...store,
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
  }, [statusFilter, sortOrder, store]);

  return (
    <main className="finance-screen">
      <FinanceHeader />
      <div className="finance-content">
        <section className="finance-monthbar">
          <div className="finance-monthbar-group">
            <button
              className="finance-month-nav"
              type="button"
              onClick={() => prevMonth && handleSelectMonth(prevMonth)}
              disabled={!prevMonth}
              aria-label="Mês anterior"
            >
              ←
            </button>
            <div className="finance-month-select">
              <label className="sr-only" htmlFor="month-select">
                Competência
              </label>
              <select
                id="month-select"
                className="finance-select"
                value={selectedMonth}
                onChange={(event) => handleSelectMonth(event.target.value as MonthKey)}
              >
                {monthKeys.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthLabel(key)}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="finance-month-nav"
              type="button"
              onClick={() => nextMonth && handleSelectMonth(nextMonth)}
              disabled={!nextMonth}
              aria-label="Próximo mês"
            >
              →
            </button>
          </div>
          <span className="finance-monthbar-current">
            Mês selecionado: {formatMonthLabel(selectedMonth)}
          </span>
          <button className="finance-primary-button" type="button" onClick={handleAddMonth}>
            + Adicionar mês
          </button>
        </section>
        <section className="finance-cards finance-cards--three">
          <div className="finance-card finance-card--hero">
            <div className="finance-card-head">
              <div className="finance-card-icon">
                <Wallet size={18} aria-hidden="true" />
              </div>
              <label className="finance-card-title" htmlFor={valorFixoId}>
                Valor Fixo Mensal
              </label>
            </div>
            <input
              className="finance-card-input"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={valorFixo}
              id={valorFixoId}
              onChange={(event) => handleValorFixoChange(event.target.value)}
            />
            <span className="finance-card-helper">Sua renda mensal</span>
          </div>

          <div className="finance-card finance-card--hero">
            <div className="finance-card-head">
              <div className="finance-card-icon finance-card-icon--accent">
                <TrendingUp size={18} aria-hidden="true" />
              </div>
              <label className="finance-card-title" htmlFor={rendaExtraId}>
                Renda Extra
              </label>
            </div>
            <input
              className="finance-card-input"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={rendaExtra}
              id={rendaExtraId}
              onChange={(event) => handleRendaExtraChange(event.target.value)}
            />
            <span className="finance-card-helper">Entradas adicionais</span>
          </div>

          <div className="finance-card finance-card--hero">
            <div className="finance-card-head">
              <div className="finance-card-icon">
                <PiggyBank size={18} aria-hidden="true" />
              </div>
              <label className="finance-card-title" htmlFor={destinadoId}>
                Destinado ao Cofrinho
              </label>
            </div>
            <input
              className="finance-card-input"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={destinado}
              id={destinadoId}
              onChange={(event) => handleCofrinhoChange(event.target.value)}
            />
            <span className="finance-card-helper">Valor guardado no cofrinho</span>
          </div>
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
                <Filter size={16} aria-hidden="true" />
                <div className="finance-dropdown" ref={filterRef}>
                  <button
                    className="finance-dropdown-trigger"
                    type="button"
                    id={statusFilterId}
                    aria-haspopup="listbox"
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen((prev) => !prev)}
                  >
                    {getLabel(statusFilter, filterOptions)}
                  </button>
                  {filterOpen && (
                    <div className="finance-dropdown-menu" role="listbox">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={statusFilter === option.value}
                          className={`finance-dropdown-item ${
                            statusFilter === option.value ? "finance-dropdown-item--active" : ""
                          }`}
                          onClick={() => {
                            setStatusFilter(option.value as "todos" | "abertos" | "pagos");
                            setFilterOpen(false);
                          }}
                        >
                          {statusFilter === option.value && (
                            <Check size={14} className="finance-dropdown-check" aria-hidden="true" />
                          )}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="finance-control">
                <ArrowUpDown size={16} aria-hidden="true" />
                <div className="finance-dropdown" ref={sortRef}>
                  <button
                    className="finance-dropdown-trigger"
                    type="button"
                    id={sortOrderId}
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((prev) => !prev)}
                  >
                    {getLabel(sortOrder, sortOptions)}
                  </button>
                  {sortOpen && (
                    <div className="finance-dropdown-menu" role="listbox">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={sortOrder === option.value}
                          className={`finance-dropdown-item ${
                            sortOrder === option.value ? "finance-dropdown-item--active" : ""
                          }`}
                          onClick={() => {
                            setSortOrder(option.value as SortOrder);
                            setSortOpen(false);
                          }}
                        >
                          {sortOrder === option.value && (
                            <Check size={14} className="finance-dropdown-check" aria-hidden="true" />
                          )}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            <div className="finance-control-actions">
              <button
                className="finance-secondary-button"
                type="button"
                onClick={handleExport}
              >
                <Download size={16} aria-hidden="true" />
                Exportar
              </button>
              <button
                className="finance-secondary-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} aria-hidden="true" />
                Importar
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
            <span>Pagamento</span>
            <span>Valor</span>
            <span>Vencimento</span>
            <span>Status</span>
            <span>Ações</span>
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
                  <div className="finance-date-input">
                    <CalendarDays size={16} aria-hidden="true" />
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
                  </div>
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
                <CheckCircle2 size={14} aria-hidden="true" />
                {pagamento.pago ? "Pago" : "Aberto"}
              </button>
              <button
                className="finance-remove-button"
                type="button"
                aria-label="Remover pagamento"
                onClick={() => removePagamento(pagamento.id)}
              >
                –
              </button>
            </div>
          ))}
          <div className="finance-footer">
            <button
              className="finance-add-button finance-add-button--full"
              type="button"
              aria-label="Adicionar pagamento"
              onClick={addPagamento}
            >
              + Adicionar pagamento
            </button>
          </div>
          </div>

        <aside className="finance-side">
          <span className="finance-side-title">Resumo</span>
          <div className="finance-card finance-card--summary">
            <div className="finance-summary-head">
              <span className="finance-summary-icon">
                <Wallet size={16} aria-hidden="true" />
              </span>
              <span className="finance-summary-label">Valor Utilizável</span>
            </div>
            <div className="finance-summary-value">{formatBRL(totals.valorUtilizavel)}</div>
            <div className="finance-summary-bar">
              <span />
            </div>
          </div>
          <div className="finance-card finance-card--summary">
            <div className="finance-summary-head">
              <span className="finance-summary-icon finance-summary-icon--piggy">
                <PiggyBank size={16} aria-hidden="true" />
              </span>
              <span className="finance-summary-label">Restante ao Cofrinho</span>
            </div>
            <div className="finance-summary-value">{formatBRL(totals.restanteCofrinho)}</div>
            <span className="finance-summary-note">Meta atingida! 🎉</span>
          </div>
          <div className="finance-card finance-card--summary">
            <div className="finance-summary-head">
              <span className="finance-summary-icon finance-summary-icon--warn">
                <TrendingUp size={16} aria-hidden="true" />
              </span>
              <span className="finance-summary-label">Previsão (Pagamentos Abertos)</span>
            </div>
            <div className="finance-summary-value">{formatBRL(totals.totalAbertos)}</div>
          </div>
        </aside>
      </section>
      </div>
    </main>
  );
}
