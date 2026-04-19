import { toast } from "sonner";

export interface LocationResult {
  coords: [number, number];
  name: string;
}

export const getCurrentLocation = (
  useHighAccuracy = true,
  timeout = 10000
): Promise<LocationResult> => {
  return new Promise(async (resolve, reject) => {
    if (!("geolocation" in navigator)) {
      // Fallback to IP immediately if geolocation is not supported
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          resolve({ 
            coords: [ipData.latitude, ipData.longitude], 
            name: `${ipData.city}, ${ipData.region}` 
          });
          return;
        }
      } catch (e) {
        reject(new Error("Geolocation not supported and IP fallback failed"));
        return;
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=mdsecondary810432@gmail.com`, {
            headers: {
              'Accept-Language': 'en'
            }
          });
          const data = await res.json();
          // Use display_name for the exact full address, fallback to specific fields if not available
          const name = data.display_name || data.address?.road || data.address?.suburb || data.address?.city || data.address?.town || data.address?.state || "Current Location";
          resolve({ coords: [lat, lng], name });
        } catch (error) {
          resolve({ coords: [lat, lng], name: "Current Location" });
        }
      },
      async (error) => {
        // If high accuracy fails, try low accuracy
        if (useHighAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
          getCurrentLocation(false, 15000).then(resolve).catch(reject);
          return;
        }

        // If permission is denied OR low accuracy also fails, use IP-based fallback
        try {
          console.log("GPS failed or denied, trying IP-based location...");
          const ipRes = await fetch('https://ipapi.co/json/');
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            resolve({ 
              coords: [ipData.latitude, ipData.longitude], 
              name: `${ipData.city}, ${ipData.region} (Approx)` 
            });
          } else {
            reject(error);
          }
        } catch (ipError) {
          reject(error); // Return original GPS error if IP fallback also fails
        }
      },
      { 
        enableHighAccuracy: useHighAccuracy, 
        timeout: timeout, 
        maximumAge: 60000 
      }
    );
  });
};
