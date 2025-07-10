import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, FlatList, Keyboard, Animated, StatusBar, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useRequest } from '../context/RequestContext';
import { lightMapStyle, darkMapStyle } from '../theme/mapStyles';
import { Text, Card, Button } from '../components';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  confirm_location: 'اپنا مقام تصدیق کریں',
  search_placeholder: 'مقام تلاش کریں (مثلاً گلشن اقبال بلاک 6)',
  address_placeholder: 'گھر نمبر، گلی کا نام، وغیرہ',
  search: 'تلاش کریں',
  finding_locations: 'مقامات تلاش کیے جا رہے ہیں...',
  please_select_location: 'براہ کرم نقشے پر اپنا درست مقام منتخب کریں اور ڈاکٹر کے لیے پتہ فراہم کریں۔',
  go_back: 'واپس جائیں',
  location_required: 'مقام درکار ہے',
  select_location_first: 'براہ کرم پہلے اپنا مقام منتخب کریں۔',
};

const LocationScreen = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const { activeRequestId, activeRequestData, loading: requestLoading, checkForActiveRequest } = useRequest();
  const { language } = useLanguage();
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        
        // Check for active request first
        await checkForActiveRequest();
        
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        // Get current location
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation.coords);
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not fetch your location. Please try again.');
        setIsLoading(false);
      }
    })();
  }, []);

  // Effect to check for active request and redirect if needed
  useEffect(() => {
    if (!requestLoading && activeRequestId && activeRequestData) {
      // User has an active request, redirect to Map screen
      Alert.alert(
        'Active Request Found',
        'You already have an active doctor request. Redirecting to your current request.',
        [{ text: 'OK', onPress: () => navigation.navigate('Map', { fromBooking: true }) }]
      );
    }
  }, [requestLoading, activeRequestId, activeRequestData, navigation]);

  // Check for active request when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check for active request when screen comes into focus
      checkForActiveRequest();
    });

    return unsubscribe;
  }, [navigation, checkForActiveRequest]);

  // Function to get location suggestions as user types
  const getSuggestions = async (text) => {
    if (text.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // Try multiple search queries to get more comprehensive results
      // First, search with just the text to get broader results
      const directQuery = text;
      
      // Then, add Pakistan to focus on Pakistani locations
      const pakistanQuery = `${text}, Pakistan`;
      
      // Also try with specific major cities to get more varied results
      const cityQueries = [
        `${text}, Karachi, Pakistan`,
        `${text}, Lahore, Pakistan`,
        `${text}, Islamabad, Pakistan`,
        `${text}, Rawalpindi, Pakistan`,
        `${text}, Faisalabad, Pakistan`
      ];
      
      // Combine all queries for better coverage
      const allQueries = [directQuery, pakistanQuery, ...cityQueries];
      
      // Create an array to hold all results
      let allResults = [];
      
      // Process each query in parallel
      const queryPromises = allQueries.map(async (query) => {
        try {
          // Use geocodeAsync with increased maxResults
          const results = await Location.geocodeAsync(query, {
            useGoogleMaps: true,  // Use Google Maps for better results
            maxResults: 20        // Increase max results for more variety
          });
          
          return results;
        } catch (e) {
          console.log(`Error with query "${query}": ${e.message}`);
          return [];
        }
      });
      
      // Wait for all queries to complete
      const queryResults = await Promise.all(queryPromises);
      
      // Flatten the results array
      allResults = queryResults.flat();
      
      // Remove duplicates based on coordinates
      const uniqueCoords = new Map();
      allResults.forEach(result => {
        const key = `${result.latitude.toFixed(5)}-${result.longitude.toFixed(5)}`;
        uniqueCoords.set(key, result);
      });
      
      allResults = Array.from(uniqueCoords.values());
      
      console.log(`Found ${allResults.length} unique locations for "${text}"`); 
      
      // If we have coordinates, get address details for each
      if (allResults.length > 0) {
        const suggestionsPromises = allResults.map(async (result) => {
          const { latitude, longitude } = result;
          const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (addresses.length > 0) {
            const address = addresses[0];
            
            // Only include results from Pakistan
            if (address.country !== 'Pakistan' && address.country !== 'PK') {
              return null;
            }
            
            // Create a more detailed formatted address for display
            const addressComponents = [
              address.name,
              address.street,
              address.district,
              address.city,
              address.region
            ].filter(Boolean);
            
            // Add "Pakistan" at the end for clarity
            if (addressComponents.length > 0) {
              addressComponents.push('Pakistan');
            }
            
            return {
              id: `${latitude}-${longitude}`,
              description: addressComponents.join(', '),
              coords: { latitude, longitude },
              fullAddress: address
            };
          }
          return null;
        });
        
        const suggestionsResults = await Promise.all(suggestionsPromises);
        // Filter out null results
        const filteredResults = suggestionsResults.filter(Boolean);
        
        // Create a map to deduplicate similar results
        const uniqueResults = [];
        const seenDescriptions = new Set();
        
        filteredResults.forEach(result => {
          // Only add if we haven't seen this exact description before
          if (!seenDescriptions.has(result.description)) {
            seenDescriptions.add(result.description);
            uniqueResults.push(result);
          }
        });
        
        console.log(`Displaying ${uniqueResults.length} suggestions for "${text}"`);
        setSuggestions(uniqueResults);
        setShowSuggestions(uniqueResults.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounce search input to prevent too many API calls
  const handleSearchInputChange = (text) => {
    setSearchLocation(text);
    setShowSuggestions(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      getSuggestions(text);
    }, 300); // Reduced from 500ms to 300ms for better responsiveness
  };
  
  // Handle selection of a suggestion
  const handleSelectSuggestion = (suggestion) => {
    setSearchLocation(suggestion.description);
    setLocation(suggestion.coords);
    
    // Set address details from the suggestion
    const address = suggestion.fullAddress;
    const detailsComponents = [
      address.name,
      address.streetNumber,
      address.street,
      address.district,
      address.subregion
    ].filter(Boolean);
    
    if (detailsComponents.length > 0) {
      setAddressDetails(detailsComponents.join(', '));
    }
    
    // Hide suggestions after selection
    setShowSuggestions(false);
    Keyboard.dismiss();
  };
  
  const handleLocationSearch = async () => {
    if (searchLocation.trim() === '') return;
    
    try {
      const result = await Location.geocodeAsync(searchLocation);
      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        setLocation({ latitude, longitude });
        
        // Get detailed address information after setting the location
        getDetailedAddress({ latitude, longitude });
      } else {
        Alert.alert('Location not found', 'Please try a different location');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Could not search for this location');
    }
    
    // Hide suggestions after search
    setShowSuggestions(false);
    Keyboard.dismiss();
  };
  
  // Function to get detailed address from coordinates
  const getDetailedAddress = async (coordinates) => {
    try {
      const addresses = await Location.reverseGeocodeAsync(coordinates);
      if (addresses.length > 0) {
        const address = addresses[0];
        
        // Create a more detailed address format including all available fields
        const addressComponents = [
          address.name,                // Building name/number
          address.streetNumber,        // Street number
          address.street,              // Street name
          address.district,            // District/neighborhood
          address.subregion,           // Subregion (e.g., block number)
          address.city,                // City
          address.region,              // Region/state/province
          address.postalCode,          // Postal code
          address.country              // Country
        ].filter(Boolean); // Remove any undefined or empty values
        
        // Join all available address components
        const formattedAddress = addressComponents.join(', ');
        console.log('Detailed address:', formattedAddress);
        console.log('Raw address data:', address);
        
        // Set the search location to the formatted address
        setSearchLocation(formattedAddress);
        
        // Pre-fill the address details field with building-specific info
        const detailsComponents = [
          address.name,
          address.streetNumber,
          address.street,
          address.district,
          address.subregion
        ].filter(Boolean);
        
        if (detailsComponents.length > 0) {
          setAddressDetails(detailsComponents.join(', '));
        }
      }
    } catch (error) {
      console.error('Error getting detailed address:', error);
    }
  };

  const confirmLocation = async () => {
    if (location) {
      // Check for active request again before proceeding
      const activeRequest = await checkForActiveRequest();
      
      if (activeRequest) {
        // User has an active request, redirect to Map screen
        Alert.alert(
          'Active Request Found',
          'You already have an active doctor request. Redirecting to your current request.',
          [{ text: 'OK', onPress: () => navigation.navigate('Map', { fromBooking: true }) }]
        );
      } else {
        // No active request, proceed to booking
        navigation.navigate('Booking', { 
          userLocation: location,
          addressDetails: addressDetails.trim() ? addressDetails : searchLocation
        });
      }
    } else {
      Alert.alert(
        language === 'ur' ? urduText.location_required : 'Location Required',
        language === 'ur' ? urduText.select_location_first : 'Please select your location on the map',
      );
    }
  };

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  
  // Animation effect on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Function to provide haptic feedback on button press
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading || requestLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" size="lg" color={colors.primary} style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text variant="body" size="lg" color={colors.error} style={styles.errorText}>{errorMsg}</Text>
          <Button
            variant="primary"
            size="medium"
            icon="arrow-back"
            onPress={() => {
              triggerHaptic();
              navigation.goBack();
            }}
          >
            {language === 'ur' ? urduText.go_back : 'Go Back'}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.buttonText} />
        </TouchableOpacity>
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{language === 'ur' ? urduText.confirm_location : 'Confirm Your Location'}</Text>
      </LinearGradient>
      
      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }}>
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          zoomEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          showsBuildings={true}
          showsTraffic={true}
          showsIndoors={true}
          showsCompass={true}
          showsScale={true}
          onPress={(e) => {
            // Update location when user taps on the map
            const newCoordinate = e.nativeEvent.coordinate;
            setLocation(newCoordinate);
            
            // Animate to the new location
            mapRef.current?.animateToRegion({
              ...newCoordinate,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 300); // 300ms animation duration
            
            // Add haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            // Get detailed address from coordinates for better UX
            getDetailedAddress(newCoordinate);
          }}
        >
          {/* User's location marker - now draggable with animations */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Your Location"
            pinColor="blue"
            draggable
            tracksViewChanges={false}
            onDragStart={() => {
              // Add haptic feedback when drag starts
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onDrag={(e) => {
              // Update location in real-time during drag for smooth experience
              const newCoordinate = e.nativeEvent.coordinate;
              setLocation(newCoordinate);
              
              // Animate map to follow the marker during drag
              mapRef.current?.animateToRegion({
                ...newCoordinate,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 100); // Fast animation during drag
            }}
            onDragEnd={(e) => {
              // Update location when drag ends
              const newCoordinate = e.nativeEvent.coordinate;
              setLocation(newCoordinate);
              
              // Get detailed address from new coordinates
              getDetailedAddress(newCoordinate);
              
              // Add haptic feedback when drag ends
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          />
        </MapView>
      )}

      {/* Scrollable content area */}
      <ScrollView 
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollableContentContainer}
      >
        {/* Location search inputs */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder={language === 'ur' ? urduText.search_placeholder : 'Search location (e.g., Gulshan e Iqbal Block 6)'}
              placeholderTextColor={colors.placeholder}
              value={searchLocation}
              onChangeText={handleSearchInputChange}
              onSubmitEditing={handleLocationSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={handleLocationSearch}>
              <Text style={[styles.searchButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.search : 'Search'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Location suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {isSearching ? (
                <View style={styles.loadingSuggestionsContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingSuggestionsText, { color: colors.text }]}>{language === 'ur' ? urduText.finding_locations : 'Finding locations...'}</Text>
                </View>
              ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
          
          <TextInput
            style={[styles.addressInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder={language === 'ur' ? urduText.address_placeholder : 'House number, street name, etc.'}
            placeholderTextColor={colors.placeholder}
            value={addressDetails}
            onChangeText={setAddressDetails}
          />
        </View>

        {/* Location confirmation message */}
        <Card 
          variant="elevated" 
          elevation={2}
          style={styles.confirmationContainer}
        >
          <View style={styles.confirmationIconContainer}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          </View>
          <Text variant="body" color={colors.primary} style={styles.confirmationText}>{language === 'ur' ? urduText.please_select_location : 'Please select your exact location on the map and provide address details for the doctor to find you easily.'}</Text>
        </Card>

        {/* Confirm location button */}
        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            size="large"
            icon="checkmark-circle-outline"
            fullWidth
            style={styles.confirmButton}
            onPress={() => {
              triggerHaptic();
              confirmLocation();
            }}
          >
            {language === 'ur' ? urduText.confirm_location : 'Confirm Location'}
          </Button>
        </View>
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? 40 : 16,
    },
    backButton: {
      marginRight: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitle: {
      fontSize: 20,
    },
    map: {
      width: '100%',
      height: '60%',
    },
    scrollableContent: {
      flex: 1,
    },
    scrollableContentContainer: {
      paddingBottom: 20,
    },
    searchContainer: {
      padding: 15,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 1,
    },
    searchInputContainer: {
      flexDirection: 'row',
      marginBottom: 10,
      zIndex: 2,
    },
    searchInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 5,
      paddingHorizontal: 10,
      marginRight: 10,
      backgroundColor: '#f9f9f9',
    },
    searchButton: {
      backgroundColor: '#0066CC',
      borderRadius: 5,
      paddingHorizontal: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    suggestionsContainer: {
      maxHeight: 200,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 5,
      marginBottom: 10,
      backgroundColor: colors.card,
      zIndex: 3,
      elevation: 3,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    suggestionsList: {
      width: '100%',
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    suggestionText: {
      fontSize: 14,
    },
    loadingSuggestionsContainer: {
      padding: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    loadingSuggestionsText: {
      marginLeft: 10,
      fontSize: 14,
    },
    addressInput: {
      height: 40,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 5,
      paddingHorizontal: 10,
      backgroundColor: '#f9f9f9',
    },
    confirmationContainer: {
      padding: 15,
      marginTop: 10,
      marginHorizontal: 15,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    confirmationIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 102, 204, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    confirmationText: {
      flex: 1,
    },
    confirmButton: {
      marginHorizontal: 15,
      marginTop: 15,
      marginBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      marginVertical: 20,
      textAlign: 'center',
    },
    buttonContainer: {
      backgroundColor: colors.card,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
      paddingHorizontal: 15,
      marginTop: 15,
    },
    confirmButton: {
      marginBottom: 0,
    },
  });
};

export default LocationScreen;