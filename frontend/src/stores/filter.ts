import { defineStore } from "pinia";
import { getDiaryConfigFromLocalStorage, setDiaryConfig } from "../utility.ts";

export const useFilterStore = defineStore('filter', {
  state: () => ({
    isFilterShared: false,
    dateFilterString: '',
    dateFilterArray: [] as string[],
    keywords: [] as string[],
    filteredCategories: [] as string[],
  }),
  actions: {
    INIT_FILTER_CONFIG() {
      const diaryConfig = getDiaryConfigFromLocalStorage();
      this.filteredCategories = diaryConfig.filteredCategories;
      this.keywords = diaryConfig.keywords;
      this.dateFilterString = diaryConfig.dateFilterString;
      this.dateFilterArray = diaryConfig.dateFilterArray || [];
      this.isFilterShared = diaryConfig.isFilterShared;
    },
    SET_IS_FILTERED_SHARED(payload: boolean) {
      this.isFilterShared = payload;
      const diaryConfig = getDiaryConfigFromLocalStorage();
      diaryConfig.isFilterShared = payload;
      setDiaryConfig(diaryConfig);
    },
    SET_FILTERED_CATEGORIES(payload: string[]) {
      this.filteredCategories = payload;
      const diaryConfig = getDiaryConfigFromLocalStorage();
      diaryConfig.filteredCategories = payload;
      setDiaryConfig(diaryConfig);
    },
    SET_DATE_FILTER_STRING(payload: string) {
      this.dateFilterString = payload;
      const diaryConfig = getDiaryConfigFromLocalStorage();
      diaryConfig.dateFilterString = payload;
      setDiaryConfig(diaryConfig);
    },
    SET_DATE_FILTER_ARRAY(payload: string[]) {
      this.dateFilterArray = payload;
      this.dateFilterString = ''; // 清除旧的单选过滤字符串，防止 API 回退到旧值
      const diaryConfig = getDiaryConfigFromLocalStorage();
      diaryConfig.dateFilterArray = payload;
      diaryConfig.dateFilterString = '';
      setDiaryConfig(diaryConfig);
    },
    SET_KEYWORD(payload: string[]) {
      this.keywords = payload;
      const diaryConfig = getDiaryConfigFromLocalStorage();
      diaryConfig.keywords = payload;
      setDiaryConfig(diaryConfig);
    }
  }
});
