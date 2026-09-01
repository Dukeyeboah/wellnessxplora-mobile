import { Pressable, StyleSheet, Switch, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FormCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.card, style]}>
      {children}
    </ThemedView>
  );
}

export function FormSectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

export function FormField({
  label,
  helper,
  hint,
  children,
}: {
  label: string;
  helper?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {helper ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.helper}>
          {helper}
        </ThemedText>
      ) : null}
      {children}
      {hint ? (
        <ThemedText
          type="small"
          style={[styles.hint, hint.includes('available') && styles.hintSuccess]}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function FormInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      style={[
        styles.input,
        multiline && styles.textArea,
        { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
      ]}
    />
  );
}

export function FormTip({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tip, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {children}
      </ThemedText>
    </View>
  );
}

export function ContactToggle({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.toggleBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}>
      <Switch value={value} onValueChange={onValueChange} />
      <View style={styles.toggleCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.toggleDesc}>
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function FormActions({
  onCancel,
  onSave,
  saving,
  saveLabel = 'Save profile',
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelBtn,
          { borderColor: theme.backgroundSelected, opacity: pressed ? 0.8 : 1 },
        ]}>
        <ThemedText type="smallBold">Cancel</ThemedText>
      </Pressable>
      <Pressable
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: theme.tint, opacity: saving ? 0.5 : pressed ? 0.85 : 1 },
        ]}>
        <ThemedText type="smallBold" style={styles.saveLabel}>
          {saving ? 'Saving…' : saveLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E4E4',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  field: {
    gap: Spacing.one,
  },
  helper: {
    lineHeight: 18,
    fontSize: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  hintSuccess: {
    color: '#3D6B4F',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  tip: {
    borderRadius: 10,
    padding: Spacing.three,
  },
  toggleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleDesc: {
    lineHeight: 18,
    fontSize: 12,
  },
  actions: {
    gap: Spacing.two,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveBtn: {
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveLabel: {
    color: '#FFFFFF',
  },
});
