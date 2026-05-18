import { defineStore } from "pinia";

export const useUIStore = defineStore('ui', {
  state: () => ({
    insets: {
      windowsHeight: window.innerHeight,
      windowsWidth: window.innerWidth,
      heightPanel: window.innerHeight - 45,
    },
    colorMode: 'light' as 'light' | 'dark',
    isMenuShowed: false,
    isShowSearchBar: false,
  }),
  getters: {
    isInMobileMode(state) {
      return state.insets.windowsWidth < 1024 || state.insets.windowsWidth < state.insets.windowsHeight;
    },
  },
  actions: {
    SET_COLOR_MODE(mode: 'light' | 'dark') {
      this.colorMode = mode;
    },
    TOGGLE_MENU() {
      this.isMenuShowed = !this.isMenuShowed;
    },
    SET_MENU_SHOW(show: boolean) {
      this.isMenuShowed = show;
    },
    TOGGLE_SEARCH_BAR() {
      this.isShowSearchBar = !this.isShowSearchBar;
    },
    UPDATE_INSETS() {
      this.insets = {
        windowsHeight: window.innerHeight,
        windowsWidth: window.innerWidth,
        heightPanel: window.innerHeight - 45,
      };
    }
  }
});
