import { DateUtilityObject } from "../utility.ts";

export interface DiaryEntity {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_markdown: boolean;
  date: Date | string | number;
  weather: string;
  category: string;
  temperature: string;
  temperature_outside: string;
}

export interface DiaryListOperation {
  type: 'add' | 'delete' | 'change';
  diary: DiaryEntity | undefined;
  id: string;
}

export interface DiaryEntityFromServer {
  id: string;
  title: string;
  content?: string;
  is_public: 1 | 0;
  is_markdown: 1 | 0;
  date: Date | string | number;
  weather: string;
  category: string;
  temperature: string;
  temperature_outside: string;
  billData?: [];
  dateObj?: DateUtilityObject;
  categoryString?: string;
  contentHtml?: string;
  nickname?: string;
  username?: string;
  weekday?: string;
  weekdayShort?: string;
  dateString?: string;
  isShowItemWeekDayShort?: boolean;
}

export interface DiaryEntityWaterfall extends DiaryEntityFromServer {
  position: {
    top: number;
    left: number;
    col: number;
  };
}

export interface DiarySearchParams {
  keywords: Array<string> | string;
  pageNo: number;
  pageSize: number;
  categories: string;
  filterShared?: 0 | 1;
  dateFilterString?: string;
}

export interface DiarySubmitEntity {
  id: string;
  title: string;
  content: string;
  category: string;
  temperature: number;
  temperature_outside: number;
  weather: string;
  is_public: 1 | 0;
  is_markdown: 1 | 0;
  date: string;
}

export interface ResponseDiaryAdd {
  success: boolean;
  data: any;
  message: string;
}

export enum EnumWeather {
  'sunny' = 100,
  'cloudy' = 101,
  'overcast' = 104,
  'sprinkle' = 305,
  'rain' = 306,
  'thunderstorm' = 310,
  'snow' = 499,
  'fog' = 501,
  'sandstorm' = 507,
  'smog' = 502,
}
