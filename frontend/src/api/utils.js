// ── Category config ────────────────────────────────
export const EXPENSE_CATS = {
  transport:  { label: 'Transport',             labelEn: 'Transportation',      badge: 'badge-transport',  color: '#6495ED' },
  electric:   { label: 'Electricite',           labelEn: 'Electric bill',       badge: 'badge-electric',   color: '#E8C55A' },
  wifi:       { label: 'Internet / Wifi',       labelEn: 'Internet / Wifi',     badge: 'badge-wifi',       color: '#BA8FFF' },
  food:       { label: 'Alimentation / Repas',  labelEn: 'Food / Meals',        badge: 'badge-food',       color: '#FFB347' },
  commission: { label: 'Commission versee',     labelEn: 'Commission paid',     badge: 'badge-commission', color: '#4CAF82' },
  sinistre:   { label: 'Reglement sinistre',    labelEn: 'Claim settlement',    badge: 'badge-sinistre',   color: '#E05A4E' },
  salary:     { label: 'Salaire / Prime',       labelEn: 'Salary / Bonus',      badge: 'badge-salary',     color: '#5DC5A0' },
  office:     { label: 'Fournitures bureau',    labelEn: 'Office supplies',     badge: 'badge-office',     color: '#C9A84C' },
  frais:      { label: 'Frais generaux',        labelEn: 'General expenses',    badge: 'badge-frais',      color: '#9BA8B5' },
  autre:      { label: 'Autre depense',         labelEn: 'Other expense',       badge: 'badge-autre',      color: '#7A7A7A' },
}
export const INCOME_CATS = {
  prime:      { label: "Prime d'assurance",     labelEn: 'Insurance premium',   badge: 'badge-prime' },
  commission: { label: 'Commission recue',      labelEn: 'Commission received', badge: 'badge-commission' },
  autre:      { label: 'Autre entree',          labelEn: 'Other income',        badge: 'badge-autre' },
}
export const CURRENCIES = ['XAF', 'EUR', 'GBP', 'USD']

// ── Formatting ────────────────────────────────────
export function formatAmount(amount, currency = 'XAF') {
  const n = parseFloat(amount) || 0
  if (currency === 'XAF') return n.toLocaleString('fr-FR') + ' XAF'
  const sym = { EUR: '€', GBP: '£', USD: '$' }
  return (sym[currency] || '') + n.toLocaleString('fr-FR')
}

export function formatAmountPDF(amount, currency = 'XAF') {
  const n = parseFloat(amount) || 0
  const intPart = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (currency === 'XAF') return intPart + ' XAF'
  const sym = { EUR: 'EUR ', GBP: 'GBP ', USD: 'USD ' }
  return (sym[currency] || '') + intPart
}

export function formatDate(d, lang = 'fr') {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function genRef(prefix = 'TX') {
  return `${prefix}-${Date.now().toString().slice(-7)}`
}

// ── Category helpers — accept lang param ──────────
export function getCatDef(category, type) {
  if (type === 'income') return INCOME_CATS[category] || INCOME_CATS.autre
  return EXPENSE_CATS[category] || EXPENSE_CATS.autre
}

export function getCatLabel(category, type, lang = 'fr') {
  const def = getCatDef(category, type)
  return lang === 'fr' ? def.label : (def.labelEn || def.label)
}

export function getCatBadge(category, type) {
  return getCatDef(category, type).badge
}
