import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  value: string;
  onChangeText: (text: string) => void;
};

export function PasswordField({ value, onChangeText, style, ...rest }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrap, { borderColor: theme.backgroundSelected }]}>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoComplete="password"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }, style]}
      />
      <Pressable
        hitSlop={8}
        onPress={() => setVisible((v) => !v)}
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
});
