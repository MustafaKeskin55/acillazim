"use client";

import React from 'react';

const AppointmentsPage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="appointments-page">
      {children}
    </div>
  );
};

export default AppointmentsPage;
