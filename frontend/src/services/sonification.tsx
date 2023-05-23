import axios from 'axios';
import { Device } from '../App';

const serverUrl = 'http://127.0.0.1:5000'; // Update with server URL


export const startSonification = async (data: Device[])=> {
  try {
    const endPoint = '/predict';

    const mapping = data.map((sensor) => ({
        component: sensor.component,
        device: sensor.device,
      }));

    const config = {
      url: `${serverUrl}${endPoint}`,
      method: 'POST',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: {mapping, format: 'base64'},
    };
    return axios(config);

  } catch (error) {
    console.error('Error fetching options:', error);
  }
};
