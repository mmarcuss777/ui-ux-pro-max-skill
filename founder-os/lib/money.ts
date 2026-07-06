const formatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number): string {
  return formatter.format(amount)
}
