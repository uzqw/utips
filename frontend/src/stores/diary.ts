import { defineStore } from "pinia";
import { DiaryEntity, DiaryListOperation } from "../types/diary";
import SVG_ICONS from "../assets/icons/SVG_ICONS";
import { EnumListStyle } from "../listStyle";

export const useDiaryStore = defineStore('diary', {
  state: () => ({
    currentDiary: {} as DiaryEntity,
    listStyle: EnumListStyle.list,
    waterFallItemCount: 0,
    isDiaryNeedToBeSaved: false,
    isDiaryNeedToBeRecovered: false,
    isDiaryEditorContentHasChanged: false,
    isListNeedBeReload: false,
    isSavingDiary: false,
    editLogoImg: SVG_ICONS.logo_icons.logo,
    listOperation: {} as DiaryListOperation,
    cacheDiary: undefined as (DiaryEntity | undefined),
    cacheDiaryOrigin: undefined as (DiaryEntity | undefined),
    listCache: null as ({
      diaries: any[],
      pageNo: number,
      scrollTop: number,
      isHasMore: boolean,
    } | null),
    isHideContent: false,
  }),
  actions: {
    SET_CURRENT_DIARY(diary: DiaryEntity) {
      this.currentDiary = diary;
    },
    SET_LIST_STYLE(style: EnumListStyle) {
      this.listStyle = style;
    },
    SET_SAVING_DIARY(isSaving: boolean) {
      this.isSavingDiary = isSaving;
    },
    CLEAR_CACHE() {
      this.cacheDiary = undefined;
      this.cacheDiaryOrigin = undefined;
    }
  }
});
