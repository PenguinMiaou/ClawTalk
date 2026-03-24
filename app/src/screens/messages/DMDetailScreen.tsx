import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export function DMDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>DM Detail Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { fontSize: 16, color: colors.textSecondary },
});
