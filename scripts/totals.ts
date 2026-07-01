import { SEED_FORMATION_PERIODS } from '../src/data/formationAllocations';
import { SEED_SCHOOL_PERIODS } from '../src/data/schoolAllocations';
for (const p of SEED_FORMATION_PERIODS as any[]) {
  console.log('FORMATION period', p.id, 'columns:', p.columns, 'sections:', p.sections.length);
  for (const s of p.sections) {
    const t = s.items.reduce((a:number, i:any) => a + (i.amounts||[]).reduce((b:number, x:any) => b + (Number(x)||0), 0), 0);
    console.log(' ', s.name, '->', t.toFixed(2), 'items=', s.items.length, 'cols/item=', s.items[0]?.amounts?.length);
  }
}
console.log('---SCHOOLS---');
for (const p of SEED_SCHOOL_PERIODS as any[]) {
  console.log('period', p.id, 'columns:', p.columns);
  for (const s of p.sections) {
    const t = s.items.reduce((a:number, i:any) => a + (i.amounts||[]).reduce((b:number, x:any) => b + (Number(x)||0), 0), 0);
    console.log(' ', s.name, '->', t.toFixed(2));
  }
}
