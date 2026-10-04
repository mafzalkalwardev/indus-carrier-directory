"use client";

import { useState } from "react";

type Connected = {
  dot_number: string;
  legal_name: string | null;
  phy_city: string | null;
  phy_state: string | null;
  phone: string | null;
  email: string | null;
  matched_on: string;
};

export function ProfileActions({ dot }: { dot: string }) {
  const [connected, setConnected] = useState<Connected[] | null>(null);
  const [connectedError, setConnectedError] = useState<string | null>(null);
  const [loadingConnected, setLoadingConnected] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function checkConnected() {
    setLoadingConnected(true);
    setConnectedError(null);
    try {
      const response = await fetch(`/api/carriers/${dot}/connected`);
      const body = (await response.json()) as { carriers?: Connected[]; error?: string };
      if (!response.ok) {
        setConnectedError(body.error ?? "Could not check connected authorities.");
        return;
      }
      setConnected(body.carriers ?? []);
    } catch {
      setConnectedError("Could not check connected authorities.");
    } finally {
      setLoadingConnected(false);
    }
  }

  async function refreshLive() {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const response = await fetch(`/api/carriers/${dot}/refresh`, { method: "POST" });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setRefreshMessage(body.error ?? "Refresh failed.");
        setRefreshing(false);
        return;
      }
      window.location.reload();
    } catch {
      setRefreshMessage("Refresh failed.");
      setRefreshing(false);
    }
  }

  return (
    <section className="stack">
      <div className="card">
        <h2>Connected authorities</h2>
        <p className="muted">
          Other DOT numbers that share this phone or email on the public census. A shared number can be a recycled
          phone or a dispatch office. It is a public-record fact, not a fraud finding.
        </p>
        <button type="button" onClick={checkConnected} disabled={loadingConnected}>
          {loadingConnected ? "Checking…" : "Check connected authorities"}
        </button>
        {connectedError ? <p className="error">{connectedError}</p> : null}
        {connected && connected.length === 0 ? <p>No other authorities share this phone or email.</p> : null}
        {connected && connected.length > 0 ? (
          <ul className="plain-list">
            {connected.map((carrier) => (
              <li key={carrier.dot_number}>
                <a href={`/carriers/${carrier.dot_number}`}>{carrier.legal_name ?? "Unnamed carrier"}</a>
                <span className="muted">
                  {" "}
                  DOT {carrier.dot_number}
                  {carrier.phy_city ? ` · ${carrier.phy_city}` : ""}
                  {carrier.phy_state ? `, ${carrier.phy_state}` : ""} · matched on {carrier.matched_on}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="card">
        <h2>Live FMCSA check</h2>
        <p className="muted">
          Ask for a newer insurance and authority reading from FMCSA. The page already shows the daily public file.
        </p>
        <button type="button" onClick={refreshLive} disabled={refreshing}>
          {refreshing ? "Checking FMCSA…" : "Refresh from FMCSA"}
        </button>
        {refreshMessage ? <p className="error">{refreshMessage}</p> : null}
      </div>
    </section>
  );
}
