import type { Frequency } from './types';

export type SchedulePreset = {
  code: string;
  label: string;
  description: string;
  frequency: Frequency[];
  timesPerDay: number;
};

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    code: 'OD',
    label: 'Once daily',
    description: 'Every morning',
    frequency: ['after_breakfast'],
    timesPerDay: 1,
  },
  {
    code: 'BID',
    label: 'Twice a day',
    description: 'Morning & night',
    frequency: ['after_breakfast', 'after_dinner'],
    timesPerDay: 2,
  },
  {
    code: 'TID',
    label: 'Thrice a day',
    description: 'After meals',
    frequency: ['after_breakfast', 'after_lunch', 'after_dinner'],
    timesPerDay: 3,
  },
  {
    code: 'QID',
    label: 'Four times',
    description: 'After meals + bedtime',
    frequency: ['after_breakfast', 'after_lunch', 'after_dinner', 'before_sleep'],
    timesPerDay: 4,
  },
  {
    code: 'HS',
    label: 'Before bed',
    description: 'At bedtime',
    frequency: ['before_sleep'],
    timesPerDay: 1,
  },
  {
    code: 'AC',
    label: 'Empty stomach',
    description: 'Before meals',
    frequency: ['before_breakfast', 'before_lunch', 'before_dinner'],
    timesPerDay: 3,
  },
  {
    code: 'PC',
    label: 'After meals',
    description: 'With food',
    frequency: ['after_breakfast', 'after_lunch', 'after_dinner'],
    timesPerDay: 3,
  },
  {
    code: 'SOS',
    label: 'As needed',
    description: 'When required',
    frequency: [],
    timesPerDay: 1,
  },
];
