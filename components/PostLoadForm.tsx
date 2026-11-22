"use client";

import { useEffect, useState, type FormEvent } from "react";
import { STATE_NAMES } from "@/lib/states";

const KEY_STORAGE = "loads-admin-key";

export function PostLoadForm() {
  const [adminKey, setAdminKey] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) setAdminKey(saved);
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const key = String(data.get("adminKey") ?? "").trim();
    if (!key) {
      setStatus("error");
      setMessage("Enter the admin key.");
      return;
    }
    try {
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      /* ignore */
    }
    setAdminKey(key);
    setStatus("sending");
    setMessage("");

    const milesRaw = String(data.get("miles") ?? "").trim();
    const payload = {
      originCity: String(data.get("originCity") ?? "").trim(),
      originState: String(data.get("originState") ?? "").trim(),
      destinationCity: String(data.get("destinationCity") ?? "").trim(),
      destinationState: String(data.get("destinationState") ?? "").trim(),
      equipment: String(data.get("equipment") ?? "").trim(),
      weight: String(data.get("weight") ?? "").trim(),
      size: String(data.get("size") ?? "Full").trim(),
      miles: milesRaw ? Number(milesRaw) : null,
      rate: String(data.get("rate") ?? "").trim(),
      perMile: String(data.get("perMile") ?? "").trim(),
      pickupDate: String(data.get("pickupDate") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
      brokerName: String(data.get("brokerName") ?? "").trim(),
      brokerPhone: String(data.get("brokerPhone") ?? "").trim(),
      brokerEmail: String(data.get("brokerEmail") ?? "").trim(),
      brokerDot: String(data.get("brokerDot") ?? "").trim(),
      source: String(data.get("source") ?? "Indus").trim(),
    };

    try {
      const response = await fetch("/api/loads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-loads-admin-key": key,
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; load?: { id?: string } };
      if (!response.ok || !body.ok) {
        setStatus("error");
        setMessage(body.error || "Could not post the load.");
        return;
      }
      setStatus("sent");
      setCreatedId(body.load?.id ?? "");
      form.reset();
      const keyInput = form.querySelector<HTMLInputElement>('input[name="adminKey"]');
      if (keyInput) keyInput.value = key;
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <label>
        Admin key
        <input
          name="adminKey"
          type="password"
          required
          autoComplete="off"
          defaultValue={adminKey}
          placeholder="LOADS_ADMIN_KEY"
        />
      </label>
      <label>
        Desk source
        <select name="source" defaultValue="Indus">
          <option value="Indus">Indus</option>
          <option value="Laneora desk">Laneora desk</option>
        </select>
      </label>
      <label>
        Origin city
        <input name="originCity" required maxLength={60} placeholder="Houston" />
      </label>
      <label>
        Origin state
        <select name="originState" defaultValue="TX" required>
          {Object.entries(STATE_NAMES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Destination city
        <input name="destinationCity" required maxLength={60} placeholder="Dallas" />
      </label>
      <label>
        Destination state
        <select name="destinationState" defaultValue="TX" required>
          {Object.entries(STATE_NAMES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Equipment
        <input name="equipment" required maxLength={60} placeholder="Dry van" defaultValue="Dry van" />
      </label>
      <label>
        Size
        <select name="size" defaultValue="Full">
          <option value="Full">Full</option>
          <option value="Partial">Partial</option>
        </select>
      </label>
      <label>
        Weight
        <input name="weight" maxLength={40} placeholder="42,000 lbs" />
      </label>
      <label>
        Miles
        <input name="miles" type="number" min={0} max={5000} placeholder="240" />
      </label>
      <label>
        Rate
        <input name="rate" maxLength={40} placeholder="$1,450" />
      </label>
      <label>
        Per mile
        <input name="perMile" maxLength={40} placeholder="$2.10/mi" />
      </label>
      <label>
        Pickup date
        <input name="pickupDate" maxLength={40} placeholder="2026-11-20" />
      </label>
      <label>
        Broker name
        <input name="brokerName" maxLength={120} placeholder="INDUS Transports LLC" />
      </label>
      <label>
        Broker phone
        <input name="brokerPhone" maxLength={40} type="tel" placeholder="(512) 761-6399" />
      </label>
      <label>
        Broker email
        <input name="brokerEmail" maxLength={120} type="email" placeholder="industransportsllc@gmail.com" />
      </label>
      <label>
        Broker DOT
        <input name="brokerDot" maxLength={12} placeholder="DOT number" />
      </label>
      <label>
        Notes
        <textarea name="notes" maxLength={800} rows={3} placeholder="Appointment, commodity, specials" />
      </label>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Posting…" : "Post load"}
      </button>
      {status === "sent" ? (
        <p className="hint" role="status">
          Posted{createdId ? ` (${createdId})` : ""}. It will show on /loads for that origin state.
        </p>
      ) : null}
      {status === "error" ? <p className="hint" role="alert">{message}</p> : null}
    </form>
  );
}
