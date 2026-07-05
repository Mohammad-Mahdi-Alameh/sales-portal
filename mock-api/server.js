const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const db = require("./data");

const PORT = Number(process.env.PORT || 8787);
const PASSWORD = "assessment";

function timestamp() {
  return new Date().toISOString();
}

function createId(prefix) {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function send(res, status, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(body);
  return true;
}

function ok(res, data, message = "OK", extra = {}) {
  return send(res, 200, { success: true, message, data, ...extra });
}

function created(res, data, message = "Created", extra = {}) {
  return send(res, 201, { success: true, message, data, ...extra });
}

function fail(res, status, code, message, details) {
  return send(res, status, { success: false, error: { code, message, details } });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function asQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

function toBoolean(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function findById(collection, id) {
  return collection.find(item => item.id === id || item.orgId === id || item.branchId === id || item.serialKey === id);
}

function removeById(collection, id) {
  const index = collection.findIndex(item => item.id === id || item.orgId === id || item.branchId === id || item.serialKey === id);
  if (index === -1) return null;
  const [removed] = collection.splice(index, 1);
  return removed;
}

function sortRows(rows, sortBy, sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    const ad = Date.parse(av);
    const bd = Date.parse(bv);
    const left = Number.isNaN(ad) ? lower(av) : ad;
    const right = Number.isNaN(bd) ? lower(bv) : bd;
    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return 0;
  });
}

function paginate(rows, query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Number(query.limit === undefined ? 25 : query.limit);
  if (limit < 0) {
    return {
      page,
      limit,
      total: rows.length,
      totalPages: 1,
      data: rows
    };
  }
  const safeLimit = Math.max(1, limit || 25);
  const totalPages = Math.max(1, Math.ceil(rows.length / safeLimit));
  const start = (page - 1) * safeLimit;
  return {
    page,
    limit: safeLimit,
    total: rows.length,
    totalPages,
    data: rows.slice(start, start + safeLimit)
  };
}

function listResponse(rows, query, options = {}) {
  let result = [...rows];

  for (const [queryKey, field] of Object.entries(options.filters || {})) {
    const value = query[queryKey];
    if (value !== undefined && value !== "") {
      result = result.filter(item => String(item[field]) === String(value));
    }
  }

  for (const [queryKey, field] of Object.entries(options.booleanFilters || {})) {
    const value = toBoolean(query[queryKey]);
    if (value !== undefined) {
      result = result.filter(item => Boolean(item[field]) === value);
    }
  }

  if (query.search && options.searchFields?.length) {
    const needle = lower(query.search);
    result = result.filter(item => options.searchFields.some(field => lower(item[field]).includes(needle)));
  }

  const sortBy = options.sortMap?.[query.sortBy] || query.sortBy || options.defaultSort || "createdAt";
  const sortOrder = query.sortOrder || options.defaultSortOrder || "desc";
  result = sortRows(result, sortBy, sortOrder);

  const page = paginate(result, query);
  return {
    data: page.data,
    pagination: {
      page: page.page,
      limit: page.limit,
      total: page.total,
      totalPages: page.totalPages
    }
  };
}

function staffName(id) {
  return db.staff.find(s => s.id === id)?.name || null;
}

function clientName(id) {
  return db.clients.find(c => c.id === id)?.name || null;
}

function orgName(id) {
  return db.organizations.find(o => o.id === id || o.orgId === id)?.name || null;
}

function branchName(id) {
  return db.branches.find(b => b.id === id || b.branchId === id)?.name || null;
}

function venueName(id) {
  return db.venues.find(v => v.id === id)?.name || null;
}

function decorateClient(client) {
  return {
    ...client,
    organizationCount: client.isOrgAdmin && client.orgId ? 1 : 0,
    venueCount: db.venues.filter(v => v.owner === client.id || v.adminId === client.id).length,
    salesName: staffName(client.salesId)
  };
}

function decorateOrganization(org) {
  return {
    ...org,
    adminName: clientName(org.adminId),
    salesName: staffName(org.salesId),
    branchCount: db.branches.filter(b => b.orgId === org.id).length,
    venueCount: db.venues.filter(v => v.orgId === org.id).length
  };
}

function decorateBranch(branch) {
  const venues = db.venues.filter(v => v.branchId === branch.id);
  return {
    ...branch,
    orgName: orgName(branch.orgId),
    venueCount: venues.length,
    activeVenueCount: venues.filter(v => v.status === "Active").length
  };
}

function decorateVenue(venue) {
  return {
    ...venue,
    orgName: venue.orgId ? orgName(venue.orgId) : null,
    branchName: venue.branchId ? branchName(venue.branchId) : null,
    ownerName: clientName(venue.owner),
    salesName: staffName(venue.salesId)
  };
}

function decorateSerial(serial) {
  return {
    ...serial,
    clientName: clientName(serial.selectedClient),
    venueName: venueName(serial.resturantId),
    saleName: staffName(serial.saleId)
  };
}

function pushAudit(action, resource, resourceId, metadata = {}) {
  const venueId = metadata.venueId || metadata.resturantId || null;
  const organizationId = metadata.organizationId || metadata.orgId || null;
  const log = {
    id: createId("audit"),
    staffId: metadata.staffId || "staff_admin_001",
    staffEmail: "admin@example.test",
    staffName: "Assessment Admin",
    action,
    resource,
    resourceId,
    organizationId,
    organizationName: organizationId ? orgName(organizationId) : null,
    venueId,
    venueName: venueId ? venueName(venueId) : null,
    metadata,
    timestamp: timestamp(),
    createdAt: timestamp()
  };
  db.auditLogs.unshift(log);
  return log;
}

function clientStats() {
  const month = "2026-06";
  return {
    total: db.clients.length,
    active: db.clients.filter(c => c.enabled).length,
    organizationAdmins: db.clients.filter(c => c.isOrgAdmin).length,
    standalone: db.clients.filter(c => !c.orgId).length,
    newThisMonth: db.clients.filter(c => String(c.created_at).startsWith(month)).length
  };
}

function organizationStats() {
  return {
    total: db.organizations.length,
    active: db.organizations.filter(o => o.isActive).length,
    inactive: db.organizations.filter(o => !o.isActive).length,
    recent: db.organizations.filter(o => Date.parse(o.createdAt) >= Date.parse("2026-05-01T00:00:00.000Z")).length
  };
}

function serialStats(query = {}) {
  let serials = db.serials;
  if (query.saleId) serials = serials.filter(s => s.saleId === query.saleId);
  return {
    total: serials.length,
    enabled: serials.filter(s => s.enabled).length,
    disabled: serials.filter(s => !s.enabled).length,
    attached: serials.filter(s => Boolean(s.deviceId)).length,
    available: serials.filter(s => !s.deviceId).length
  };
}

function auditStats() {
  const byAction = {};
  const byResource = {};
  const byStaff = {};
  for (const log of db.auditLogs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byResource[log.resource] = (byResource[log.resource] || 0) + 1;
    byStaff[log.staffEmail || log.staffId] = (byStaff[log.staffEmail || log.staffId] || 0) + 1;
  }
  return {
    success: true,
    data: {
      total: db.auditLogs.length,
      byAction,
      byResource,
      byStaff
    }
  };
}

function dashboardSummary() {
  const cutoff = Date.now() + 60 * 24 * 60 * 60 * 1000;
  const dueSoon = db.venues
    .filter(v => v.renewalAt && Date.parse(v.renewalAt) <= cutoff)
    .map(decorateVenue);

  return {
    cards: {
      organizations: db.organizations.length,
      activeOrganizations: db.organizations.filter(o => o.isActive).length,
      venues: db.venues.length,
      activeVenues: db.venues.filter(v => v.status === "Active").length,
      trialVenues: db.venues.filter(v => v.status === "Trial").length,
      renewalsDueSoon: dueSoon.length,
      offlineDevices: db.venues.reduce((sum, venue) => sum + Number(venue.offlineDevices || 0), 0)
    },
    renewalsDueSoon: dueSoon,
    recentAudit: db.auditLogs.slice(0, 5),
    salesWorkload: db.staff.map(staff => ({
      staffId: staff.id,
      name: staff.name,
      clients: db.clients.filter(c => c.salesId === staff.id).length,
      venues: db.venues.filter(v => v.salesId === staff.id).length,
      serials: db.serials.filter(s => s.saleId === staff.id).length
    })),
    funnel: [
      { label: "Prospects", value: 18 },
      { label: "Trials", value: db.venues.filter(v => v.status === "Trial").length },
      { label: "Active", value: db.venues.filter(v => v.status === "Active").length },
      { label: "Renewal Risk", value: dueSoon.length }
    ]
  };
}

function validateRequired(payload, fields) {
  const missing = fields.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === "");
  return missing.length ? missing : null;
}

async function handleAuth(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseBody(req);
    if (body.password !== PASSWORD) {
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const user = db.staff.find(s => s.email === body.email) || db.clients.find(c => c.email === body.email);
    if (!user) {
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    return ok(res, { token: `mock-token-${user.id}`, user }, "Login successful");
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    return ok(res, db.staff[0], "Current profile");
  }

  return false;
}

async function handleStaff(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/staff") {
    if (query.email) {
      return ok(res, db.staff.find(staff => staff.email === query.email) || null, "Staff profile");
    }
    return ok(res, db.staff, "Staff retrieved");
  }

  if (req.method === "POST" && subpath === "/staff") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["name", "email", "role"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const id = createId("staff");
    const staff = {
      id,
      name: body.name,
      full_name: body.name,
      email: body.email,
      account_type: "staff",
      role: body.role,
      enabled: body.enabled !== false,
      created_at: timestamp(),
      updated_at: timestamp()
    };
    db.staff.push(staff);
    pushAudit("staff.created", "staff", id, { staffId: id });
    return created(res, staff, "Staff member created");
  }

  const match = subpath.match(/^\/staff\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const staff = findById(db.staff, id);
  if (!staff) return fail(res, 404, "NOT_FOUND", "Staff member not found");

  if (req.method === "PUT") {
    const body = await parseBody(req);
    Object.assign(staff, body, { updated_at: timestamp() });
    pushAudit("staff.updated", "staff", id, body);
    return ok(res, staff, "Staff member updated");
  }

  if (req.method === "DELETE") {
    const dependencies = {
      clients: db.clients.filter(c => c.salesId === id).length,
      serials: db.serials.filter(s => s.saleId === id).length
    };
    if (dependencies.clients || dependencies.serials) {
      return fail(res, 409, "HAS_DEPENDENCIES", "Cannot delete staff member with dependencies", dependencies);
    }
    removeById(db.staff, id);
    pushAudit("staff.deleted", "staff", id);
    return ok(res, { id }, "Staff member deleted");
  }

  return false;
}

async function handleClients(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/clients/stats") {
    return ok(res, clientStats(), "Client stats");
  }

  if (req.method === "GET" && subpath === "/clients") {
    const rows = db.clients.map(decorateClient);
    const result = listResponse(rows, query, {
      filters: { salesId: "salesId" },
      searchFields: ["name", "email", "company"],
      sortMap: { createdAt: "created_at" },
      defaultSort: "created_at"
    });
    return ok(res, result.data, "Clients retrieved", { pagination: result.pagination, stats: clientStats() });
  }

  if (req.method === "POST" && subpath === "/clients") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["name", "email"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const id = createId("client");
    const client = {
      id,
      name: body.name,
      email: body.email,
      phone: body.phone || "",
      company: body.company || body.name,
      account_type: "client",
      enabled: body.enabled !== false,
      salesId: body.salesId || "staff_admin_001",
      orgId: body.orgId || null,
      isOrgAdmin: Boolean(body.isOrgAdmin),
      created_at: timestamp(),
      updated_at: timestamp()
    };
    db.clients.push(client);
    pushAudit("client.created", "client", id, { salesId: client.salesId });
    return created(res, decorateClient(client), "Client created");
  }

  const match = subpath.match(/^\/clients\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const client = findById(db.clients, id);
  if (!client) return fail(res, 404, "NOT_FOUND", "Client not found");

  if (req.method === "GET") {
    return ok(res, decorateClient(client), "Client retrieved");
  }

  if (req.method === "PUT") {
    const body = await parseBody(req);
    Object.assign(client, body, { updated_at: timestamp() });
    pushAudit("client.updated", "client", id, body);
    return ok(res, decorateClient(client), "Client updated");
  }

  if (req.method === "DELETE") {
    const dependencies = {
      venues: db.venues.filter(v => v.owner === id || v.adminId === id).length,
      serials: db.serials.filter(s => s.selectedClient === id).length
    };
    if (dependencies.venues || dependencies.serials) {
      return fail(res, 409, "HAS_DEPENDENCIES", "Cannot delete client with dependencies", dependencies);
    }
    removeById(db.clients, id);
    pushAudit("client.deleted", "client", id);
    return ok(res, { id }, "Client deleted");
  }

  return false;
}

async function handleOrganizations(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/organizations") {
    const rows = db.organizations.map(decorateOrganization);
    const result = listResponse(rows, query, {
      filters: { salesId: "salesId" },
      searchFields: ["name", "billingEmail", "country"],
      sortMap: { created_at: "createdAt", createdAt: "createdAt" },
      defaultSort: "createdAt"
    });
    return ok(res, result.data, "Organizations retrieved", { pagination: result.pagination, stats: organizationStats() });
  }

  if (req.method === "POST" && subpath === "/organizations") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["name", "adminId"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const id = createId("org");
    const org = {
      id,
      orgId: id,
      name: body.name,
      adminId: body.adminId,
      salesId: body.salesId || "staff_admin_001",
      status: body.status || "active",
      isActive: body.isActive !== false,
      country: body.country || "Lebanon",
      timezone: body.timezone || "Asia/Beirut",
      currency: body.currency || "USD",
      billingEmail: body.billingEmail || "",
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.organizations.push(org);
    const client = findById(db.clients, org.adminId);
    if (client) Object.assign(client, { orgId: id, isOrgAdmin: true, updated_at: timestamp() });
    pushAudit("organization.created", "organization", id, { orgId: id });
    return created(res, decorateOrganization(org), "Organization created");
  }

  const cloneMatch = subpath.match(/^\/organizations\/([^/]+)\/clone$/);
  if (cloneMatch && req.method === "POST") {
    const sourceId = decodeURIComponent(cloneMatch[1]);
    const source = findById(db.organizations, sourceId);
    if (!source) return fail(res, 404, "NOT_FOUND", "Source organization not found");
    const body = await parseBody(req);
    const id = createId("org");
    const org = {
      ...source,
      id,
      orgId: id,
      name: body.newOrgName || `${source.name} Copy`,
      adminId: body.adminId || source.adminId,
      clonedFrom: source.id,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.organizations.push(org);

    let branchesCloned = 0;
    let venuesCloned = 0;
    if (body.includeBranches !== false) {
      const sourceBranches = db.branches.filter(b => b.orgId === source.id);
      for (const branch of sourceBranches) {
        const branchId = createId("branch");
        db.branches.push({ ...branch, id: branchId, branchId, orgId: id, clonedFrom: branch.id, createdAt: timestamp(), updatedAt: timestamp() });
        branchesCloned++;
        if (body.includeVenues !== false) {
          const sourceVenues = db.venues.filter(v => v.branchId === branch.id);
          for (const venue of sourceVenues) {
            const venueId = createId("venue");
            db.venues.push({ ...venue, id: venueId, orgId: id, branchId, clonedFrom: venue.id, createdAt: timestamp(), updatedAt: timestamp() });
            venuesCloned++;
          }
        }
      }
    }
    pushAudit("organization.cloned", "organization", id, { sourceOrgId: source.id, orgId: id });
    return created(res, { ...decorateOrganization(org), branchesCloned, venuesCloned }, "Organization cloned");
  }

  const match = subpath.match(/^\/organizations\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const org = findById(db.organizations, id);
  if (!org) return fail(res, 404, "NOT_FOUND", "Organization not found");

  if (req.method === "GET") {
    return ok(res, decorateOrganization(org), "Organization retrieved");
  }

  if (req.method === "PUT") {
    const body = await parseBody(req);
    Object.assign(org, body, { updatedAt: timestamp() });
    if (body.isActive !== undefined && body.status === undefined) {
      org.status = body.isActive ? "active" : "inactive";
    }
    pushAudit("organization.updated", "organization", id, { ...body, orgId: id });
    return ok(res, decorateOrganization(org), "Organization updated");
  }

  if (req.method === "DELETE") {
    const dependencies = {
      branches: db.branches.filter(b => b.orgId === id).length,
      venues: db.venues.filter(v => v.orgId === id).length
    };
    if (dependencies.branches || dependencies.venues) {
      return fail(res, 409, "HAS_DEPENDENCIES", "Cannot delete organization with dependencies", dependencies);
    }
    removeById(db.organizations, id);
    pushAudit("organization.deleted", "organization", id, { orgId: id });
    return ok(res, { id }, "Organization deleted");
  }

  return false;
}

async function handleBranches(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/branches") {
    const rows = db.branches.map(decorateBranch);
    const result = listResponse(rows, query, {
      filters: { orgId: "orgId" },
      searchFields: ["name", "city", "country"],
      sortMap: { created_at: "createdAt", createdAt: "createdAt" },
      defaultSort: "createdAt"
    });
    return ok(res, result.data, "Branches retrieved", { pagination: result.pagination });
  }

  if (req.method === "POST" && subpath === "/branches") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["name", "orgId"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const id = createId("branch");
    const branch = {
      id,
      branchId: id,
      orgId: body.orgId,
      name: body.name,
      active: body.active !== false,
      city: body.city || "",
      country: body.country || "",
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.branches.push(branch);
    pushAudit("branch.created", "branch", id, { orgId: branch.orgId });
    return created(res, decorateBranch(branch), "Branch created");
  }

  const cloneMatch = subpath.match(/^\/branches\/([^/]+)\/clone$/);
  if (cloneMatch && req.method === "POST") {
    const sourceId = decodeURIComponent(cloneMatch[1]);
    const source = findById(db.branches, sourceId);
    if (!source) return fail(res, 404, "NOT_FOUND", "Source branch not found");
    const body = await parseBody(req);
    const id = createId("branch");
    const branch = {
      ...source,
      id,
      branchId: id,
      orgId: body.destinationOrgId || source.orgId,
      name: body.newBranchName || `${source.name} Copy`,
      clonedFrom: source.id,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.branches.push(branch);
    let venuesCloned = 0;
    if (body.includeVenues) {
      for (const venue of db.venues.filter(v => v.branchId === source.id)) {
        const venueId = createId("venue");
        db.venues.push({ ...venue, id: venueId, orgId: branch.orgId, branchId: id, clonedFrom: venue.id, createdAt: timestamp(), updatedAt: timestamp() });
        venuesCloned++;
      }
    }
    pushAudit("branch.cloned", "branch", id, { orgId: branch.orgId, sourceBranchId: source.id });
    return created(res, { ...decorateBranch(branch), venuesCloned }, "Branch cloned");
  }

  const match = subpath.match(/^\/branches\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const branch = findById(db.branches, id);
  if (!branch) return fail(res, 404, "NOT_FOUND", "Branch not found");

  if (req.method === "GET") {
    return ok(res, decorateBranch(branch), "Branch retrieved");
  }

  if (req.method === "PUT") {
    const body = await parseBody(req);
    Object.assign(branch, body, { updatedAt: timestamp() });
    pushAudit("branch.updated", "branch", id, { ...body, orgId: branch.orgId });
    return ok(res, decorateBranch(branch), "Branch updated");
  }

  if (req.method === "DELETE") {
    const venues = db.venues.filter(v => v.branchId === id).length;
    if (venues) {
      return fail(res, 409, "HAS_DEPENDENCIES", "Cannot delete branch with venues", { venues });
    }
    removeById(db.branches, id);
    pushAudit("branch.deleted", "branch", id, { orgId: branch.orgId });
    return ok(res, { id }, "Branch deleted");
  }

  return false;
}

async function handleVenues(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/venues") {
    let rows = db.venues.map(decorateVenue);
    if (query.venueType === "organization") rows = rows.filter(v => Boolean(v.orgId));
    if (query.venueType === "standalone") rows = rows.filter(v => !v.orgId);
    const result = listResponse(rows, query, {
      filters: { salesId: "salesId", orgId: "orgId", branchId: "branchId", status: "status" },
      searchFields: ["name", "ownerName", "orgName", "branchName", "city"],
      sortMap: { owner: "ownerName", created_at: "createdAt", createdAt: "createdAt" },
      defaultSort: "createdAt"
    });
    return ok(res, result.data, "Venues retrieved", { pagination: result.pagination });
  }

  if (req.method === "POST" && subpath === "/venues") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["name", "owner"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const id = createId("venue");
    const owner = findById(db.clients, body.owner);
    const venue = {
      id,
      name: body.name,
      owner: body.owner,
      adminId: body.adminId || body.owner,
      orgId: body.orgId || null,
      branchId: body.branchId || null,
      salesId: body.salesId || owner?.salesId || "staff_admin_001",
      status: body.status || "Active",
      type: body.type || "restaurant",
      city: body.city || "",
      country: body.country || "Lebanon",
      timezone: body.timezone || "Asia/Beirut",
      currency: body.currency || "USD",
      subscriptionTier: body.subscriptionTier || "starter",
      renewalAt: body.renewalAt || "2026-09-01T00:00:00.000Z",
      receiverEnabled: Boolean(body.receiverEnabled),
      qrEnabled: body.qrEnabled !== false,
      offlineDevices: 0,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.venues.push(venue);
    pushAudit("venue.created", "venue", id, { orgId: venue.orgId, venueId: id });
    return created(res, decorateVenue(venue), "Venue created");
  }

  if (req.method === "POST" && subpath === "/venues/migrate") {
    const body = await parseBody(req);
    const destinationOrg = body.destinationOrgId ? findById(db.organizations, body.destinationOrgId) : null;

    if (body.sourceBranchId) {
      const branch = findById(db.branches, body.sourceBranchId);
      if (!branch) return fail(res, 404, "NOT_FOUND", "Source branch not found");
      branch.orgId = body.destinationOrgId || branch.orgId;
      branch.updatedAt = timestamp();
      let venuesUpdated = 0;
      for (const venue of db.venues.filter(v => v.branchId === branch.id)) {
        venue.orgId = branch.orgId;
        venue.branchId = body.destinationBranchId || venue.branchId;
        if (destinationOrg) venue.adminId = destinationOrg.adminId;
        venue.updatedAt = timestamp();
        venuesUpdated++;
      }
      pushAudit("branch.migrated", "branch", branch.id, { orgId: branch.orgId });
      return ok(res, { branchId: branch.id, venuesUpdated }, "Branch migrated");
    }

    if (body.sourceVenueId) {
      const venue = findById(db.venues, body.sourceVenueId);
      if (!venue) return fail(res, 404, "NOT_FOUND", "Source venue not found");
      venue.orgId = body.destinationOrgId || venue.orgId;
      venue.branchId = body.destinationBranchId || venue.branchId;
      if (destinationOrg) {
        venue.adminId = destinationOrg.adminId;
        venue.owner = destinationOrg.adminId;
      }
      venue.updatedAt = timestamp();
      pushAudit("venue.migrated", "venue", venue.id, { orgId: venue.orgId, venueId: venue.id });
      return ok(res, { venueId: venue.id, destinationOrgId: venue.orgId, destinationBranchId: venue.branchId }, "Venue migrated");
    }

    return fail(res, 422, "VALIDATION_ERROR", "Provide sourceVenueId or sourceBranchId");
  }

  const cloneMatch = subpath.match(/^\/venues\/([^/]+)\/clone$/);
  if (cloneMatch && req.method === "POST") {
    const sourceId = decodeURIComponent(cloneMatch[1]);
    const source = findById(db.venues, sourceId);
    if (!source) return fail(res, 404, "NOT_FOUND", "Source venue not found");
    const body = await parseBody(req);
    const id = createId("venue");
    const venue = {
      ...source,
      id,
      name: body.newVenueName || `${source.name} Copy`,
      orgId: body.destinationOrgId ?? source.orgId,
      branchId: body.destinationBranchId ?? source.branchId,
      owner: body.standaloneClientId || source.owner,
      adminId: body.standaloneClientId || source.adminId,
      clonedFrom: source.id,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.venues.push(venue);
    pushAudit("venue.cloned", "venue", id, { orgId: venue.orgId, venueId: id });
    return created(res, decorateVenue(venue), "Venue cloned");
  }

  const match = subpath.match(/^\/venues\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const venue = findById(db.venues, id);
  if (!venue) return fail(res, 404, "NOT_FOUND", "Venue not found");

  if (req.method === "GET") {
    return ok(res, decorateVenue(venue), "Venue retrieved");
  }

  if (req.method === "PUT") {
    const body = await parseBody(req);
    Object.assign(venue, body, { updatedAt: timestamp() });
    pushAudit("venue.updated", "venue", id, { ...body, orgId: venue.orgId, venueId: id });
    return ok(res, decorateVenue(venue), "Venue updated");
  }

  if (req.method === "DELETE") {
    removeById(db.venues, id);
    pushAudit("venue.deleted", "venue", id, { orgId: venue.orgId, venueId: id });
    return ok(res, { id }, "Venue deleted");
  }

  return false;
}

async function handleSerials(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/serials/stats") {
    return ok(res, serialStats(query), "Serial stats");
  }

  if (req.method === "GET" && subpath === "/serials") {
    const rows = db.serials.map(decorateSerial);
    const result = listResponse(rows, query, {
      filters: { saleId: "saleId", clientId: "selectedClient", venueId: "resturantId" },
      booleanFilters: { enabled: "enabled" },
      searchFields: ["id", "serialKey", "clientName", "venueName", "saleName", "notes"],
      defaultSort: "createdAt"
    });
    return ok(res, result.data, "Serials retrieved", { pagination: result.pagination, stats: serialStats(query) });
  }

  if (req.method === "POST" && subpath === "/serials") {
    const body = await parseBody(req);
    const serialKey = body.serialKey || `RNB-${String(db.serials.length + 1).padStart(4, "0")}`;
    if (findById(db.serials, serialKey)) {
      return fail(res, 409, "DUPLICATE", "Serial key already exists");
    }
    const serial = {
      id: serialKey,
      serialKey,
      enabled: body.enabled !== false,
      saleId: body.saleId || "staff_admin_001",
      selectedClient: body.selectedClient || body.clientId || null,
      resturantId: body.resturantId || body.venueId || null,
      deviceId: null,
      notes: body.notes || "",
      createdAt: timestamp(),
      updatedAt: timestamp()
    };
    db.serials.push(serial);
    pushAudit("serial.generated", "serial", serial.id, { venueId: serial.resturantId, selectedClient: serial.selectedClient });
    return created(res, decorateSerial(serial), "Serial generated");
  }

  const statusMatch = subpath.match(/^\/serials\/([^/]+)\/status$/);
  if (statusMatch && req.method === "PATCH") {
    const id = decodeURIComponent(statusMatch[1]);
    const serial = findById(db.serials, id);
    if (!serial) return fail(res, 404, "NOT_FOUND", "Serial not found");
    const body = await parseBody(req);
    serial.enabled = Boolean(body.enabled);
    serial.updatedAt = timestamp();
    pushAudit("serial.status_updated", "serial", id, { enabled: serial.enabled, venueId: serial.resturantId });
    return ok(res, decorateSerial(serial), "Serial status updated");
  }

  const match = subpath.match(/^\/serials\/([^/]+)$/);
  if (!match) return false;
  const id = decodeURIComponent(match[1]);
  const serial = findById(db.serials, id);
  if (!serial) return fail(res, 404, "NOT_FOUND", "Serial not found");

  if (req.method === "DELETE") {
    if (serial.deviceId) {
      return fail(res, 409, "SERIAL_ATTACHED", "Cannot delete a serial key attached to a device", { deviceId: serial.deviceId });
    }
    removeById(db.serials, id);
    pushAudit("serial.deleted", "serial", id);
    return ok(res, { id }, "Serial deleted");
  }

  return false;
}

async function handleRenewals(req, res, url, subpath) {
  if (req.method === "GET" && subpath === "/renewals/notification-settings") {
    return ok(res, db.renewalSettings, "Renewal notification settings");
  }

  if (req.method === "PUT" && subpath === "/renewals/notification-settings") {
    const body = await parseBody(req);
    Object.assign(db.renewalSettings, body, { updatedAt: timestamp(), updatedBy: body.updatedBy || "staff_admin_001" });
    pushAudit("renewal_settings.updated", "renewal_settings", "default", body);
    return ok(res, db.renewalSettings, "Renewal notification settings updated");
  }

  if (req.method === "POST" && subpath === "/renewals/activities") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["venueId", "type", "notes"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const venue = findById(db.venues, body.venueId);
    const activity = {
      id: createId("activity"),
      venueId: body.venueId,
      venueName: body.venueName || venue?.name || "",
      staffId: body.staffId || "staff_admin_001",
      staffName: body.staffName || "Assessment Admin",
      type: body.type,
      notes: body.notes,
      createdAt: timestamp()
    };
    db.venueActivities.unshift(activity);
    pushAudit("renewal_activity.created", "venue_activity", activity.id, { venueId: activity.venueId });
    return created(res, activity, "Venue activity logged");
  }

  const match = subpath.match(/^\/renewals\/activities\/([^/]+)$/);
  if (match && req.method === "GET") {
    const venueId = decodeURIComponent(match[1]);
    return ok(res, db.venueActivities.filter(activity => activity.venueId === venueId), "Venue activities retrieved");
  }

  return false;
}

async function handleAudit(req, res, url, subpath) {
  const query = asQuery(url);

  if (req.method === "GET" && subpath === "/audit/stats") {
    return send(res, 200, auditStats());
  }

  if (req.method === "GET" && subpath === "/audit") {
    let rows = [...db.auditLogs];
    if (query.startDate) rows = rows.filter(log => Date.parse(log.timestamp) >= Date.parse(query.startDate));
    if (query.endDate) rows = rows.filter(log => Date.parse(log.timestamp) <= Date.parse(query.endDate));
    const result = listResponse(rows, query, {
      filters: {
        action: "action",
        resource: "resource",
        staffId: "staffId",
        organizationId: "organizationId",
        venueId: "venueId"
      },
      searchFields: ["action", "resource", "staffEmail", "staffName", "organizationName", "venueName"],
      defaultSort: "timestamp",
      sortMap: { createdAt: "createdAt" }
    });
    return ok(res, result.data, "Audit logs retrieved", { pagination: result.pagination });
  }

  if (req.method === "POST" && subpath === "/audit") {
    const body = await parseBody(req);
    const missing = validateRequired(body, ["staffId", "action", "resource"]);
    if (missing) return fail(res, 422, "VALIDATION_ERROR", "Missing required fields", missing);
    const log = pushAudit(body.action, body.resource, body.resourceId || createId("resource"), body);
    return created(res, log, "Audit log created");
  }

  const match = subpath.match(/^\/audit\/([^/]+)$/);
  if (match && req.method === "GET") {
    const log = findById(db.auditLogs, decodeURIComponent(match[1]));
    if (!log) return fail(res, 404, "NOT_FOUND", "Audit log not found");
    return ok(res, log, "Audit log retrieved");
  }

  return false;
}

async function handleSales(req, res, url) {
  const subpath = url.pathname.replace(/^\/api\/v3\/sales/, "") || "/";

  if (req.method === "GET" && subpath === "/test") {
    return ok(res, { service: "sales", status: "UP" }, "Sales API is working");
  }

  if (req.method === "GET" && subpath === "/dashboard/summary") {
    return ok(res, dashboardSummary(), "Dashboard summary");
  }

  return (
    (await handleStaff(req, res, url, subpath)) ||
    (await handleClients(req, res, url, subpath)) ||
    (await handleOrganizations(req, res, url, subpath)) ||
    (await handleBranches(req, res, url, subpath)) ||
    (await handleVenues(req, res, url, subpath)) ||
    (await handleSerials(req, res, url, subpath)) ||
    (await handleRenewals(req, res, url, subpath)) ||
    (await handleAudit(req, res, url, subpath))
  );
}

async function handleNotificationTests(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/v1/renewals/test-email") {
    const body = await parseBody(req);
    return ok(res, { accepted: true, recipients: body.recipients || [] }, "Test email accepted");
  }

  if (req.method === "POST" && url.pathname === "/api/v1/renewals/test-digest") {
    const body = await parseBody(req);
    return ok(res, { accepted: true, recipients: body.recipients || [] }, "Test digest accepted");
  }

  return false;
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  if (req.method === "OPTIONS") {
    return send(res, 204);
  }

  try {
    if (req.method === "GET" && url.pathname === "/") {
      return ok(res, {
        name: "Sales Portal Assessment Mock API",
        auth: "/api/auth/login",
        sales: "/api/v3/sales",
        docs: "See API_CONTRACT.md"
      });
    }

    if (url.pathname.startsWith("/api/auth")) {
      const handled = await handleAuth(req, res, url);
      if (handled !== false) return;
    }

    if (url.pathname.startsWith("/api/v3/sales")) {
      const handled = await handleSales(req, res, url);
      if (handled !== false) return;
    }

    const notificationHandled = await handleNotificationTests(req, res, url);
    if (notificationHandled !== false) return;

    return fail(res, 404, "NOT_FOUND", `No route for ${req.method} ${url.pathname}`);
  } catch (error) {
    if (error.message === "Payload too large") {
      return fail(res, 413, "PAYLOAD_TOO_LARGE", error.message);
    }
    if (error instanceof SyntaxError) {
      return fail(res, 400, "INVALID_JSON", "Request body must be valid JSON");
    }
    console.error(error);
    return fail(res, 500, "INTERNAL_ERROR", "Unexpected mock API error");
  }
}

http.createServer(router).listen(PORT, () => {
  console.log(`Sales Portal Assessment Mock API listening on http://localhost:${PORT}`);
});
