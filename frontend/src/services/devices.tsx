import axios from "axios";

export const fetchDevices = async () => {
    try {
        const config = {
          url: 'https://api.safecast.org/en-US/measurements?device_id=330132&format=json&order=captured_at+desc',
          method: 'GET',
          headers: {
              'Access-Control-Allow-Origin': '*' ,
              // 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              // 'Access-Control-Allow-Headers': '*, X-Requested-With',
              // 'Access-Control-Max-Age': 100000,
              // 'Cache-Control': 'max-age=0, private, must-revalidate0',
              'Content-Type': 'application/json; charset=utf-8',
              'X-Content-Type-Options': 'nosniff',
              // 'Referrer-Policy': 'strict-origin-when-cross-origin',
              // 'X-Download-Options': 'noopen',
              // 'X-Frame-Options': 'SAMEORIGIN',
              // 'X-XSS-Protection': '1; mode=block'

          },
      };
      return axios(config); 
    } catch (error) {
      console.error('Error fetching options:', error);
    }
};
