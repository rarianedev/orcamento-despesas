export type Payment = {
  id: string;
  descricao: string;
  valor: string;
  vencimento: string;
  pago: boolean;
};

export type FinanceState = {
  valorFixo: string;
  destinado: string;
  pagamentos: Payment[];
};

export const toNumber = (value: string) => {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/[.]/g, "").replace(",", ".")
    : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sanitizeMoney = (value: string) => {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const hasComma = cleaned.includes(",");
  const normalized = cleaned
    .replace(/(?!^)-/g, "")
    .replace(hasComma ? /[.]/g : /[,]/g, "");
  return normalized;
};

export const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const sanitizeText = (value: string) =>
  value.replace(/[^\p{L}\s]/gu, "").replace(/\s{2,}/g, " ");

export const sanitizeDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let result = day;
  if (month) result += `/${month}`;
  if (year) result += `/${year}`;
  return result;
};

export const isValidDate = (value: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [dayStr, monthStr, yearStr] = value.split("/");
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const parseDateToNumber = (value: string) => {
  if (!isValidDate(value)) return null;
  const [dayStr, monthStr, yearStr] = value.split("/");
  return Number(yearStr) * 10000 + Number(monthStr) * 100 + Number(dayStr);
};

export const calculateTotals = (state: FinanceState) => {
  const totalPagos = state.pagamentos.reduce(
    (acc, item) => acc + (item.pago ? toNumber(item.valor) : 0),
    0
  );
  const totalAbertos = state.pagamentos.reduce(
    (acc, item) => acc + (!item.pago ? toNumber(item.valor) : 0),
    0
  );
  const totalCofrinho = state.pagamentos.reduce((acc, item) => {
    if (item.descricao.toLowerCase().includes("cofrinho")) {
      return acc + toNumber(item.valor);
    }
    return acc;
  }, 0);

  const valorFixoNum = toNumber(state.valorFixo);
  const destinadoNum = toNumber(state.destinado);

  return {
    totalPagos,
    totalAbertos,
    totalCofrinho,
    valorUtilizavel: Math.max(valorFixoNum - totalPagos, 0),
    restanteCofrinho: Math.max(destinadoNum + totalCofrinho, 0),
  };
};
