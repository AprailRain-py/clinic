import type { Frequency } from './types';

export const ALL_FREQUENCIES: Frequency[] = [
  'before_breakfast',
  'after_breakfast',
  'before_lunch',
  'after_lunch',
  'before_dinner',
  'after_dinner',
  'empty_stomach',
  'before_sleep',
];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  before_breakfast: 'Before Breakfast',
  after_breakfast: 'After Breakfast',
  before_lunch: 'Before Lunch',
  after_lunch: 'After Lunch',
  before_dinner: 'Before Dinner',
  after_dinner: 'After Dinner',
  empty_stomach: 'Empty Stomach',
  before_sleep: 'Before Sleep',
};

export const FREQUENCY_SHORT: Record<Frequency, string> = {
  before_breakfast: 'BBF',
  after_breakfast: 'ABF',
  before_lunch: 'BL',
  after_lunch: 'AL',
  before_dinner: 'BD',
  after_dinner: 'AD',
  empty_stomach: 'ES',
  before_sleep: 'BS',
};
