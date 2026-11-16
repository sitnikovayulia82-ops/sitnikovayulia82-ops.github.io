import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../components/ui';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            headerBackTitle: 'Назад',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Вход по телефону' }} />
          <Stack.Screen name="register/nanny" options={{ title: 'Анкета автоняни' }} />
          <Stack.Screen name="register/parent" options={{ title: 'Анкета родителя' }} />
          <Stack.Screen name="home" options={{ title: 'Автоняня Челны', headerBackVisible: false }} />
          <Stack.Screen name="child/edit" options={{ title: 'Профиль ребёнка' }} />
          <Stack.Screen name="profile" options={{ title: 'Мой профиль' }} />
          <Stack.Screen name="admin" options={{ title: 'Проверка автонянь' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
