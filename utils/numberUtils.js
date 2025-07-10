export function toUrduNumber(num) {
  // Converts 0-9 to ۰-۹
  return String(num).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
} 