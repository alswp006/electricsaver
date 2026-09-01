import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Spacing, ListRow, Button, Asset, Skeleton } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { Card } from '../components/Card';
import { EmptyState } from '../components/StateView';
import { readJSON } from '../lib/storage';
import type { MeterRecord, RegionAverage, UserProfile } from '../types/domain';

const PROFILE_KEY = 'es:profile';
const RECORDS_KEY = 'es:records';
const FALLBACK_REGION_CODE = '11';

function loadRecords(): MeterRecord[] {
  const { value } = readJSON<MeterRecord[]>(RECORDS_KEY, []);
  return Array.isArray(value) ? value : [];
}

function loadProfile(): UserProfile {
  const { value } = readJSON<UserProfile>(PROFILE_KEY, {
    regionCode: FALLBACK_REGION_CODE,
    householdSize: 1,
  });
  return value;
}

function latestOf(records: MeterRecord[]): MeterRecord | null {
  if (records.length === 0) return null;
  return records.reduce((latest, r) => (r.createdAt >= latest.createdAt ? r : latest));
}

export default function Region() {
  const navigate = useNavigate();
  const [regions, setRegions] = useState<RegionAverage[] | null>(null);

  useEffect(() => {
    let active = true;
    import('../data/regionAverage.json').then((mod) => {
      if (!active) return;
      setRegions((mod.default ?? mod) as unknown as RegionAverage[]);
    });
    return () => {
      active = false;
    };
  }, []);

  const profile = loadProfile();
  const records = loadRecords();
  const latest = latestOf(records);

  if (!latest) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>우리 동네 비교</Top.TitleParagraph>} />}>
        <EmptyState
          icon={<Asset.ContentIcon name="iconFileRegular" alt="" />}
          title="먼저 사용량을 입력해주세요"
          action={
            <Button variant="fill" display="block" onClick={() => navigate('/')}>
              계산하러 가기
            </Button>
          }
          testId="region-empty"
        />
      </ScreenScaffold>
    );
  }

  const region = regions
    ? (regions.find((r) => r.regionCode === profile.regionCode) ??
      regions.find((r) => r.regionCode === FALLBACK_REGION_CODE) ??
      null)
    : null;

  const householdIdx = Math.min(Math.max(profile.householdSize, 1), 4) - 1;
  const avgKWh = region ? region.avgKWh[householdIdx] : 0;
  const diffKWh = latest.kWh - avgKWh;
  const diffPercent = avgKWh > 0 ? Math.round((Math.abs(diffKWh) / avgKWh) * 1000) / 10 : 0;
  const isLess = diffKWh <= 0;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>우리 동네 비교</Top.TitleParagraph>} />}>
      {region ? (
        <SummaryHero
          testId="region-hero"
          label="우리 동네 평균보다"
          value={<Amount value={diffPercent} unit="%" typography="t1" />}
          caption={isLess ? '적게 써요' : '많이 써요'}
        />
      ) : (
        <div data-testid="region-hero">
          <Skeleton />
        </div>
      )}

      <Spacing size={16} />

      {region ? (
        <Card testId="compare-card">
          <div data-testid="region-compare-row">
            <ListRow contents={<ListRow.Texts type="2RowTypeA" top="내 사용량" bottom={`${latest.kWh}kWh`} />}>
              <ListRow.Texts type="2RowTypeA" top="내 사용량" bottom={`${latest.kWh}kWh`} />
            </ListRow>
          </div>
          <div data-testid="region-compare-row">
            <ListRow contents={<ListRow.Texts type="2RowTypeA" top="지역 평균" bottom={`${avgKWh}kWh`} />}>
              <ListRow.Texts type="2RowTypeA" top="지역 평균" bottom={`${avgKWh}kWh`} />
            </ListRow>
          </div>
        </Card>
      ) : null}

      <Spacing size={32} />
    </ScreenScaffold>
  );
}
