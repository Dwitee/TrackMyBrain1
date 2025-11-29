import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import VoiceNotesScreen from '../screens/VoiceNotesScreen';
import VisionNotesScreen from '../screens/VisionNotesScreen';
import SummaryScreen from '../screens/SummaryScreen'
export type RootStackParamList = {
  Home: undefined;
  VoiceNotes: undefined;
  VisionNotes: undefined;
  Summary: undefined;  
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'TrackMyBrain 🧠' }}
      />
      <Stack.Screen
        name="VisionNotes"
        component={VisionNotesScreen}
        options={{ title: 'Vision Notes 📷' }}
      />
      <Stack.Screen
        name="VoiceNotes"
        component={VoiceNotesScreen}
        options={{ title: 'Voice Notes 🎤' }}
      />
      <Stack.Screen name="Summary" component={SummaryScreen} />   
    </Stack.Navigator>
  );
}