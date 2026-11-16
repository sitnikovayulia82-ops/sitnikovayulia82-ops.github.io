import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, colors, H2, P, s } from '../components/ui';
import { useAuth } from '../lib/auth';
import { districtName, districtNames } from '../lib/districts';
import { supabase } from '../lib/supabase';
import { ageFrom, type Child, type NannyProfile, type PublicNanny, type PublicRequest } from '../lib/types';

function call(phone: string) {
  Linking.openURL(`tel:${phone}`);
}
function whatsapp(phone: string) {
  Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
}

export default function Home() {
  const { profile, loading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [nannies, setNannies] = useState<PublicNanny[]>([]);
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [requests, setRequests] = useState<PublicRequest[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    if (profile.role === 'parent') {
      const [{ data: c }, { data: n }] = await Promise.all([
        supabase.from('children').select('*').eq('parent_id', profile.id).order('created_at'),
        supabase.rpc('nannies_in_my_districts'),
      ]);
      setChildren((c as Child[]) ?? []);
      setNannies((n as PublicNanny[]) ?? []);
    } else if (profile.role === 'nanny') {
      const { data: np } = await supabase
        .from('nanny_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      setNanny(np as NannyProfile | null);
      if ((np as NannyProfile | null)?.verification_status === 'approved') {
        const { data: r } = await supabase.rpc('requests_in_my_districts');
        setRequests((r as PublicRequest[]) ?? []);
      }
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!loading && !profile) {
    router.replace('/welcome');
    return null;
  }

  return (
    <SafeAreaView style={s.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} hitSlop={10}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {profile?.role === 'admin' ? (
          <Card>
            <P>Вы модератор.</P>
            <Button title="Проверить анкеты автонянь" onPress={() => router.push('/admin')} />
          </Card>
        ) : null}

        {profile?.role === 'parent' ? (
          <>
            <H2>Мои дети</H2>
            {children.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/child/edit', params: { id: c.id } })}>
                <Card>
                  <Text style={{ fontSize: 17, fontWeight: '700' }}>
                    {c.name}, {ageFrom(c.birth_date)} лет
                  </Text>
                  <P muted>
                    {[c.school, c.grade].filter(Boolean).join(', ')}
                    {'\n'}
                    {districtName(c.from_district ?? '')}
                    {c.to_district ? ` → ${districtName(c.to_district)}` : ''}
                  </P>
                  {c.schedule ? <P>{c.schedule}</P> : null}
                </Card>
              </Pressable>
            ))}
            <Button title="+ Добавить ребёнка" variant="secondary" onPress={() => router.push('/child/edit')} />

            <H2>Автоняни в ваших районах</H2>
            <P muted>{districtNames(profile.districts)}</P>
            {nannies.length === 0 ? (
              <P muted>Пока нет проверенных автонянь в выбранных районах. Потяните вниз, чтобы обновить.</P>
            ) : null}
            {nannies.map((n) => (
              <Card key={n.user_id}>
                <Badge text="✓ Паспорт и телефон проверены" color={colors.ok} />
                <Text style={{ fontSize: 17, fontWeight: '700' }}>
                  {n.full_name}, {n.age} лет
                </Text>
                <P muted>
                  🚗 {n.car_model}
                  {n.car_color ? `, ${n.car_color}` : ''}
                  {n.has_child_seat ? ' · детское кресло' : ''}
                  {'\n'}Опыт: {n.experience_years} лет
                  {n.price_from ? ` · от ${n.price_from} ₽` : ''}
                  {'\n'}📍 {districtNames(n.districts)}
                </P>
                {n.about ? <P>{n.about}</P> : null}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Button title="Позвонить" onPress={() => call(n.phone)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="WhatsApp" variant="secondary" onPress={() => whatsapp(n.phone)} />
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {profile?.role === 'nanny' ? (
          <>
            {nanny?.verification_status === 'pending' ? (
              <Card>
                <Badge text="На проверке" color={colors.warn} />
                <P>
                  Мы проверяем ваш паспорт и селфи. Как только анкету одобрят, вы увидите запросы родителей
                  в ваших районах, а родители — вашу анкету.
                </P>
              </Card>
            ) : null}
            {nanny?.verification_status === 'rejected' ? (
              <Card>
                <Badge text="Анкета отклонена" color={colors.danger} />
                <P>{nanny.rejection_reason ?? 'Свяжитесь с поддержкой.'}</P>
                <Button title="Заполнить заново" onPress={() => router.push('/register/nanny')} />
              </Card>
            ) : null}
            {!nanny ? (
              <Card>
                <P>Анкета автоняни не заполнена.</P>
                <Button title="Заполнить анкету" onPress={() => router.push('/register/nanny')} />
              </Card>
            ) : null}

            {nanny?.verification_status === 'approved' ? (
              <>
                <Badge text="✓ Вы проверенная автоняня" color={colors.ok} />
                <H2>Запросы родителей в ваших районах</H2>
                <P muted>{districtNames(profile.districts)}</P>
                {requests.length === 0 ? <P muted>Пока запросов нет. Потяните вниз, чтобы обновить.</P> : null}
                {requests.map((r) => (
                  <Card key={r.child_id}>
                    <Text style={{ fontSize: 17, fontWeight: '700' }}>
                      {r.child_name}, {r.child_age} лет
                    </Text>
                    <P muted>
                      {[r.school, r.grade].filter(Boolean).join(', ')}
                      {'\n'}📍 {districtName(r.from_district ?? '')}
                      {r.to_district ? ` → ${districtName(r.to_district)}` : ''}
                    </P>
                    {r.schedule ? <P>{r.schedule}</P> : null}
                    <P muted>Родитель: {r.parent_name}</P>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Button title="Позвонить" onPress={() => call(r.parent_phone)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="WhatsApp" variant="secondary" onPress={() => whatsapp(r.parent_phone)} />
                      </View>
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
