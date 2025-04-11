import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/components/navigation/AppNavigator';
import { ThemeProvider } from './src/components/styles/ThemeProvider';
import * as Notifications from 'expo-notifications';
import { requestAllPermissions } from './src/components/utilities/storage';
import { StorageKeys } from './src/components/types/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'VirtualizedLists should never be nested',
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      const firstLaunch = await AsyncStorage.getItem(StorageKeys.FIRST_LAUNCH);
      
      if (firstLaunch === null) {
        await requestAllPermissions();
        await AsyncStorage.setItem(StorageKeys.FIRST_LAUNCH, 'false');
      }
      
      const appOpenedCountStr = await AsyncStorage.getItem(StorageKeys.APP_OPENED_COUNT);
      const appOpenedCount = appOpenedCountStr ? parseInt(appOpenedCountStr) : 0;
      await AsyncStorage.setItem(StorageKeys.APP_OPENED_COUNT, (appOpenedCount + 1).toString());
    };
    
    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#1e1e1e"
          translucent={Platform.OS === 'android'}
        />
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;