export const getLocation = async (ip: string | undefined): Promise<{ city: string | null, countryCode: string | null, latitude: number | null, longitude: number | null }> => {
  if (!ip) return { city: null, countryCode: null, latitude: null, longitude: null };
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json() as { city: string, countryCode: string, lat: number, lon: number };
    return {
      city: data.city,
      countryCode: data.countryCode,
      latitude: data.lat,
      longitude: data.lon,
    };
  } catch (error) {
    return { city: null, countryCode: null, latitude: null, longitude: null };
  }
}
