import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert, Linking } from 'react-native';
import { PermissionStatus } from '../types';

export const requestCameraPermission = async (): Promise<PermissionStatus> => {
  const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
  
  if (currentStatus !== 'granted') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status;
  }
  
  return currentStatus;
};


export const requestLocationPermission = async (): Promise<PermissionStatus> => {
  const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
  
  if (currentStatus !== 'granted') {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }
  
  return currentStatus;
};


export const requestNotificationPermission = async (): Promise<PermissionStatus> => {
  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  
  if (currentStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  }
  
  return currentStatus;
};

export const requestMediaLibraryPermission = async (): Promise<PermissionStatus> => {
  const { status: currentStatus } = await MediaLibrary.getPermissionsAsync();
  
  if (currentStatus !== 'granted') {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status;
  }
  
  return currentStatus;
};

export const ensurePermission = async (
  permissionType: 'camera' | 'location' | 'notification' | 'mediaLibrary',
  title: string,
  message: string
): Promise<boolean> => {
  let status: PermissionStatus;
  

  switch (permissionType) {
    case 'camera':
      status = await requestCameraPermission();
      break;
    case 'location':
      status = await requestLocationPermission();
      break;
    case 'notification':
      status = await requestNotificationPermission();
      break;
    case 'mediaLibrary':
      status = await requestMediaLibraryPermission();
      break;
  }
  
  if (status === 'granted') {
    return true;
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
    return false;
  }
};


export const requestAllPermissions = async (): Promise<{
  camera: PermissionStatus;
  location: PermissionStatus;
  notification: PermissionStatus;
  mediaLibrary: PermissionStatus;
}> => {
  const [camera, location, notification, mediaLibrary] = await Promise.all([
    requestCameraPermission(),
    requestLocationPermission(),
    requestNotificationPermission(),
    requestMediaLibraryPermission()
  ]);
  
  return { camera, location, notification, mediaLibrary };
};