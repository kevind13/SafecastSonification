import axios from "axios";

export const fetchDevices = async () => {
    try {
        const config = {
          url: 'https://api.safecast.org/en-US/measurements?device_id=330132&format=json&order=captured_at+desc',
          method: 'GET',
          headers: {
              'Access-Control-Allow-Origin': '*' ,
              'Content-Type': 'application/json; charset=utf-8',
              'X-Content-Type-Options': 'nosniff',
          },
      };
      return axios(config); 
    } catch (error) {
      console.error('Error fetching options:', error);
    }
};
