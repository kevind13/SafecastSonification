import React, { useEffect, useState } from 'react';
import style from './App.module.css';
import Footer from './components/Footer/Footer';
import Button from './components/Button/Button';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { PulseLoader } from 'react-spinners';
import { fetchDevices } from './services/devices';
import { MidiPlayer } from 'midi-sounds-react';


type Sensor = {
  id: number;
  sensor: string | undefined;
  component: number | undefined;
};

export type Device = {
  id: number;
  manufacturer: any;
  model: any;
  sensor: any;
  number_measurements: number | undefined;
};

function App() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Device[]>([])

  const addSensor = () => {
    const newSensor: Sensor = {
      id: sensors.length + 1,
      sensor: undefined,
      component: undefined,
    };

    setSensors([...sensors, newSensor]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchDevices();
        // const response = await fetch('https://api.safecast.org/devices/'); 
        console.log(response)
        // if (response) {
        //   const data = await response.json();
        //   const options = data.map((item: any) => ({
        //     value: item.id,
        //     label: item.name,
        //   }));
        //   console.log(options);
        //   setDevices(options);
        // }
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchData();
  }, []);

  // Function to remove a sensor
  const removeSensor = (id: number) => {
    setSensors((prevSensors) => prevSensors.filter((sensor) => sensor.id !== id));
  };

  // Function to handle name change
  const handleNameChange = (id: number, newName: string) => {
    setSensors((prevSensors) =>
      prevSensors.map((sensor) => (sensor.id === id ? { ...sensor, name: newName } : sensor)),
    );
  };

  // Function to handle value change
  const handleValueChange = (id: number, newValue: number) => {
    setSensors((prevSensors) =>
      prevSensors.map((sensor) => (sensor.id === id ? { ...sensor, value: newValue } : sensor)),
    );
  };

  // https://api.safecast.org/devices.json
  const midiBase64 = "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"
  
  return (
    <div className={style.container}>
      <div className={style.title}>
        <h1>SONIFICATION OF SAFECAST SENSORS</h1>
        <div />
      </div>
      <audio autoPlay controls>
        <source
          src={midiBase64}
        />
        Your browser does not support the audio element.
      </audio>
      {loading && (
        <div className={style.loader}>
          <h2>Loading...</h2>
          <PulseLoader color="white" loading={loading} size={30} aria-label="Loading Spinner" data-testid="loader" />
        </div>
      )}
      {!loading && (
        <div className={style.content}>
          <div className={style.list}>
            {sensors.map((sensor) => (
              <div key={sensor.id} className={style.sensorRow}>
                <input
                  type="text"
                  value={sensor.sensor}
                  onChange={(e) => handleNameChange(sensor.id, e.target.value)}
                  className={style.sensorInput}
                />
                <input
                  type="text"
                  value={sensor.component}
                  onChange={(e) => handleValueChange(sensor.id, parseInt(e.target.value))}
                  className={style.sensorInput}
                />
                <button className={style.deleteButton} onClick={() => removeSensor(sensor.id)}>
                  <RiDeleteBin6Line />
                </button>
              </div>
            ))}
          </div>
          {sensors.length !== 7 && <Button title="Add more mappers" className={style.add} onClick={addSensor} />}
          {sensors.length >= 1 && <Button title="Start sonification" className={style.add} />}
        </div>
      )}
      <Footer />
    </div>
  );
}

export default App;
