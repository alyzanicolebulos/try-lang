import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../styles/ThemeProvider';
import HomeScreen from '../screens/HomeScreen';
import AddEntryScreen from '../screens/AddEntryScreen';

export type RootStackParamList = {
  Home: undefined;
  AddEntry: undefined;
  // For future implementation:
  // EntryDetail: { entryId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const createCustomTheme = (baseTheme: typeof DefaultTheme, isDark: boolean) => {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: '#6200ee',
      background: isDark ? '#121212' : '#f5f5f5',
      card: isDark ? '#1e1e1e' : '#ffffff',
      text: isDark ? '#ffffff' : '#000000',
      border: isDark ? '#333333' : '#e0e0e0',
    },
  };
};

const AppNavigator = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  
  // Create custom light and dark themes
  const customLightTheme = createCustomTheme(DefaultTheme, false);
  const customDarkTheme = createCustomTheme(DarkTheme, true);

  return (
    <NavigationContainer theme={isDark ? customDarkTheme : customLightTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#1e1e1e' : '#6200ee',
            elevation: 4,
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 3,
            shadowColor: '#000',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          cardStyle: {
            backgroundColor: isDark ? '#121212' : '#f5f5f5',
          },
          headerBackTitleVisible: false,
          headerLeftContainerStyle: {
            paddingLeft: 8,
          },
          headerRightContainerStyle: {
            paddingRight: 8,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'Travel Diary',
            headerTitleAlign: 'center',
            headerLeft: () => null,
            headerRight: () => (
              <View style={styles.headerRightContainer}>
                <TouchableOpacity
                  onPress={toggleTheme}
                  style={styles.themeButton}
                >
                  <Feather name={isDark ? 'sun' : 'moon'} size={22} color="white" />
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="AddEntry"
          component={AddEntryScreen}
          options={({ navigation }) => ({
            title: 'New Travel Memory',
            headerTitleAlign: 'center',
            // We're removing the custom headerLeft configuration here
            // The actual back button handling will be done in AddEntryScreen
            headerRight: () => null,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBackText: {
    color: 'white',
    fontSize: 16,
    marginLeft: Platform.OS === 'ios' ? 4 : 0,
    display: Platform.OS === 'ios' ? 'flex' : 'none',
  },
});

export default AppNavigator;