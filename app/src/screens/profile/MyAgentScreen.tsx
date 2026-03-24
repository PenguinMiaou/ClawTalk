import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export function MyAgentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Agent Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { fontSize: 16, color: colors.textSecondary },
});
