"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrModalProps {
  upiUri: string;
  amount: number;
  payeeName: string;
  onClose: () => void;
  onSettle: (refNo: string) => Promise<void>;
}

export default function QrModal({ upiUri, amount, payeeName, onClose, onSettle }: QrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    QRCode.toDataURL(upiUri, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR generation failed:", err));
  }, [upiUri]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRef = refNo.trim();
    
    // Compulsory check: validate that UPI UTR is present and exactly 12 digits
    if (!/^\d{12}$/.test(trimmedRef)) {
      setError("Please enter the 12-digit UPI Reference Number to confirm payment.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSettle(trimmedRef);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to record settlement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <div className="modal-card" style={{ maxWidth: "380px" }}>
        <div className="modal-header">
          <h2 className="modal-title">📲 Pay via UPI</h2>
          <button className="modal-close" onClick={onClose} title="Close" disabled={isSubmitting}>×</button>
        </div>

        <div className="modal-body" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
            Pay ₹{amount.toFixed(2)} to {payeeName}
          </h3>

          {!showConfirmForm ? (
            <>
              <div style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "200px",
                height: "200px"
              }}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR Code" style={{ width: "100%", height: "100%" }} />
                ) : (
                  <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Generating QR…</span>
                )}
              </div>

              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Scan this QR code with any UPI app to make the payment.
              </p>

              <button
                className="btn-done"
                style={{ width: "100%", padding: "10px 0" }}
                onClick={() => setShowConfirmForm(true)}
              >
                I have paid!
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              <p style={{ fontSize: "13px", color: "var(--text-main)", margin: 0 }}>
                Enter the **12-digit UPI Reference Number** (Transaction Ref ID) from your payment confirmation screen as proof:
              </p>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="e.g. 123456789012 (Required)"
                  className="add-member-input"
                  value={refNo}
                  onChange={(e) => {
                    setRefNo(e.target.value.replace(/\D/g, "").slice(0, 12)); // digits only, max 12
                    setError("");
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "14px",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              {error && (
                <span style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</span>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="btn-done"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: "10px 0" }}
                >
                  {isSubmitting ? "Settle..." : "Confirm & Settle"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowConfirmForm(false);
                    setError("");
                    setRefNo("");
                  }}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-pill)",
                    color: "var(--text-main)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
