import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShrimpLoader } from '../../animations';
import { colors, spacing } from '../../theme';

type Props = { message?: string };

export function LoadingView({ message }: Props) {
  return (
    <View style={styles.container}>
      <ShrimpLoader size={48} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { marginTop: spacing.md, fontSize: 14, color: colors.textSecondary },
});
