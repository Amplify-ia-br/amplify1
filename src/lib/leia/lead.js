const MASTERCLASS_FORMATS = new Set(["presencial", "online"]);

export function cleanLeiaLeadValue(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeLeiaLead(body = {}, fallbackPath = "/leia") {
  const interest = cleanLeiaLeadValue(body.interest, 40);
  const submittedFormat = cleanLeiaLeadValue(body.masterclassFormat, 40).toLowerCase();

  return {
    name: cleanLeiaLeadValue(body.name, 120),
    email: cleanLeiaLeadValue(body.email, 180).toLowerCase(),
    school: cleanLeiaLeadValue(body.school, 180),
    role: cleanLeiaLeadValue(body.role, 120),
    interest,
    masterclassFormat: interest === "masterclass" ? submittedFormat : "",
    students: cleanLeiaLeadValue(body.students, 60),
    cityState: cleanLeiaLeadValue(body.cityState, 120),
    phone: cleanLeiaLeadValue(body.phone, 60),
    path: cleanLeiaLeadValue(body.path || fallbackPath, 120),
    consentAt: new Date().toISOString(),
  };
}

export function validateLeiaLead(lead) {
  if (!lead.name || !/^\S+@\S+\.\S+$/.test(lead.email) || !lead.school || !lead.role) {
    return "Preencha os campos obrigatórios.";
  }
  if (!["masterclass", "implantacao"].includes(lead.interest)) {
    return "Selecione como você quer começar.";
  }
  if (lead.masterclassFormat && !MASTERCLASS_FORMATS.has(lead.masterclassFormat)) {
    return "Selecione um formato de masterclass válido.";
  }
  return "";
}
