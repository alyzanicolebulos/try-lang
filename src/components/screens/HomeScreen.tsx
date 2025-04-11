import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TravelEntry } from '../types';
import { getEntries, removeEntry } from '../utilities/storage';
import { useTheme } from '../styles/ThemeProvider';
import { getHomeStyles } from '../styles/HomeScreenStyle';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { theme } = useTheme();
  const styles = getHomeStyles(theme);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [selectedEntry, setSelectedEntry] = useState<TravelEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const modalAnimation = useRef(new Animated.Value(0)).current;

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const loadedEntries = await getEntries();
      setEntries(loadedEntries);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to load entries:', error);
      Alert.alert('Error', 'Failed to load travel entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      return () => {
        fadeAnim.setValue(0);
      };
    }, [loadEntries, fadeAnim])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const handleRemoveEntry = async (id: string) => {
    try {
      Alert.alert(
        'Delete Entry',
        'Are you sure you want to delete this travel memory?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setRefreshing(true);
              const success = await removeEntry(id);
              if (success) {
                const updatedEntries = entries.filter(entry => entry.id !== id);
                setEntries(updatedEntries);
                setModalVisible(false);
                setSelectedEntry(null);
              } else {
                Alert.alert('Error', 'Failed to delete entry');
              }
              setRefreshing(false);
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
      setRefreshing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' · ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEntryPress = (entry: TravelEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
    
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedEntry(null);
    });
  };

  const renderItem = ({ item, index }: { item: TravelEntry, index: number }) => {
    const itemDelay = index * 100;
    
    return (
      <AnimatedListItem 
        item={item} 
        delay={itemDelay} 
        fadeAnim={fadeAnim}
        onPress={handleEntryPress}
        onDelete={handleRemoveEntry}
        theme={theme}
        formatDate={formatDate}
      />
    );
  };

  const AnimatedListItem = React.memo(({ 
    item, 
    delay, 
    fadeAnim,
    onPress,
    onDelete,
    theme,
    formatDate
  }: {
    item: TravelEntry;
    delay: number;
    fadeAnim: Animated.Value;
    onPress: (item: TravelEntry) => void;
    onDelete: (id: string) => void;
    theme: 'light' | 'dark';
    formatDate: (timestamp: number) => string;
  }) => {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const listItemStyles = getHomeStyles(theme);
    
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
        delay,
      }).start();
    }, [scaleAnim, delay]);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => onPress(item)}
        >
          <View style={listItemStyles.entryContainer}>
            <Image 
              source={{ uri: item.imageUri }} 
              style={listItemStyles.image} 
              resizeMode="cover"
            />
            <View style={listItemStyles.overlay} />
            <View style={listItemStyles.detailsContainer}>
              <View style={listItemStyles.addressRow}>
                <Feather name="map-pin" size={16} color="white" style={listItemStyles.icon} />
                <Text style={listItemStyles.address} numberOfLines={1}>
                  {item.title || item.address}
                </Text>
              </View>
              <View style={listItemStyles.dateRow}>
                <Feather name="calendar" size={14} color="rgba(255,255,255,0.8)" style={listItemStyles.icon} />
                <Text style={listItemStyles.date}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={listItemStyles.coordinatesRow}>
                <Feather name="navigation" size={14} color="rgba(255,255,255,0.7)" style={listItemStyles.icon} />
                <Text style={listItemStyles.coordinates}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
            
            {/* Visible delete button */}
            <TouchableOpacity 
              style={listItemStyles.deleteButton}
              onPress={() => onDelete(item.id)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const EntryDetailsModal = () => {
    if (!selectedEntry) return null;
    
    const modalTranslateY = modalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [height, 0],
    });
    
    const modalBackdropOpacity = modalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });
    
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalBackdrop, 
              { opacity: modalBackdropOpacity }
            ]}
            onTouchEnd={closeModal}
          />
          <Animated.View 
            style={[
              styles.modalContent, 
              { transform: [{ translateY: modalTranslateY }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Feather name="x" size={24} color={theme === 'light' ? '#444' : '#ddd'} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Travel Memory Details</Text>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Image 
                source={{ uri: selectedEntry.imageUri }} 
                style={styles.modalImage} 
                resizeMode="cover"
              />
              
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>
                  {selectedEntry.title || 'Untitled Memory'}
                </Text>
                
                {selectedEntry.notes && (
                  <Text style={styles.detailDescription}>
                    {selectedEntry.notes}
                  </Text>
                )}
                
                <View style={styles.detailItem}>
                  <Feather name="map-pin" size={18} color={theme === 'light' ? '#444' : '#ddd'} style={styles.detailIcon} />
                  <Text style={styles.detailText}>{selectedEntry.address}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Feather name="calendar" size={18} color={theme === 'light' ? '#444' : '#ddd'} style={styles.detailIcon} />
                  <Text style={styles.detailText}>{formatDate(selectedEntry.createdAt)}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Feather name="navigation" size={18} color={theme === 'light' ? '#444' : '#ddd'} style={styles.detailIcon} />
                  <Text style={styles.detailText}>
                    {selectedEntry.latitude.toFixed(6)}, {selectedEntry.longitude.toFixed(6)}
                  </Text>
                </View>
                
                {selectedEntry.weather && (
                  <View style={styles.detailItem}>
                    <Feather name="cloud" size={18} color={theme === 'light' ? '#444' : '#ddd'} style={styles.detailIcon} />
                    <Text style={styles.detailText}>
                      {selectedEntry.weather.conditions}, {selectedEntry.weather.temperature}°, 
                      Humidity: {selectedEntry.weather.humidity}%
                    </Text>
                  </View>
                )}
                
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <View style={styles.tagContainer}>
                    {selectedEntry.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalDeleteButton}
                onPress={() => handleRemoveEntry(selectedEntry.id)}
              >
                <Feather name="trash-2" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.modalButtonText}>Delete Memory</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const EmptyListComponent = () => (
    <Animated.View style={{ ...styles.emptyContainer, opacity: fadeAnim }}>
      <Feather name="camera-off" size={50} color={theme === 'light' ? '#bbb' : '#555'} />
      <Text style={styles.emptyText}>No travel memories yet</Text>
      <Text style={styles.emptySubText}>Start capturing your adventures</Text>
      <TouchableOpacity 
        style={styles.addEntryButton}
        onPress={() => navigation.navigate('AddEntry')}
      >
        <Feather name="plus-circle" size={18} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.addEntryButtonText}>Add New Entry</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const FloatingActionButton = () => (
    <TouchableOpacity 
      style={styles.fab}
      onPress={() => navigation.navigate('AddEntry')}
    >
      <Feather name="plus" size={24} color="white" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading your travel memories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {entries.length === 0 ? (
        <EmptyListComponent />
      ) : (
        <>
          <FlatList
            data={entries}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6200ee', '#03DAC6']}
                tintColor={theme === 'light' ? '#6200ee' : '#bb86fc'}
              />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
          <FloatingActionButton />
        </>
      )}
      
      {/* Render the modal */}
      <EntryDetailsModal />
    </View>
  );
};


export default HomeScreen;