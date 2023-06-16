import React from 'react';
import Plot from 'react-plotly.js';
import { Device } from '../../App';

const removeEndingZeros = (arr: number[]) => {
  let index = arr.length - 1;
  while (index >= 0 && arr[index] === 0) {
    index--;
  }
  return arr.slice(0, index + 1);
};

export interface PlotMidiArrayProps {
    array: number[][];
    title: string;
    xLabel: string;
    yLabel: string;
    devices: Device[];
    showLegend: boolean;
  }
const PlotMidiArray = ({ array, title, xLabel, yLabel, devices, showLegend }: PlotMidiArrayProps) => {
  const colors = ['blue', 'green', 'orange', 'red'];
  const data = [];

  for (let i = 0; i < array.length; i++) {
    const notes = array[i].map((value) => value);
    const nonZeroNotes = removeEndingZeros(notes);

    const trace = {
      x: nonZeroNotes.map((_, index) => index),
      y: nonZeroNotes,
      mode: 'markers',
      type: 'scatter',
      marker: {
        symbol: '_',
        color: colors[i],
      },
      name: `Device ${devices[i].device}`,
    };

    data.push(trace);
  }

  const layout = {
    title,
    xaxis: {
      title: xLabel,
    },
    yaxis: {
      title: yLabel,
    },
    showlegend: showLegend,
    width: 500,
    height: 300,
  };

  return <Plot data={data} layout={layout} />;
};

export default PlotMidiArray;
