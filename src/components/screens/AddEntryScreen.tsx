import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  BackHandler,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../styles/ThemeProvider';
import { getAddEntryStyles } from '../styles/AddEntryScreenStyle';
import { TravelEntry } from '../types';
import { saveEntry } from '../utilities/storage';
import { Feather } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type AddEntryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddEntry'>;

const { width } = Dimensions.get('window');

const generateId = () => {
  return `entry_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

const AddEntryScreen = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
 
  const { theme } = useTheme();
  const styles = getAddEntryStyles(theme);
  const navigation = useNavigation<AddEntryScreenNavigationProp>();
  const isFocused = useIsFocused();
  
 
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;


  const handleBackWithWarning = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel', onPress: () => {} },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

 
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBackWithWarning}
        >
          <Feather name="chevron-left" size={24} color="white" />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleBackWithWarning, styles.headerBackButton, styles.headerBackText]);


  useEffect(() => {
    if (isFocused) {
   
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, fadeAnim, slideAnim]);

  useEffect(() => {
    const handleBackPress = () => {
      if (hasChanges) {
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved changes. Are you sure you want to go back?',
          [
            { text: 'Stay', style: 'cancel', onPress: () => {} },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
          ]
        );
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  }, [hasChanges, navigation]);


  useEffect(() => {
    if (imageUri || title || notes) {
      setHasChanges(true);
    }
  }, [imageUri, location, title, notes]);


  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      resetForm();
    });
    return unsubscribe;
  }, [navigation]);

  const resetForm = () => {
    setImageUri(null);
    setAddress('');
    setLocation(null);
    setTitle('');
    setNotes('');
    setHasChanges(false);
  };

  const checkPermissions = async () => {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
    const locationPermission = await Location.getForegroundPermissionsAsync();
    
    if (!cameraPermission.granted) {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos for your travel diary.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() }
          ]
        );
        return false;
      }
    }
    
    if (!locationPermission.granted) {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access to get your current address.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() }
          ]
        );
        return false;
      }
    }
    
    return true;
  };


  const takePicture = async () => {
    try {
      if (imageUri) {
        Alert.alert(
          'Replace Existing Picture?',
          'Taking a new picture will replace the current one and reset location data. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Replace', 
              style: 'destructive', 
              onPress: async () => {
                await launchCamera();
              } 
            }
          ]
        );
      } else {

        await launchCamera();
      }
    } catch (error) {
      handleError('Camera Error', 'Failed to take picture', error);
    }
  };

  const launchCamera = async () => {
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      exif: true
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const manipResult = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      
      setImageUri(manipResult.uri);
      setLocation(null);
      setAddress('');
      
      await getLocationAndAddress();
    }
  };

  const getLocationAndAddress = async () => {
    setIsLoading(true);
    try {
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        mayShowUserSettingsDialog: true
      });
      
      const { latitude, longitude } = locationData.coords;
      setLocation({ latitude, longitude });

      const address = await reverseGeocode(latitude, longitude);
      setAddress(address);
    } catch (error) {
      handleError('Location Error', 'Could not get location data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const addressResponse = await Location.reverseGeocodeAsync(
        { latitude, longitude },
        { useGoogleMaps: false }
      );
      
      if (addressResponse.length > 0) {
        return formatAddress(addressResponse[0]);
      }
      throw new Error('No address found for coordinates');
    } catch (error) {
      console.error('Geocoding error:', error);
      return 'Address unavailable';
    }
  };

  const formatAddress = (addressObj: Location.LocationGeocodedAddress): string => {
    const parts = [
      addressObj.name,
      addressObj.street,
      addressObj.district,
      addressObj.city,
      addressObj.region,
      addressObj.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  const saveTravelEntry = async () => {
    try {
      if (!validateForm()) return;
      setIsLoading(true);

      const newEntry = createTravelEntry();
      console.log('Saving entry:', newEntry);

      const saved = await saveEntry(newEntry);
      if (!saved) throw new Error('Save operation failed');

      await handleSuccessfulSave();
    } catch (error) {
      handleError('Save Error', 'Failed to save travel entry', error);
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Please take a picture first');
      return false;
    }
    if (!address) {
      Alert.alert('Missing Address', 'Waiting for address information');
      return false;
    }
    if (!location) {
      Alert.alert('Missing Location', 'Waiting for location data');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this memory');
      return false;
    }
    return true;
  };

  const createTravelEntry = (): TravelEntry => ({
    id: generateId(),
    imageUri: imageUri!,
    address: address!,
    latitude: location!.latitude,
    longitude: location!.longitude,
    createdAt: Date.now(),
    title: title.trim(),
    notes: notes.trim() || undefined, 
  });

  const handleSuccessfulSave = async () => {
    await sendNotification();
    setHasChanges(false);
    setIsLoading(false);
    navigation.navigate('Home');
  };

  const sendNotification = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Travel Memory Saved!',
          body: `Your memory "${title}" has been recorded.`,
          data: { screen: 'Home' },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  const handleError = (title: string, message: string, error: any) => {
    console.error(`${title}:`, {
      message: error.message,
      error
    });
    Alert.alert(
      title,
      `${message}\n\n${error.message || 'Unknown error'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Capture Your Memory</Text>
        
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={takePicture}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.cameraButtonText}>Take Picture</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Getting location information...</Text>
          </View>
        )}

        {imageUri && (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: imageUri }} 
              style={styles.image} 
              resizeMode="cover"
            />
            
            {/* Title input field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter a title for this memory"
                placeholderTextColor={theme === 'light' ? '#999' : '#666'}
                maxLength={100}
              />
            </View>
            
            {/* Notes/Description input field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Write about this place, your experience, or any memory..."
                placeholderTextColor={theme === 'light' ? '#999' : '#666'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.addressContainer}>
              <View style={styles.addressHeaderRow}>
                <Feather name="map-pin" size={18} color={theme === 'light' ? '#444' : '#ddd'} />
                <Text style={styles.addressLabel}>Location Details</Text>
              </View>
              
              {address ? (
                <Text style={styles.addressText}>{address}</Text>
              ) : (
                <Text style={styles.noAddressText}>Retrieving address...</Text>
              )}
              
              {location && (
                <View style={styles.coordinatesContainer}>
                  <Feather name="navigation" size={14} color={theme === 'light' ? '#666' : '#aaa'} style={styles.coordIcon} />
                  <Text style={styles.coordinatesText}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {imageUri && address && location && (
        <Animated.View 
          style={[styles.bottomBar, { opacity: fadeAnim }]}
        >
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleBackWithWarning}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveTravelEntry}
            disabled={isLoading}
          >
            <Feather name="save" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.saveButtonText}>Save Memory</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};


export default AddEntryScreen;