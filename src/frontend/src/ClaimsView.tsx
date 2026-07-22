import { useEffect, useRef, useState } from "react";
import { apiService } from "./services/api";
import type { BudgetLine, Claim, Member, UploadingReceipt } from "./types";

interface ClaimsViewProps {
  budgetLines?: BudgetLine[];
  members?: Member[];
}

type Step = "member" | "details" | "receipts" | "payment" | "review";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "application/pdf",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ClaimsView({
  members = [],
  budgetLines = [],
}: ClaimsViewProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>("member");

  const [claimantId, setClaimantId] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [semester, setSemester] = useState("26A");
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [budgetLineId, setBudgetLineId] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<
    "FPS" | "PAYME" | "BANK" | "CASH" | "OTHER"
  >("FPS");
  const [payoutHandle, setPayoutHandle] = useState("");
  const [skipReceipt, setSkipReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [uploadedReceipts, setUploadedReceipts] = useState<UploadingReceipt[]>(
    []
  );
  const [pendingVendor, setPendingVendor] = useState("");
  const [pendingReceiptDate, setPendingReceiptDate] = useState("");
  const [pendingReceiptTotal, setPendingReceiptTotal] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileBase64, setPendingFileBase64] = useState("");
  const [pendingFileError, setPendingFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setStep("member");
    setClaimantId("");
    setExpenseDate("");
    setSemester("26A");
    setEventId("");
    setAmount("");
    setNotes("");
    setBudgetLineId(budgetLines[0]?.line_id || "");
    setPayoutMethod("FPS");
    setPayoutHandle("");
    setSkipReceipt(false);
    setUploadedReceipts([]);
    setPendingVendor("");
    setPendingReceiptDate("");
    setPendingReceiptTotal("");
    setPendingFile(null);
    setPendingFileBase64("");
    setPendingFileError("");
  };

  const loadClaims = () => {
    setLoading(true);
    apiService
      .getMyClaims()
      .then((res) => setClaims(res.claims))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const openNewClaim = () => {
    resetForm();
    setShowForm(true);
  };

  const canProceed = () => {
    if (step === "member") {
      return !!claimantId;
    }
    if (step === "details") {
      return !!expenseDate && !!amount && !!notes;
    }
    if (step === "receipts") {
      return true;
    }
    if (step === "payment") {
      return true;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setPendingFileError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setPendingFileError(
        "Unsupported file type. Allowed: PNG, JPEG, GIF, PDF."
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setPendingFileError(
        `File exceeds 5 MB limit (${formatFileSize(file.size)}).`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setPendingFile(file);
      setPendingFileBase64(base64);
    };
    reader.onerror = () => {
      setPendingFileError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadReceipt = async () => {
    if (!(pendingFile && pendingFileBase64)) {
      return;
    }
    if (
      !(
        pendingVendor.trim() ||
        pendingReceiptDate.trim() ||
        pendingReceiptTotal.trim()
      )
    ) {
      setPendingFileError(
        "Optional: fill in vendor, receipt date, or receipt total before uploading."
      );
      return;
    }

    const receipt: UploadingReceipt = {
      base64Data: pendingFileBase64,
      fileName: pendingFile.name,
      mimeType: pendingFile.type,
      receiptDate: pendingReceiptDate,
      receiptTotal: Number(pendingReceiptTotal) || 0,
      status: "pending",
      vendor: pendingVendor,
    };
    setUploadedReceipts((prev) => [
      ...prev,
      { ...receipt, status: "uploading" },
    ]);

    try {
      const result = await apiService.uploadReceipt(
        pendingFile.name,
        pendingFile.type,
        pendingFileBase64,
        pendingVendor,
        pendingReceiptDate,
        Number(pendingReceiptTotal) || 0
      );
      setUploadedReceipts((prev) =>
        prev.map((r) =>
          r.fileName === pendingFile.name && r.status === "uploading"
            ? { ...r, receiptId: result.receiptId, status: "done" as const }
            : r
        )
      );
      setPendingFile(null);
      setPendingFileBase64("");
      setPendingVendor("");
      setPendingReceiptDate("");
      setPendingReceiptTotal("");
      setPendingFileError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setUploadedReceipts((prev) =>
        prev.map((r) =>
          r.fileName === pendingFile.name && r.status === "uploading"
            ? { ...r, error: err.message, status: "error" as const }
            : r
        )
      );
      setPendingFileError(err.message || "Upload failed");
    }
  };

  const removeUploadedReceipt = async (index: number) => {
    const receipt = uploadedReceipts[index];
    if (receipt.receiptId) {
      try {
        await apiService.deleteOrphanedReceipt(receipt.receiptId);
      } catch {
        // Cleanup best-effort
      }
    }
    setUploadedReceipts((prev) => prev.filter((_, i) => i !== index));
  };

  const receiptIds = uploadedReceipts
    .filter((r) => r.receiptId)
    .map((r) => r.receiptId!);
  const receiptTotalSum = uploadedReceipts.reduce(
    (sum, r) => sum + (r.receiptTotal || 0),
    0
  );
  const claimAmount = Number(amount) || 0;
  const receiptOverage = receiptTotalSum > 0 && receiptTotalSum < claimAmount;

  const handleSave = async (submit: boolean) => {
    if (!claimAmount) {
      alert("Amount must be greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      const draft = await apiService.saveClaimDraft({
        amount: claimAmount,
        budgetLineId,
        claimantId,
        eventId,
        expenseDate,
        notes,
        payoutHandle,
        payoutMethod,
        receiptId: skipReceipt ? undefined : receiptIds[0],
        receiptIds: skipReceipt
          ? undefined
          : receiptIds.length > 0
            ? receiptIds
            : undefined,
        semester,
        uuid: crypto.randomUUID(),
      });
      if (submit) {
        await apiService.submitDraftClaim(draft.claim_id);
      }
      setShowForm(false);
      resetForm();
      loadClaims();
    } catch (err: any) {
      alert(err.message || "Failed to save claim");
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Step[] = ["member", "details", "receipts", "payment", "review"];

  const renderStep = () => {
    switch (step) {
      case "member":
        return (
          <div className="form-group">
            <label>Select Member (Claimant)</label>
            <select
              onChange={(e) => setClaimantId(e.target.value)}
              required
              value={claimantId}
            >
              <option disabled value="">
                Choose a member...
              </option>
              {members
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
            </select>
          </div>
        );
      case "details":
        return (
          <>
            <div className="form-group">
              <label>Expense Date</label>
              <input
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                type="date"
                value={expenseDate}
              />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <input
                onChange={(e) => setSemester(e.target.value)}
                required
                type="text"
                value={semester}
              />
            </div>
            <div className="form-group">
              <label>Amount (HKD)</label>
              <input
                onChange={(e) => setAmount(e.target.value)}
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </div>
            <div className="form-group">
              <label>Note (required)</label>
              <textarea
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={2}
                value={notes}
              />
            </div>
            <div className="form-group">
              <label>Budget Line (optional)</label>
              <select
                onChange={(e) => setBudgetLineId(e.target.value)}
                value={budgetLineId}
              >
                <option value="">None / pay from general fund</option>
                {budgetLines.map((bl) => (
                  <option key={bl.line_id} value={bl.line_id}>
                    {bl.description} - HK${bl.remaining.toFixed(2)} remaining
                  </option>
                ))}
              </select>
            </div>
          </>
        );
      case "receipts":
        return (
          <>
            <div className="form-group">
              <label>
                <input
                  checked={skipReceipt}
                  onChange={(e) => setSkipReceipt(e.target.checked)}
                  type="checkbox"
                />
                No receipt (missing receipt warning)
              </label>
              {skipReceipt && (
                <small className="warning-text">
                  This claim will be flagged as missing a receipt. Only
                  TREASURER can approve.
                </small>
              )}
            </div>

            {!skipReceipt && (
              <>
                {uploadedReceipts.length > 0 && (
                  <div className="uploaded-receipts">
                    <h4>
                      Uploaded Receipt{uploadedReceipts.length > 1 ? "s" : ""} (
                      {uploadedReceipts.length})
                    </h4>
                    {uploadedReceipts.map((r, i) => (
                      <div
                        className={`receipt-item receipt-${r.status}`}
                        key={i}
                      >
                        <div className="receipt-info">
                          <span className="receipt-filename">{r.fileName}</span>
                          <span className="receipt-meta">
                            {r.vendor}
                            {r.vendor && r.receiptDate ? " · " : ""}
                            {r.receiptDate
                              ? new Date(r.receiptDate).toLocaleDateString()
                              : ""}
                            {r.receiptTotal
                              ? ` · HK$${r.receiptTotal.toFixed(2)}`
                              : ""}
                          </span>
                        </div>
                        <div className="receipt-status-group">
                          <span
                            className={`badge status-${r.status === "done" ? "approved" : r.status === "error" ? "rejected" : "pending"}`}
                          >
                            {r.status === "done"
                              ? "Uploaded"
                              : r.status === "uploading"
                                ? "Uploading..."
                                : r.status === "error"
                                  ? "Failed"
                                  : "Pending"}
                          </span>
                          {r.receiptId && (
                            <span className="mono receipt-id-label">
                              {r.receiptId}
                            </span>
                          )}
                          {(r.status === "done" || r.status === "error") && (
                            <button
                              className="danger-btn small-btn"
                              onClick={() => removeUploadedReceipt(i)}
                              type="button"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {r.error && (
                          <small className="warning-text">{r.error}</small>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="receipt-upload-zone">
                  <h4>Upload Receipt</h4>
                  <div className="form-group">
                    <label>File (PNG, JPEG, GIF, PDF — max 5 MB)</label>
                    <input
                      accept="image/png,image/jpeg,image/gif,application/pdf"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      type="file"
                    />
                    {pendingFile && (
                      <small className="help-text">
                        {pendingFile.name} ({formatFileSize(pendingFile.size)})
                      </small>
                    )}
                    {pendingFileError && (
                      <small className="warning-text">{pendingFileError}</small>
                    )}
                  </div>
                  <div className="receipt-meta-fields">
                    <div className="form-group">
                      <label>Vendor (optional)</label>
                      <input
                        onChange={(e) => setPendingVendor(e.target.value)}
                        placeholder="Store name"
                        value={pendingVendor}
                      />
                    </div>
                    <div className="form-group">
                      <label>Receipt Date (optional)</label>
                      <input
                        onChange={(e) => setPendingReceiptDate(e.target.value)}
                        type="date"
                        value={pendingReceiptDate}
                      />
                    </div>
                    <div className="form-group">
                      <label>Receipt Total (optional)</label>
                      <input
                        onChange={(e) => setPendingReceiptTotal(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={pendingReceiptTotal}
                      />
                    </div>
                  </div>
                  <button
                    className="secondary-btn"
                    disabled={!(pendingFile && pendingFileBase64)}
                    onClick={handleUploadReceipt}
                    type="button"
                  >
                    Upload Receipt
                  </button>
                </div>

                {receiptOverage && (
                  <div className="alert warning">
                    <strong>Receipt total overage warning:</strong> Receipt
                    total (HK${receiptTotalSum.toFixed(2)}) is less than claimed
                    amount (HK${claimAmount.toFixed(2)}). You can proceed but
                    this may cause issues during verification.
                  </div>
                )}
              </>
            )}
          </>
        );
      case "payment":
        return (
          <>
            <div className="form-group">
              <label>Payout Method</label>
              <select
                onChange={(e) => setPayoutMethod(e.target.value as any)}
                value={payoutMethod}
              >
                <option value="FPS">FPS</option>
                <option value="PAYME">PayMe</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payout Handle / Reference</label>
              <input
                onChange={(e) => setPayoutHandle(e.target.value)}
                placeholder={
                  payoutMethod === "FPS" ? "Phone number" : "Account / handle"
                }
                value={payoutHandle}
              />
            </div>
          </>
        );
      case "review":
        return (
          <div className="review-summary">
            <p>
              <strong>Member:</strong>{" "}
              {members.find((m) => m.user_id === claimantId)?.display_name ||
                claimantId}
            </p>
            <p>
              <strong>Amount:</strong> HK${claimAmount.toFixed(2)}
            </p>
            <p>
              <strong>Expense Date:</strong> {expenseDate}
            </p>
            <p>
              <strong>Note:</strong> {notes}
            </p>
            <p>
              <strong>Payment:</strong> {payoutMethod}{" "}
              {payoutHandle && `(${payoutHandle})`}
            </p>
            {skipReceipt && (
              <div className="alert warning">
                Missing Receipt: this claim will be flagged.
              </div>
            )}
            {uploadedReceipts.length > 0 && (
              <div>
                <p>
                  <strong>
                    Receipt{uploadedReceipts.length > 1 ? "s" : ""}:
                  </strong>
                </p>
                {uploadedReceipts
                  .filter((r) => r.receiptId)
                  .map((r, i) => (
                    <p
                      className="mono"
                      key={i}
                      style={{ marginBottom: "0.25rem", marginLeft: "1rem" }}
                    >
                      {r.receiptId} — {r.fileName}
                      {r.receiptTotal > 0
                        ? ` (HK$${r.receiptTotal.toFixed(2)})`
                        : ""}
                    </p>
                  ))}
              </div>
            )}
            {receiptOverage && (
              <div className="alert warning">
                Receipt total (HK${receiptTotalSum.toFixed(2)}) is less than
                claimed amount (HK${claimAmount.toFixed(2)}).
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Expense Claims</h2>
          <button className="primary-btn" onClick={openNewClaim}>
            + New Claim
          </button>
        </div>

        {showForm && (
          <div className="modal-backdrop">
            <div className="modal-content glass-card wide-modal">
              <h2>New Claim — {step}</h2>
              <div className="stepper">
                {steps.map((s, i) => (
                  <span
                    className={`stepper-dot ${step === s ? "active" : ""}`}
                    key={s}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              {renderStep()}
              <div className="modal-actions">
                {step !== "member" && (
                  <button
                    className="secondary-btn"
                    onClick={() => setStep(steps[steps.indexOf(step) - 1])}
                    type="button"
                  >
                    Back
                  </button>
                )}
                {step === "review" ? (
                  <>
                    <button
                      className="secondary-btn"
                      disabled={submitting}
                      onClick={() => handleSave(false)}
                      type="button"
                    >
                      Save Draft
                    </button>
                    <button
                      className="primary-btn"
                      disabled={submitting}
                      onClick={() => handleSave(true)}
                      type="button"
                    >
                      {submitting ? "Submitting..." : "Submit Claim"}
                    </button>
                  </>
                ) : (
                  <button
                    className="primary-btn"
                    disabled={!canProceed()}
                    onClick={() => setStep(steps[steps.indexOf(step) + 1])}
                    type="button"
                  >
                    Next
                  </button>
                )}
                <button
                  className="danger-btn"
                  disabled={submitting}
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loader-container">
            <div className="loader" />
            <p>Loading...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="empty-state">No claims found.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Claimant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Receipts</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td>
                      {members.find((m) => m.user_id === c.claimant_id)
                        ?.display_name || c.claimant_id}
                    </td>
                    <td className="amount">
                      ${Number(c.total_amount).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`badge status-${c.status.toLowerCase()}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.submitted_at
                        ? new Date(c.submitted_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      {c.missingReceipt ? (
                        <span className="badge status-rejected">Missing</span>
                      ) : c.receiptIds?.length ? (
                        <span className="badge status-approved">
                          {c.receiptIds.length} file
                          {c.receiptIds.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
