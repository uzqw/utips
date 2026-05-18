import { defineStore } from "pinia";
import { CategoryEntity } from "../types/Category";
import { StatisticYearEntity } from "../types/StatisticYear";
import { getDiaryConfigFromLocalStorage, setDiaryConfig } from "../utility.ts";

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categoryAll: [] as CategoryEntity[],
    statisticsCategory: {},
    statisticsYear: [] as StatisticYearEntity[],
    dataArrayYear: [] as string[],
    dataArrayCategory: [] as CategoryEntity[],
    moneyAccuracy: 1,
  }),
  getters: {
    categoryNameMap(state) {
      const map = new Map();
      state.categoryAll.forEach((item: CategoryEntity) => {
        map.set(item.id || '', item.name);
      });
      return map;
    },
    categoryNameByEnMap(state) {
      const map = new Map();
      state.categoryAll.forEach((item: CategoryEntity) => {
        map.set(item.name_en, item.name);
      });
      return map;
    },
    categoryObjectMap(state): Map<string, CategoryEntity> {
      const map = new Map();
      state.categoryAll.forEach((item: CategoryEntity) => {
        map.set(item.id || '', item);
      });
      return map;
    },
  },
  actions: {
    SET_STATISTICS_YEAR(payload: StatisticYearEntity[]) {
      const diaryConfig = getDiaryConfigFromLocalStorage();
      if (!payload) {
        diaryConfig.dateFilterString = '';
      }
      setDiaryConfig(diaryConfig);
      this.statisticsYear = payload;
    },
    SET_CATEGORY_ALL(categories: CategoryEntity[]) {
      this.categoryAll = categories;
    }
  }
});
