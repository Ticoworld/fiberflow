"use client";

import { useState } from "react";

export function PrivateApiDemo({ orderId }: { orderId: string }) {
  const [receipt, setReceipt] = useState<string>();
  const [maxRedemptions, setMaxRedemptions] = useState<number>();
  const [successfulCalls, setSuccessfulCalls] = useState(0);
  const [message, setMessage] = useState("Retrieve your receipt to call the private API.");
  const [busy, setBusy] = useState(false);

  async function retrieveReceipt() {
    setBusy(true);
    const response = await fetch(`/api/access/receipt?order=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as {
      receipt?: string;
      max_redemptions?: number;
      error?: string;
    };
    setBusy(false);

    if (!response.ok || !body.receipt || !body.max_redemptions) {
      setMessage(body.error ?? "Receipt is not available yet.");
      return;
    }

    setReceipt(body.receipt);
    setMaxRedemptions(body.max_redemptions);
    setMessage("Receipt ready. Call the private API until the quota is exhausted.");
  }

  async function callPrivateApi() {
    if (!receipt) return;
    setBusy(true);
    const response = await fetch("/api/private-api", {
      headers: { Authorization: `Bearer ${receipt}` },
      cache: "no-store",
    });
    const body = (await response.json()) as { error?: string; exhausted?: boolean };
    setBusy(false);

    if (!response.ok) {
      setMessage(`Denied: ${body.error ?? "access_denied"}`);
      return;
    }

    const nextCount = successfulCalls + 1;
    setSuccessfulCalls(nextCount);
    setMessage(
      body.exhausted
        ? "Accepted: this call used the final redemption."
        : `Accepted: ${nextCount} of ${maxRedemptions} redemptions used.`,
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50">
      <h2 className="mb-2 text-lg font-semibold">Private API Access</h2>
      <p className="mb-4 text-sm">{message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retrieveReceipt}
          disabled={busy}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Retrieve access receipt
        </button>
        <button
          type="button"
          onClick={callPrivateApi}
          disabled={busy || !receipt}
          className="rounded-full border border-blue-700 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Call private API
        </button>
      </div>
    </section>
  );
}

