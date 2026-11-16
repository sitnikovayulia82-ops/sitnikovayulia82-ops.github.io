// Районы Набережных Челнов. Список можно свободно править —
// в базе хранятся только коды (id), названия показываются из этого файла.
export const CITY = 'Набережные Челны';

export const DISTRICTS = [
  { id: 'new_city', name: 'Новый город' },
  { id: 'avtozavodsky', name: 'Автозаводский р-н' },
  { id: 'komsomolsky', name: 'Комсомольский р-н' },
  { id: 'centralny', name: 'Центральный р-н' },
  { id: 'ges', name: 'ГЭС' },
  { id: 'zyab', name: 'ЗЯБ' },
  { id: 'old_city', name: 'Старый город' },
  { id: 'zamelekesye', name: 'Замелекесье' },
  { id: 'sidorovka', name: 'Сидоровка' },
  { id: 'elevator', name: 'Элеваторная гора' },
  { id: 'bsi', name: 'БСИ' },
  { id: 'krasnye_chelny', name: 'Красные Челны' },
  { id: 'suburbs', name: 'Пригород (Тукаевский р-н)' },
] as const;

export type DistrictId = (typeof DISTRICTS)[number]['id'];

export function districtName(id: string): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? id;
}

export function districtNames(ids: string[] | null | undefined): string {
  return (ids ?? []).map(districtName).join(', ');
}
