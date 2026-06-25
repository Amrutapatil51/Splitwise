/**
 * Builds a UPI deep-link URI per the NPCI spec.
 * The returned string is used as the QR code payload.
 */
export function buildUpiUri(
  payeeUpiId: string,
  payeeName: string,
  amount: number,
  note: string
): string {
  const params = new URLSearchParams({
    pa: payeeUpiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
