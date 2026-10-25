const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, { token, ...options } = {}) {
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let data = {};
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    data = { message: text || res.statusText };
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Error ${res.status}`);
  }
  return data;
}

// ==========================================
// 1. COMPANY REGISTRATION & STATUS (OWNER)
// ==========================================

export function registerCompany(formData, token) {
  return request("/api/companies/create", {
    method: "POST",
    body: formData,
    token,
  });
}

export function getMyCompanyStatus(token) {
  return request("/api/companies/me/status", { token });
}

// ==========================================
// 2. COMPANY PAGE (OWNER DASHBOARD)
// ==========================================

export function getMyCompanyPage(token) {
  return request("/api/company-page/me", { token });
}

export function updateMyCompanyPage(updates, token) {
  return request("/api/company-page/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    token,
  });
}

export function addTeamMember(member, token) {
  return request("/api/company-page/me/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
    token,
  });
}

export function removeTeamMember(memberId, token) {
  return request(`/api/company-page/me/team/${memberId}`, {
    method: "DELETE",
    token,
  });
}

export function uploadCompanyImage(file, token, folder = "/company-pages") {
  const formData = new FormData();
  formData.append("image", file);

  return request(`/api/company-page/me/upload-image?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: formData,
    token,
  });
}

// ==========================================
// 3. COMPANY PAGE (PUBLIC & MARKETPLACE)
// ==========================================

export function getPublicCompanyPage(companyPageId) {
  return request(`/api/company-page/public/${companyPageId}`);
}

export function recordCompanyPageView(companyPageId) {
  return request(`/api/company-page/public/${companyPageId}/view`, {
    method: "POST",
  });
}

export function listPublishedCompanyPages() {
  return request("/api/company-page/public");
}

// ==========================================
// 4. CREW & DISPATCH (INTERNAL CONTRACTOR TEAM)
// ==========================================

export function getMyTeam(token) {
  return request("/api/team/me", { token });
}

export function addCrewMember(member, token) {
  return request("/api/team/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
    token,
  });
}

export function removeCrewMember(memberId, token) {
  return request(`/api/team/me/${memberId}`, {
    method: "DELETE",
    token,
  });
}

// ==========================================
// 5. SERVICE REQUESTS
// ==========================================

export function checkServiceCoverage(payload, token) {
  return request("/api/service-requests/check-coverage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    token,
  });
}

export function createServiceRequest(formData, token) {
  return request("/api/service-requests", {
    method: "POST",
    body: formData,
    token,
  });
}

export function getMySubmittedRequests(token) {
  return request("/api/service-requests/me", { token });
}

export function getMyCompanyRequests(token) {
  return request("/api/service-requests/company/me", { token });
}

export function updateRequestStatus(requestId, updateData, token) {
  return request(`/api/service-requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(typeof updateData === "string" ? { status: updateData } : updateData),
    token,
  });
}

// ==========================================
// 6. USER & PLATFORM NOTIFICATIONS
// ==========================================

export function getMyNotifications(token) {
  return request("/api/notifications", { token });
}

export function markNotificationAsRead(id, token) {
  return request(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllNotificationsAsRead(token) {
  return request("/api/notifications/read-all", {
    method: "PATCH",
    token,
  });
}

// ==========================================
// 7. ADMIN DASHBOARD APIS
// ==========================================

export function getAdminStats(token) {
  return request("/api/admin/stats", { token });
}

export function getAllCompanies(status = "all", token) {
  return request(`/api/admin/companies?status=${status}`, { token });
}

export function getPendingCompanies(token) {
  return request("/api/admin/companies/pending", { token });
}

export function updateCompanyStatus(companyId, status, token) {
  return request(`/api/admin/companies/${companyId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    token,
  });
}

export function getPublicPlatformSettings() {
  return request(`/api/admin/settings/public?_t=${Date.now()}`);
}

export function getAdminTeam(token) {
  return request("/api/admin/team", { token });
}

export function addAdminTeamMember(data, token) {
  return request("/api/admin/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    token,
  });
}

export function deleteAdminTeamMember(id, token) {
  return request(`/api/admin/team/${id}`, {
    method: "DELETE",
    token,
  });
}

export function getAdminSettings(token) {
  return request("/api/admin/settings", { token });
}

export function updateAdminSettings(settings, token) {
  return request("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    token,
  });
}

export function sendBroadcastNotification(formData, token) {
  return request("/api/admin/notifications/broadcast", {
    method: "POST",
    body: formData,
    token,
  });
}

export function deleteNotification(id, token) {
  return request(`/api/admin/notifications/${id}`, {
    method: "DELETE",
    token,
  });
}

export function createPaymentIntent(payload, token) {
  return request("/api/payments/create-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    token,
  });
}

export function confirmPaymentRecord(payload, token) {
  return request("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    token,
  });
}

export function getAdminFinancialStats(token) {
  return request("/api/admin/financial-stats", { token });
}

export function searchUserByEmail(email, token) {
  return request(`/api/team/search-user?email=${encodeURIComponent(email)}`, {
    token,
  });
}

export function syncUserAuth(token) {
  return request("/api/auth/sync", {
    method: "POST",
    token,
  });
}

// ==========================================
// 8. SUPPORT TICKETS & DISPUTE APIS
// ==========================================

export function submitSupportTicket(formDataOrPayload, token) {
  const isFormData = formDataOrPayload instanceof FormData;
  return request("/api/support/tickets", {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    body: isFormData ? formDataOrPayload : JSON.stringify(formDataOrPayload),
    token,
  });
}

export function getAdminSupportTickets(params = {}, token) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/tickets?${query}`, { token });
}

export function updateAdminSupportTicket(ticketId, updates, token) {
  return request(`/api/admin/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    token,
  });
}

// Replace the bottom functions in frontend/src/services/api.js with this:

export function getUnratedRequests(token) {
  return request("/api/service-requests/unrated", { token });
}

export function submitRequestRating(requestId, { rating, review }, token) {
  return request(`/api/service-requests/${requestId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, review }),
    token,
  });
}