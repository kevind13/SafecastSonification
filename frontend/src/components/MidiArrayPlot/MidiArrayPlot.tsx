import React from 'react';
import { Line } from 'react-chartjs-2';

export interface MidiArrayPlotProps {
  array: number[][];
  title: string;
  xLabel: string;
  yLabel: string;
  showLegend: boolean;
}

const MidiArrayPlot = ({ array, title, xLabel, yLabel, showLegend }: MidiArrayPlotProps) => {
  const colors = ['blue', 'green', 'orange', 'red'];
  const datasets = [];

  for (let i = 0; i < array.length; i++) {
    const notes = array[i].map((value, index) => (value > 0 ? index + 1 : null)).filter(Boolean);
    datasets.push({
      label: `Track ${i + 1}`,
      data: notes,
      borderColor: colors[i],
      pointStyle: '_',
      pointRadius: 0,
      fill: false,
    });
  }

  const data = {
    labels: Array.from({ length: datasets[0].data.length }, (_, i) => i.toString()),
    datasets: datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: title,
    },
    scales: {
      xAxes: [
        {
          scaleLabel: {
            display: xLabel ? true : false,
            labelString: xLabel,
          },
        },
      ],
      yAxes: [
        {
          scaleLabel: {
            display: yLabel ? true : false,
            labelString: yLabel,
          },
        },
      ],
    },
    legend: {
      display: showLegend,
    },
  };

  // return <Line data={data} options={options} />;
};

export default MidiArrayPlot;
