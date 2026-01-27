# Meu Orçamento — Next.js (Controle Financeiro Pessoal)

Aplicação em **Next.js (App Router)** para controle de orçamento mensal: entradas (valor fixo + renda extra), pagamentos com filtro/ordenação, persistência com debounce e **import/export JSON**. UI moderna com **Lucide Icons** e foco em **acessibilidade**.

---

## 🎯 O que este projeto demonstra

- **React + TypeScript** com tipagem e modelagem clara (`Payment`, `SortOrder`)
- **Separação de domínio** em `lib/finance` (cálculos, sanitização, parsing)
- **UX de formulários**: máscara/formatador de moeda (`formatCurrencyInput`), sanitização de texto/data, feedback de erro
- **Persistência eficiente**: `localStorage` com **debounce (400ms)** para reduzir writes
- **Import/Export robusto**: normalização e validação de JSON + mensagem de erro
- **Acessibilidade**: `useId`, labels (`sr-only`), `aria-invalid`, `aria-live`, `role="alert"`
- UI com componentes e ícones (Lucide) e um header dedicado (`FinanceHeader`)

---

## ✨ Funcionalidades

### Entradas (Renda)
- **Valor Fixo Mensal**
- **Renda Extra**
- **Destinado ao Cofrinho**

> Valores são formatados no padrão BRL no input via `formatCurrencyInput`.

### Pagamentos
- Adicionar e remover itens
- Campos por item:
  - **Descrição**
  - **Valor**
  - **Vencimento** (`dd/mm/aaaa`) com validação
  - **Status** (Aberto/Pago)

### Filtro e Ordenação (dropdown custom)
- **Filtro:** Todos / Pagos / Abertos
- **Ordenação:**
  - Vencimento ↑ / Vencimento ↓
  - Valor ↑ / Valor ↓
  - Status (Abertos primeiro) / Status (Pagos primeiro)
  - Sem ordem

Dropdown fecha ao clicar fora (`mousedown` + refs `filterRef/sortRef`).

### Resumo (sidebar)
- **Valor Utilizável**
- **Restante ao Cofrinho**
- **Previsão (Pagamentos Abertos)**

### Persistência e portabilidade
- Estado salvo no `localStorage` (`finance-state-v1`) com debounce
- **Exportar**: baixa `financeiro.json`
- **Importar**: valida e normaliza conteúdo; exibe banner de erro em caso inválido

---

## 🧠 Regras e arquitetura

### `lib/finance` (domínio)
Responsável por:
- `calculateTotals({ valorFixo, rendaExtra, destinado, pagamentos })`
- `formatCurrencyInput`, `toNumber`
- `sanitizeText`, `sanitizeDate`
- `isValidDate`, `parseDateToNumber`
- `type Payment`

Isso mantém o componente focado em UI/estado.

### Import/Normalização de JSON
No `handleImport`, o arquivo é:
1. Parseado (`JSON.parse`)
2. Normalizado (`normalizeState`)
   - moeda aceita `string` ou `number`
   - datas/textos sanitizados
   - valida `statusFilter` e `sortOrder`
   - valida `pagamentos` como array
   - garante `id` e `pago` boolean
3. Aplica estado + limpa input file
4. Mostra erro em banner se inválido

### Validação de vencimento
- Mostra “Data inválida” quando:
  - `vencimento.length === 10` **e** `!isValidDate(vencimento)`
- Acessível com `aria-invalid`, `aria-describedby` e hint com `aria-live`

### Persistência com debounce
Para evitar salvar a cada tecla:
- um `setTimeout(400ms)` é reiniciado a cada mudança
- no cleanup, o timeout é cancelado

---

## 🛠️ Tecnologias

- Next.js (App Router)
- React Hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useId`)
- TypeScript
- lucide-react (ícones)
- localStorage
- Import/Export JSON (Blob + input file)

---

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
