#!/usr/bin/env node
/**
 * Regression: Motus company phone/email fields must win over officers-only mapping.
 */
import assert from "node:assert/strict";

function pickCompanyContact(body) {
  const companyPhone = (body.phoneNumbers ?? []).map((p) => p?.phoneNumber).find(Boolean) || null;
  const companyEmail = (body.emailAddresses ?? []).map((e) => e?.emailAddress).find(Boolean) || null;
  const officerPhone = (body.entityOfficers ?? []).map((o) => o?.phoneNumber).find(Boolean) || null;
  const officerEmail = (body.entityOfficers ?? []).map((o) => o?.email).find(Boolean) || null;
  return {
    phone: companyPhone || officerPhone || null,
    email: companyEmail || officerEmail || null,
  };
}

const body = {
  phoneNumbers: [{ phoneNumber: "2145559999" }],
  emailAddresses: [{ emailAddress: "ops@company.example" }],
  entityOfficers: [{ phoneNumber: "2145550001", email: "officer@example.com", firstName: "A" }],
};
const picked = pickCompanyContact(body);
assert.equal(picked.phone, "2145559999");
assert.equal(picked.email, "ops@company.example");
console.log("test-motus-company-contact: ok");
