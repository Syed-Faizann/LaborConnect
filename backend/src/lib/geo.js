// backend/src/lib/geo.js

// 1. Calculate distance between two coordinates in miles (Haversine Formula)
export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 3958.8; // Radius of Earth in miles
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// 2. Global Geocoding with Smart Multi-Tier Candidates (Worldwide Support)
export async function geocodeAddress(addressStr) {
  if (!addressStr || typeof addressStr !== "string") return null;

  const raw = addressStr.trim();
  if (!raw) return null;

  const candidates = [raw];

  // 1. Clean out street numbers, house numbers, plaza, floor, suite, etc.
  const cleanedArea = raw
    .replace(/\b(street|st|lane|house|plot|h\.?no|st\.?no|plaza|suite|apt|floor|building)\b\s*[#№]?\s*[\d\w-]*/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();

  if (cleanedArea && cleanedArea !== raw) {
    candidates.push(cleanedArea);
  }

  // 2. Parse comma-separated parts (e.g. "Main Address, City, State, Country")
  const parts = raw
    .split(/[,–-]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    // Try without street name (e.g. City, State, Country)
    candidates.push(parts.slice(1).join(", "));
    // Try building/area + country
    candidates.push(`${parts[0]}, ${parts[parts.length - 1]}`);
    // If 3 or more parts, try city + country
    if (parts.length >= 3) {
      candidates.push(`${parts[parts.length - 2]}, ${parts[parts.length - 1]}`);
    }
  }

  // Deduplicate candidate queries to avoid unnecessary requests
  const uniqueCandidates = [...new Set(candidates.filter((c) => c && c.length >= 2))];

  // Query OpenStreetMap globally
  for (const candidate of uniqueCandidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        candidate
      )}&limit=1`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "LaborConnectPlatform/1.0 (contact@laborconnect.com)",
        },
      });

      if (!res.ok) continue;
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(parseFloat(data[0].lat).toFixed(7)),
          lng: parseFloat(parseFloat(data[0].lon).toFixed(7)),
          displayName: data[0].display_name,
        };
      }
    } catch (_) {
      // Continue to next candidate
    }
  }

  return null;
}

// Helper: Resolve address or fallback to city worldwide
export async function resolveCustomerLocation(address, city, country = "") {
  const fullAddress = [address, city, country].filter(Boolean).join(", ");

  // 1. Try full address first
  let coords = await geocodeAddress(fullAddress);
  if (coords) return coords;

  // 2. Fallback: Try city + country
  const cityCountry = [city, country].filter(Boolean).join(", ");
  if (cityCountry && cityCountry.trim() !== fullAddress.trim()) {
    coords = await geocodeAddress(cityCountry);
    if (coords) return coords;
  }

  // 3. Fallback: Try base city name if composite (e.g., "Austin" from "Austin, Travis")
  if (city && city.includes(",")) {
    const mainCity = city.split(",")[0].trim();
    coords = await geocodeAddress([mainCity, country].filter(Boolean).join(", "));
    if (coords) return coords;
  }

  return null;
}

// 3. Fallback: Customer IP address
export async function geocodeIp(ip) {
  const cleanIp = ip ? ip.replace(/^.*:/, "") : "";
  if (!cleanIp || cleanIp === "127.0.0.1" || cleanIp === "localhost") return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${cleanIp}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success") {
      return {
        lat: parseFloat(parseFloat(data.lat).toFixed(7)),
        lng: parseFloat(parseFloat(data.lon).toFixed(7)),
        city: data.city,
        region: data.regionName,
        country: data.country,
      };
    }
  } catch (err) {
    console.error("IP lookup failed:", err.message);
  }
  return null;
}