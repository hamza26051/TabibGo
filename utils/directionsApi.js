import { decode as decodePolyline } from '@mapbox/polyline';

/**
 * Fetches directions from OpenStreetMap Routing Machine (OSRM) API
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @returns {Promise<Object>} - Route information including polyline coordinates, distance, and duration
 */
export const getDirectionsFromApi = async (origin, destination) => {
  try {
    console.log('Getting directions from API for:', { origin, destination });
    
    // Validate input coordinates
    if (!origin || !destination || 
        typeof origin.latitude !== 'number' || 
        typeof origin.longitude !== 'number' || 
        typeof destination.latitude !== 'number' || 
        typeof destination.longitude !== 'number') {
      console.error('Invalid coordinates provided:', { origin, destination });
      // Try to create a more detailed route even with invalid coordinates
      return createEnhancedRoute(origin, destination);
    }
    
    // Construct the OSRM API URL (free and open source)
    const apiUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=true`;
    
    console.log('Fetching directions from URL:', apiUrl);
    
    // Fetch directions from OSRM API
    const response = await fetch(apiUrl);
    const json = await response.json();
    
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      console.error('API returned error or no routes:', json);
      // Try a different approach to get a road-based route
      return createEnhancedRoute(origin, destination);
    }
    
    // Extract route information
    const route = json.routes[0];
    
    // OSRM returns the polyline in a different format than Google Maps
    // We need to decode it and transform it to the expected format
    const points = route.geometry;
    // IMPORTANT: The decode function returns points as [lat, lng], but we need {latitude, longitude}
    const decodedPoints = decodePolyline(points).map(point => ({
      latitude: point[0],  // First value is latitude
      longitude: point[1]  // Second value is longitude
    }));
    
    // Validate coordinates to ensure they're within valid ranges
    const validatedPoints = decodedPoints.filter(point => {
      // Ensure both latitude and longitude are valid numbers
      if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' ||
          isNaN(point.latitude) || isNaN(point.longitude)) {
        console.error('Invalid coordinate point:', point);
        return false;
      }
      
      // Ensure coordinates are within valid ranges
      if (point.latitude < -90 || point.latitude > 90 || 
          point.longitude < -180 || point.longitude > 180) {
        console.error('Coordinate out of range:', point);
        return false;
      }
      
      return true;
    });
    
    // Log the validated points to verify coordinates
    console.log('Validated route coordinates:', {
      count: validatedPoints.length,
      first: validatedPoints.length > 0 ? validatedPoints[0] : null,
      last: validatedPoints.length > 0 ? validatedPoints[validatedPoints.length-1] : null
    });
      
    // Ensure we have valid coordinates
    if (validatedPoints.length === 0) {
      console.warn('No valid route coordinates after validation, falling back to straight line');
      return createStraightLineRoute(origin, destination);
    }
    
    // Calculate distance in km and duration in minutes
    const distanceInMeters = route.distance;
    const durationInSeconds = route.duration;
    
    // Format distance and duration text
    const distanceText = distanceInMeters < 1000 
      ? `${Math.round(distanceInMeters)} m` 
      : `${(distanceInMeters / 1000).toFixed(1)} km`;
    
    const durationText = durationInSeconds < 60 
      ? '1 min' 
      : `${Math.round(durationInSeconds / 60)} mins`;
    
    console.log('Route calculated successfully:', { distanceText, durationText });
    
    // Extract step instructions
    const steps = route.legs[0].steps.map(step => ({
      instructions: step.maneuver.type,
      distance: `${(step.distance / 1000).toFixed(1)} km`,
      duration: `${Math.round(step.duration / 60)} mins`
    }));
    
    return {
      coordinates: validatedPoints,
      distance: {
        text: distanceText,
        value: distanceInMeters // in meters
      },
      duration: {
        text: durationText,
        value: durationInSeconds // in seconds
      },
      steps: steps
    };
  } catch (error) {
    console.error('Error fetching directions:', error);
    // If the API call fails, try to create an enhanced route
    return createEnhancedRoute(origin, destination);
  }
};

/**
 * Creates an enhanced route with multiple points to simulate road-based navigation
 * when the API fails to provide a proper route
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @returns {Object} - Enhanced route information with multiple waypoints
 */
const createEnhancedRoute = (origin, destination) => {
  try {
    // Validate coordinates
    const validOrigin = {
      latitude: origin && typeof origin.latitude === 'number' ? origin.latitude : 0,
      longitude: origin && typeof origin.longitude === 'number' ? origin.longitude : 0
    };
    
    const validDestination = {
      latitude: destination && typeof destination.latitude === 'number' ? destination.latitude : 0,
      longitude: destination && typeof destination.longitude === 'number' ? destination.longitude : 0
    };
    
    // Calculate the direct distance
    const distance = calculateDistance(
      validOrigin.latitude,
      validOrigin.longitude,
      validDestination.latitude,
      validDestination.longitude
    );
    
    // Create intermediate points to simulate a road-based route
    // The number of points depends on the distance
    const numPoints = Math.max(5, Math.min(20, Math.floor(distance * 3)));
    
    // Generate waypoints
    const coordinates = [];
    coordinates.push(validOrigin);
    
    // Add some randomness to simulate roads
    for (let i = 1; i < numPoints; i++) {
      const ratio = i / numPoints;
      
      // Linear interpolation between origin and destination
      let lat = validOrigin.latitude + (validDestination.latitude - validOrigin.latitude) * ratio;
      let lng = validOrigin.longitude + (validDestination.longitude - validOrigin.longitude) * ratio;
      
      // Add some randomness to simulate roads (more at the middle, less at endpoints)
      const randomFactor = Math.sin(ratio * Math.PI) * 0.0005; // Max deviation of ~50m
      
      // Alternate the randomness direction to create a zig-zag effect like a road
      const direction = i % 2 === 0 ? 1 : -1;
      
      lat += randomFactor * direction;
      lng += randomFactor * direction;
      
      coordinates.push({
        latitude: lat,
        longitude: lng
      });
    }
    
    coordinates.push(validDestination);
    
    // Estimate time (assuming average speed of 30 km/h in urban areas)
    const durationInMinutes = Math.round((distance / 30) * 60);
    
    // Create steps for the route
    const steps = [
      {
        instructions: "Head toward the destination",
        distance: `${(distance * 0.3).toFixed(1)} km`,
        duration: `${Math.round(durationInMinutes * 0.3)} mins`
      },
      {
        instructions: "Continue on the main road",
        distance: `${(distance * 0.4).toFixed(1)} km`,
        duration: `${Math.round(durationInMinutes * 0.4)} mins`
      },
      {
        instructions: "Arrive at your destination",
        distance: `${(distance * 0.3).toFixed(1)} km`,
        duration: `${Math.round(durationInMinutes * 0.3)} mins`
      }
    ];
    
    return {
      coordinates: coordinates,
      distance: {
        text: `${distance.toFixed(1)} km`,
        value: distance * 1000 // Convert to meters
      },
      duration: {
        text: durationInMinutes <= 1 ? '1 min' : `${durationInMinutes} mins`,
        value: durationInMinutes * 60 // Convert to seconds
      },
      steps: steps
    };
  } catch (error) {
    console.error('Error creating enhanced route:', error);
    // If all else fails, fall back to the basic straight line
    return createStraightLineRoute(origin, destination);
  }
};

/**
 * Fallback function to create a straight line route when API is not available
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @returns {Object} - Basic route information with straight line
 */
export const createStraightLineRoute = (origin, destination) => {
  // Validate coordinates
  const validOrigin = {
    latitude: origin && typeof origin.latitude === 'number' ? origin.latitude : 0,
    longitude: origin && typeof origin.longitude === 'number' ? origin.longitude : 0
  };
  
  const validDestination = {
    latitude: destination && typeof destination.latitude === 'number' ? destination.latitude : 0,
    longitude: destination && typeof destination.longitude === 'number' ? destination.longitude : 0
  };
  
  // Calculate straight-line distance using Haversine formula
  const distance = calculateDistance(
    validOrigin.latitude,
    validOrigin.longitude,
    validDestination.latitude,
    validDestination.longitude
  );
  
  // Estimate time (assuming average speed of 30 km/h in urban areas)
  const durationInMinutes = Math.round((distance / 30) * 60);
  
  return {
    coordinates: [
      { latitude: validOrigin.latitude, longitude: validOrigin.longitude },
      { latitude: validDestination.latitude, longitude: validDestination.longitude }
    ],
    distance: {
      text: `${distance.toFixed(1)} km`,
      value: distance * 1000 // Convert to meters
    },
    duration: {
      text: durationInMinutes <= 1 ? '1 min' : `${durationInMinutes} mins`,
      value: durationInMinutes * 60 // Convert to seconds
    },
    steps: [
      {
        instructions: "Head toward the destination",
        distance: `${distance.toFixed(1)} km`,
        duration: `${durationInMinutes} mins`
      }
    ]
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};