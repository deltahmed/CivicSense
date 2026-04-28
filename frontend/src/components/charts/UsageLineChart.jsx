import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatDate = (tickItem) => {
  return new Date(tickItem).toLocaleDateString();
};

const formatTooltip = (label) => {
  return new Date(label).toLocaleString();
};

const UsageLineChart = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis />
          <Tooltip labelFormatter={formatTooltip} />
          <Legend />
          <Line type="monotone" dataKey="valeur" name="Consommation" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UsageLineChart;