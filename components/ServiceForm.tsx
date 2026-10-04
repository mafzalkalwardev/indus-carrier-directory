"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { brand } from "@/lib/brand";
import type { ServiceField } from "@/lib/offers";

export function RequestSent({ label }: { label: string }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="success" role="status" ref={panel}>
      <p className="kicker">Sent</p>
      <h2>We have your {label} request</h2>
      <p>Sales will reach you on the phone or email you entered.</p>
      <p><a href={brand.phoneHref}>Or call {brand.phone}</a></p>
    </div>
  );
}

export function ServiceForm({
  label,
  fields,
}: {
  id: string;
  label: string;
  fields: ServiceField[];
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_honey") || "")) {
      setStatus("sent");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${brand.email}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const body = (await response.json()) as { success?: boolean | string };
      if (response.ok && (body.success === true || body.success === "true")) {
        setStatus("sent");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") return <RequestSent label={label} />;

  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <input type="hidden" name="_subject" value={`INDUS ${label} request`} />
      <input type="hidden" name="_template" value="table" />
      <input type="hidden" name="service" value={label} />
      <input type="text" name="_honey" className="sr" tabIndex={-1} autoComplete="off" />
      <label>
        Name
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" required maxLength={30} autoComplete="tel" />
      </label>
      <label>
        Email
        <input name="email" type="email" required maxLength={120} autoComplete="email" />
      </label>
      <label>
        Company
        <input name="company" maxLength={120} autoComplete="organization" />
      </label>
      {fields.map((field) => (
        <label className={field.wide || field.kind === "textarea" ? "wide" : undefined} key={field.name}>
          {field.label}
          {field.kind === "textarea" ? (
            <textarea name={field.name} required={field.required} maxLength={800} rows={4} placeholder={field.placeholder} />
          ) : field.kind === "select" ? (
            <select name={field.name} required={field.required} defaultValue="">
              <option value="">Choose</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input name={field.name} required={field.required} maxLength={120} placeholder={field.placeholder} />
          )}
        </label>
      ))}
      <button className="wide" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send to INDUS"}
      </button>
      {status === "error" ? <p className="error wide">The request did not go through. Call sales at {brand.phone}.</p> : null}
    </form>
  );
}
