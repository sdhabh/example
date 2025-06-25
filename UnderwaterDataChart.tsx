import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
  }[];
};

export default function UnderwaterDataChart() {
  const data: ChartData = {
    labels: ['06:00', '08:00', '10:00', '12:00', '14:00'],
    datasets: [
      {
        label: '水温 (°C)',
        data: [7.8, 8.1, 8.5, 8.3, 8.6],
        borderColor: '#4dc9f6',
        tension: 0.4
      },
      {
        label: '压强 (kPa)',
        data: [103.5, 102.8, 102.4, 103.1, 101.9],
        borderColor: '#a3daff',
        tension: 0.4
      }
    ]
  };

  return (
    <div className="chart-container">
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: '水下环境趋势分析' }
          },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.1)' } },
            x: { grid: { color: 'rgba(255,255,255,0.1)' } }
          }
        }}
      />
    </div>
  );
}