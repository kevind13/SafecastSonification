import React, { useCallback, useState } from 'react';
import style from './App.module.css';
import Footer from './components/Footer/Footer';
import Button from './components/Button/Button';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { PulseLoader } from 'react-spinners';
import { startSonification } from './services/sonification';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import PlotMidiArray from './components/PlotMidiArray/PlotMidiArray';

export type Device = {
  id: number;
  device: string | undefined;
  component: number | undefined;
};

export type Notes = {
  note: number;
  time: number;
  type: 'note_on' | 'note_off';
  velocity: number;
};

const SynthOptions: Record<string, any> = {
  'Tone.FMSynth': Tone.FMSynth,
  'Tone.Synth': Tone.Synth,
  'Tone.AMSynth': Tone.AMSynth,
  'Tone.MonoSynth': Tone.MonoSynth,
};
// const synthOptions: Tone.SynthOptions = {
//   envelope: {
//     attack: 0.05,
//     attackCurve: 'exponential',
//     decay: 0.2,
//     decayCurve: 'exponential',
//     release: 1.5,
//     releaseCurve: 'exponential',
//     sustain: 0.2,
//   },
//   oscillator: {
//     phase: 0,
//     type: 'amtriangle',
//     harmonicity: 0.5,
//     modulationType: 'sine',
//   },
// };

// let synths: Tone.PolySynth<Tone.Synth<Tone.SynthOptions>>[] = [];
let synths: any[] = [];

function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [values, setValues] = useState<number[][] | undefined>();
  const [date, setDate] = useState<string | undefined>();

  const [envelope, setEnvelope] = useState({
    attack: 0.02,
    decay: 0.1,
    sustain: 0.3,
    release: 1,
  });

  const [selectedSynth, setSelectedSynth] = useState<string>('Tone.Synth');

  const [sonificationInterval, setSonificationInterval] = useState<NodeJS.Timeout | null>(null);

  const handleSliderChange = (e: any) => {
    const { name, value } = e.target;
    setEnvelope({ ...envelope, [name]: parseFloat(value) });
  };

  const updateSelectedSynth = (e: any) => {
    setSelectedSynth(e.target.value);
  };

  const addDevice = () => {
    setError('');
    const newDevice: Device = {
      id: devices.length + 1,
      device: undefined,
      component: undefined,
    };
    setDevices([...devices, newDevice]);
  };

  // Function to remove a sensor
  const removeDevice = (id: number) => {
    setError('');
    setDevices((prevDevices) => prevDevices.filter((device) => device.id !== id));
  };

  // Function to handle name change
  const handleDeviceChange = (id: number, newName: string) => {
    setDevices((prevDevices) =>
      prevDevices.map((device) => (device.id === id ? { ...device, device: newName } : device)),
    );
  };

  // Function to handle value change
  const handleComponentChange = (id: number, newValue: number | undefined) => {
    setDevices((prevDevices) =>
      prevDevices.map((device) => (device.id === id ? { ...device, component: newValue } : device)),
    );
  };

  const validateInputs = () => {
    const filteredDevices = devices.filter(
      (device) => device.component === undefined || !device.device || device.device.trim() === '',
    );

    if (filteredDevices.length) {
      setError('Fill all the inputs');
      return false;
    }

    const uniqueComponents = devices.map((device) => device.component);
    if (devices.length !== new Set(uniqueComponents).size) {
      setError('Duplicate component values are not allowed.');
      return false;
    }

    // Check for valid component values (between 1 and 7)
    const invalidComponents = uniqueComponents.filter((value) => value === undefined || value < 1 || value > 7);
    if (invalidComponents.length > 0) {
      setError('Component values should be between 1 and 7.');
      return false;
    }

    // All validations passed
    return true;
  };

  const convertDataToArrayBuffer = (data: string) => {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const handleStartSonification = async () => {
    try {
      setError('');

      const isValid = validateInputs();
      if (!isValid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await startSonification(devices, date, true);

      if (!data?.data) return;

      const arrayBuffer = convertDataToArrayBuffer(data.data.midi_base64);
      setValues(() => {
        return (data.data.values as number[]).map((value) => [value]);
      });
      const midi = new Midi(arrayBuffer);
      const now = Tone.now() + 0.5;
      midi.tracks.forEach((track) => {
        const synth = new Tone.PolySynth(SynthOptions[selectedSynth], {
          envelope: envelope,
        }).toDestination();

        synths.push(synth);

        track.notes.forEach((note) => {
          synth.triggerAttackRelease(note.name, note.duration, note.time + now, note.velocity);
        });
      });

      setSonificationInterval(
        setInterval(async () => {
          const data = await startSonification(devices);

          if (!data?.data) return;

          const arrayBuffer = convertDataToArrayBuffer(data.data.midi_base64);
          setValues((pV) => {
            if (!pV) return [];
            return pV.map((subArray, index) => [...subArray, data.data.values[index]]);
          });
          const midi = new Midi(arrayBuffer);
          const now = Tone.now();

          const temp_synths = [] as any;

          while (synths.length) {
            temp_synths.push(synths.shift());
          }

          midi.tracks.forEach((track) => {
            const synth = new Tone.PolySynth(Tone.FMSynth, {
              envelope: {
                attack: 0.02,
                decay: 0.1,
                sustain: 0.3,
                release: 1,
              },
            }).toDestination();

            synths.push(synth);

            //schedule all of the events
            track.notes.forEach((note) => {
              synth.triggerAttackRelease(note.name, note.duration, note.time + now, note.velocity);
            });
          });

          setTimeout(() => {
            while (temp_synths.length) {
              const synth = temp_synths.shift();
              if (synth) synth.disconnect();
            }
          }, 10);

          // setNotes(notes?.data);
        }, 22000),
      );
    } catch (e) {
      setError('An error occurred. Please try again.');
      console.error(error);
    }
  };

  const handleStopSonification = useCallback(() => {
    setLoading(false);
    setValues(undefined);
    if (sonificationInterval) {
      clearInterval(sonificationInterval);
      setSonificationInterval(null);
    }

    while (synths.length) {
      const synth = synths.shift();
      if (synth) synth.disconnect();
    }
  }, [sonificationInterval]);

  return (
    <div className={style.container}>
      <div className={style.title}>
        <h1>SONIFICATION OF SAFECAST DATA</h1>
        <div />
      </div>
      {loading && (
        <>
          <div className={style.playingSong}>
            <div className={style.loader}>
              <PulseLoader
                color="white"
                loading={loading}
                size={30}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </div>
            <Button title="Stop Sonification" className={style.add} onClick={handleStopSonification} />
          </div>
          {values !== undefined && (
            <div className={style.plotMidi}>
              <PlotMidiArray
                array={values}
                title="Devices data"
                xLabel="Time"
                yLabel="CPM"
                devices={devices}
                showLegend
              />
            </div>
          )}
        </>
      )}
      {!loading && (
        <div className={style.content}>
          <section>
            <h2>Instructions:</h2>
            <p>
              Please add the pair of values of the Safecast device ID and the main component of the latent space to be
              changed.
            </p>
            <p>
              The device IDs can be found at{' '}
              <a href="https://api.safecast.org/devices">https://api.safecast.org/devices</a>, but some examples of
              devices that send real-time information every 5 minutes are: <b>40, 107, 300022, 300021.</b>
            </p>
            <p>
              The values to be added as components of the latent space are values between 1 and 7 that correspond to
              each of the components.
            </p>
            <p>
              Select the date from which you want the sonification to start. This demo will take values every 10 seconds
              from a 5-minute data range. If no date is selected, the latest data from the database will be sonified.
            </p>
          </section>
          <div className={style.dateContainer}>
            <label className={style.label}>Selecciona la fecha:</label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className={style.select_container}>
            <label className={style.label}>Selecciona un sintetizador:</label>
            <select className={style.custom_select} value={selectedSynth} onChange={updateSelectedSynth}>
              <option value="Tone.Synth">Synth</option>
              <option value="Tone.FMSynth">FMSynth</option>
              <option value="Tone.AMSynth">AMSynth</option>
              <option value="Tone.MonoSynth">MonoSynth</option>
            </select>
            {/* <div className={style.select_arrow}>&#9660;</div> */}
          </div>
          <div className={style.envelope_sliders}>
            <div className={style.slider_container}>
              <label className={style.slider_label}>Attack: {envelope.attack}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.005"
                name="attack"
                value={envelope.attack}
                onChange={handleSliderChange}
              />
            </div>

            <div className={style.slider_container}>
              <label className={style.slider_label}>Decay: {envelope.decay}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.005"
                name="decay"
                value={envelope.decay}
                onChange={handleSliderChange}
              />
            </div>

            <div className={style.slider_container}>
              <label className={style.slider_label}>Sustain: {envelope.sustain}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                name="sustain"
                value={envelope.sustain}
                onChange={handleSliderChange}
              />
            </div>

            <div className={style.slider_container}>
              <label className={style.slider_label}>Release: {envelope.release}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.01"
                name="release"
                value={envelope.release}
                onChange={handleSliderChange}
              />
            </div>
          </div>
          <div className={style.buttons}>
            {devices.length !== 7 && <Button title={'Add a pair'} className={style.add} onClick={addDevice} />}
          </div>
          <div className={style.list}>
            {devices.length >= 1 && (
              <div className={style.inputTitle}>
                <h2>Safecast Device</h2>
                <h2>Principal component</h2>
              </div>
            )}
            {devices.map((device) => (
              <div key={device.id} className={style.deviceRow}>
                <input
                  type="text"
                  value={device.device}
                  onChange={(e) => handleDeviceChange(device.id, e.target.value)}
                  className={style.deviceInput}
                />
                <input
                  type="text"
                  value={device.component || ''}
                  onChange={(e) => {
                    const newValue = e.target.value.trim();
                    handleComponentChange(device.id, newValue === '' ? undefined : parseInt(newValue));
                  }}
                  className={style.deviceInput}
                />
                <button className={style.deleteButton} onClick={() => removeDevice(device.id)}>
                  <RiDeleteBin6Line />
                </button>
              </div>
            ))}
          </div>
          {devices.length >= 1 && (
            <Button title="Start sonification" className={style.add} onClick={handleStartSonification} />
          )}
          {error && <div className={style.error}>{error}</div>}
        </div>
      )}
      <Footer />
    </div>
  );
}

export default App;
