import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors, H2, P, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (!isConfigured) {
    return (
      <Screen>
        <H2>Приложение не настроено</H2>
        <P>
          Создайте файл .env с EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY (см. README.md).
        </P>
      </Screen>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href="/welcome" />;
  return <Redirect href="/home" />;
}
