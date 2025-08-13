export function calculateGrossProfit(cogs: number, revenue: number) {
  return revenue - cogs;
}

export function calculateMargin(net: number, revenue: number) {
  return revenue ? (net / revenue) * 100 : 0;
}
