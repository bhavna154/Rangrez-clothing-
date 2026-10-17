/**
 * Pricing & Discount helper utilities for RANGREZ
 * Manages selling prices, MRP, discount percentages, and sale schedule validation.
 */

/**
 * Checks if a discount (strikethrough MRP and % OFF badge) should be displayed.
 * Only returns true if MRP is strictly higher than the selling price, and
 * any configured sale start/end dates are currently valid.
 * Never invents a strikethrough price if MRP is not provided or <= sellingPrice.
 */
export function isDiscountActive(
  mrp?: number,
  sellingPrice?: number,
  startDate?: string,
  endDate?: string
): boolean {
  if (!mrp || !sellingPrice || Number(mrp) <= Number(sellingPrice)) {
    return false;
  }

  const now = new Date();

  if (startDate && startDate.trim()) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime()) && now < start) {
      return false;
    }
  }

  if (endDate && endDate.trim()) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime()) && now > end) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates discount percentage rounded to the nearest integer.
 */
export function calculateDiscountPercent(mrp: number, sellingPrice: number): number {
  if (!mrp || mrp <= sellingPrice) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/**
 * Checks if a custom sale label (e.g. "Launch offer") is currently active.
 */
export function isSaleLabelActive(
  saleLabel?: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!saleLabel || !saleLabel.trim()) return false;

  const now = new Date();

  if (startDate && startDate.trim()) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime()) && now < start) {
      return false;
    }
  }

  if (endDate && endDate.trim()) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime()) && now > end) {
      return false;
    }
  }

  return true;
}
