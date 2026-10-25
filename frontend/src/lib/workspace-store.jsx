// frontend/src/lib/workspace-store.jsx
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  getMyCompanyPage,
  updateMyCompanyPage,
  addTeamMember as apiAddKeyPersonnel,
  removeTeamMember as apiRemoveKeyPersonnel,
  getMyTeam,
  addCrewMember as apiAddCrewMember,
  removeCrewMember as apiRemoveCrewMember,
  getMyCompanyRequests,
} from "../services/api";

const WorkspaceContext = createContext(null);

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const defaultCompany = {
  name: "",
  tagline: "",
  phone: "",
  email: "",
  website: "",
  yearsInBusiness: "",
  street: "",
  city: "",
  state: "",
  about: "",
  specialties: [],
  serviceArea: "",
  services: [],
  credentials: [],
  projects: [],
  published: false,
  logoUrl: "",
  coverImageUrl: "",
  views: 0,
  emergencyService: {
    enabled: false,
    title: "24/7 Emergency Service",
    description:
      "Immediate response for burst pipes, severe blockages, and critical water damage mitigation scenarios across the metro area.",
  },
  weekendService: {
    enabled: false,
    title: "Weekend Service Available",
    description:
      "On-call dispatch available Saturdays, Sundays, and holidays for scheduled and urgent service.",
  },
};

export function WorkspaceProvider({ children }) {
  const { getToken } = useAuth();
  const [company, setCompany] = useState(defaultCompany);
  const [team, setTeam] = useState([]);
  const [crew, setCrew] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crewLoading, setCrewLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState(null);

  const syncFromPage = (page) => {
    if (!page) return;
    setCompany({
      name: page.name || "",
      tagline: page.tagline || "",
      phone: page.phone || "",
      email: page.email || "",
      website: page.website || "",
      yearsInBusiness: page.yearsInBusiness || "",
      street: page.street || "",
      city: page.city || "",
      state: page.state || "",
      about: page.about || "",
      specialties: page.specialties || [],
      serviceArea: page.serviceArea || "",
      services: page.services || [],
      credentials: page.credentials || [],
      projects: page.projects || [],
      published: Boolean(page.published),
      logoUrl: page.logoUrl || "",
      coverImageUrl: page.coverImageUrl || "",
      views: page.views || 0,
      emergencyService: page.emergencyService || defaultCompany.emergencyService,
      weekendService: page.weekendService || defaultCompany.weekendService,
    });

    const normalizedTeam = (page.team || []).map((m) => ({
      ...m,
      id: m._id ? m._id.toString() : m.id,
      _id: m._id ? m._id.toString() : m.id,
    }));
    setTeam(normalizedTeam);
  };

  const fetchCompanyPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getMyCompanyPage(token);
      syncFromPage(data);
    } catch (err) {
      console.error("Failed to load company page:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchCrew = useCallback(async () => {
    try {
      setCrewLoading(true);
      const token = await getToken();
      const data = await getMyTeam(token);
      setCrew(data);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setCrewLoading(false);
    }
  }, [getToken]);

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const token = await getToken();
      const data = await getMyCompanyRequests(token);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load company requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCompanyPage();
    fetchCrew();
    fetchRequests();
  }, [fetchCompanyPage, fetchCrew, fetchRequests]);

  // Calculates the real number of pending requests for the badge
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "pending").length;
  }, [requests]);

  const updateCompany = (patch) => {
    setCompany((prev) => ({ ...prev, ...patch }));
  };

  const saveCompany = async (extraFields = {}) => {
    const token = await getToken();
    const payload = { ...company, ...extraFields };
    const updated = await updateMyCompanyPage(payload, token);
    syncFromPage(updated);
    return updated;
  };

  const addMember = async (memberData) => {
    const token = await getToken();
    const updated = await apiAddKeyPersonnel(memberData, token);
    syncFromPage(updated);
    return updated;
  };

  const removeMember = async (memberId) => {
    const targetId = typeof memberId === "object" ? (memberId._id || memberId.id) : memberId;
    if (!targetId || targetId === "undefined") return;

    const previousTeam = [...team];
    setTeam((prev) => prev.filter((m) => (m._id || m.id) !== targetId));

    try {
      const token = await getToken();
      const updated = await apiRemoveKeyPersonnel(targetId, token);
      syncFromPage(updated);
      return updated;
    } catch (err) {
      setTeam(previousTeam);
      throw err;
    }
  };

  const addCrewMember = async (memberData) => {
    const token = await getToken();
    const created = await apiAddCrewMember(memberData, token);
    setCrew((prev) => [...prev, created]);
    return created;
  };

  const removeCrewMember = async (memberId) => {
    const previousCrew = [...crew];
    setCrew((prev) => prev.filter((m) => m._id !== memberId));

    try {
      const token = await getToken();
      await apiRemoveCrewMember(memberId, token);
    } catch (err) {
      setCrew(previousCrew);
      throw err;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        company,
        updateCompany,
        saveCompany,
        team,
        addMember,
        removeMember,
        crew,
        crewLoading,
        addCrewMember,
        removeCrewMember,
        requests,
        requestsLoading,
        pendingRequestsCount,
        refetchRequests: fetchRequests,
        loading,
        error,
        refetch: fetchCompanyPage,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}