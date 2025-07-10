import React, { createContext, useContext, useState, useCallback } from 'react';

const RatingContext = createContext();

export const useRating = () => useContext(RatingContext);

export const RatingProvider = ({ children }) => {
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const refreshRatings = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  return (
    <RatingContext.Provider value={{ lastUpdated, refreshRatings }}>
      {children}
    </RatingContext.Provider>
  );
}; 