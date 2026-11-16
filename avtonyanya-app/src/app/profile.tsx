import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, DistrictPicker, H2, P, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [districts, setDistricts] = useState<string[]>(profile?.districts ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setDistricts(profile.districts);
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    if (districts.length === 0) return Alert.alert('Выберите хотя бы один район');
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ districts }).eq('id', profile.id);
    setBusy(false);
    if (error) return Alert.alert('Ошибка', error.message);
    await refreshProfile();
    router.back();
  };

  const logout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const deleteAccount = () =>
    Alert.alert(
      'Удалить аккаунт?',
      'Анкета, профили детей и фото паспорта будут удалены без возможности восстановления.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            // Сначала удаляем фото паспорта из хранилища, затем сам аккаунт.
            const { data: files } = await supabase.storage.from('passports').list(profile!.id);
            if (files?.length) {
              await supabase.storage
                .from('passports')
                .remove(files.map((f) => `${profile!.id}/${f.name}`));
            }
            const { error } = await supabase.rpc('delete_my_account');
            if (error) return Alert.alert('Ошибка', error.message);
            await logout();
          },
        },
      ],
    );

  return (
    <Screen>
      {profile ? (
        <>
          <H2>{profile.full_name}</H2>
          <P muted>
            {profile.phone} · {profile.role === 'nanny' ? 'автоняня' : profile.role === 'parent' ? 'родитель' : 'модератор'}
          </P>
          <DistrictPicker value={districts} onChange={setDistricts} />
          <Button title="Сохранить районы" onPress={save} loading={busy} />
        </>
      ) : null}
      <Button title="Выйти" variant="secondary" onPress={logout} />
      {profile ? <Button title="Удалить аккаунт" variant="danger" onPress={deleteAccount} /> : null}
    </Screen>
  );
}
