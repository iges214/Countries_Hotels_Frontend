import {
  getAllCountries,
  getCountry,
  getTimezone,
} from "countries-and-timezones";
import type { CityData } from "city-timezones";

function normalize(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

export function countryTimeZones(shortName: string, name: string) {
  return (
    getCountry(shortName.trim().toUpperCase()) ??
    Object.values(getAllCountries()).find(
      (country) => normalize(country.name) === normalize(name),
    )
  );
}

export function findCityTimeZone(
  cities: CityData[],
  zones: readonly string[],
  city: string,
  state: string,
) {
  const cityName = normalize(city);
  const stateName = normalize(state).replace(/ state$/, "");
  const matches = cities.filter(
    (entry) =>
      [entry.city, entry.city_ascii, entry.exactCity].some(
        (name) => normalize(name) === cityName,
      ) &&
      (!stateName ||
        [entry.province, entry.exactProvince, entry.state_ansi].some(
          (name) => normalize(name).replace(/ state$/, "") === stateName,
        )),
  );
  const matchingZones = new Set(
    matches.map(({ timezone }) =>
      zones.includes(timezone)
        ? timezone
        : getTimezone(timezone)?.aliasOf || timezone,
    ),
  );
  if (matchingZones.size !== 1) return "";
  const [zone] = matchingZones;
  return zones.includes(zone) ? zone : "";
}

const africanAbbreviations: Record<string, string> = {
  "Africa/Lagos": "WAT",
  "Africa/Maputo": "CAT",
  "Africa/Nairobi": "EAT",
  "Africa/Johannesburg": "SAST",
};

export function timeZoneLabel(zone: string) {
  const canonical = getTimezone(zone)?.aliasOf || zone;
  const abbreviation = africanAbbreviations[canonical];
  try {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts()
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "UTC");
    return `${abbreviation ? `${abbreviation} (${offset})` : offset} · ${zone}`;
  } catch {
    return zone;
  }
}
