<template>
    <!-- MENU -->
    <transition
        enter-active-class="animated-fast slideInLeft"
        leave-active-class="animated-fast slideOutLeft"
    >
        <div class="menu-panel" id="menu-panel" v-if="uiStore.isMenuShowed" :style="`height:  ${uiStore.insets.heightPanel}px`">

            <MenuPanelContainer v-show="menuListShowed">
                <!-- 菜单列表 -->
                <div class="menu" :style="`min-height: ${uiStore.insets.heightPanel - 60}px`">
                    <div class="menu-list">
                        <MenuListItemShort v-if="uiStore.isInMobileMode"
                                           :menu-name="t('menu.search')"    :icon="whiteIcons.search" @click="menuListClicked('search')"/>

                        <MenuListItemShort v-if="uiStore.isInMobileMode" :menu-name="t('menu.todo')"
                                           :icon="filterStore.filteredCategories.length === 1 && filterStore.filteredCategories[0] === 'todo'?
                                                                                                                    whiteIcons.todoActive:
                                                                                                                    whiteIcons.todo"
                                           @click="menuListClicked('todo')"/>

                        <MenuListItemShort :menu-name="t('menu.category')" :icon="whiteIcons.category" @click="menuListClicked('category')">
                            <MenuCategoryIndicatorInline/>
                        </MenuListItemShort>

                        <MenuListItemShort :menu-name="t('menu.year')" :icon="whiteIcons.year"       @click="menuListClicked('year')"
                                           :add-on-text="filterStore.dateFilterArray.length > 0 ? 
                                                            (filterStore.dateFilterArray.length > 2 ? 
                                                                t('menu.selectedMonths', { count: filterStore.dateFilterArray.length }) : 
                                                                filterStore.dateFilterArray.join(', ')) : 
                                                            filterStore.dateFilterString">
                        </MenuListItemShort>
                        <MenuListItemShort :menu-name="t('menu.statistics')"  :icon="whiteIcons.statistics"  @click="goToPage('Statistics')" />
                        <MenuListItemShort :menu-name="t('menu.bill')"     :icon="whiteIcons.billSimple"        @click="goToPage('Bill')" />
                        <!-- <MenuListItemShort :menu-name="t('menu.bankCard')"   :icon="whiteIcons.card"  disabled      @click="goToPage('BankCard')" /> -->
                        <MenuListItemShort
                            v-if="isAdminUser"
                            :menu-name="t('menu.fileManager')" :icon="whiteIcons.folder"  disabled      @click="goToPage('FileManager')" />
                        <MenuListItemShort :menu-name="t('menu.settings')"     :icon="whiteIcons.others"      @click="menuListClicked('settings')" />
                        <MenuListItemShort
                            v-if="isAdminUser"
                            :menu-name="t('menu.invitation')"   :icon="whiteIcons.invitation"  disabled       @click="goToPage('Invitation')" />
                        <MenuListItemShort :menu-name="t('menu.help')"     :icon="whiteIcons.help"      @click="menuListClicked('help')" />
                        <MenuListItemShort
                            :menu-name="t('menu.about')"     :icon="whiteIcons.about"        @click="menuListClicked('about')"
                            :add-on-text="`v${packageInfo.version}`"/>
                    </div>

                    <!-- 用户信息 -->
                    <UserProfile/>

                </div>
            </MenuPanelContainer>


            <!-- 页面 类别筛选 -->
            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <MenuCategorySelector v-if="categoryShowed"/>
            </transition>

            <!-- 页面 年份筛选 -->
            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <YearSelector v-show="yearShowed"/>
            </transition>

            <!-- 页面 设置 -->
            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <MenuOtherFunction v-show="settingsShowed"/>
            </transition>

            <!-- 页面 帮助 -->
            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <MenuHelp v-show="helpShowed"/>
            </transition>

            <!-- 页面 关于 -->
            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <About v-show="aboutShowed"/>
            </transition>
        </div>
    </transition>

</template>

<script lang="ts" setup>
import MenuCategorySelector from "@/view/Menu/MenuCategorySelector.vue"
import YearSelector from "./YearSelector/YearSelector.vue"
import About from "@/view/About/About.vue"
import packageInfo from "../../../package.json"
import MenuListItemShort from "@/view/Menu/MenuListItemShort.vue"
import { whiteIcons } from "../../assets/icons/TabIcons"
import UserProfile from "@/view/Menu/UserProfile.vue";
import MenuOtherFunction from "@/view/Menu/MenuOtherFunction.vue";
import MenuHelp from "@/view/Menu/MenuHelp.vue";

import { useUIStore } from "@/stores/ui";
import { useFilterStore } from "@/stores/filter";
import { useDiaryStore } from "@/stores/diary";
const uiStore = useUIStore()
const filterStore = useFilterStore(); const diaryStore = useDiaryStore()
import {computed, nextTick, ref, watch} from "vue";
import {useRouter} from "vue-router";
import {storeToRefs} from "pinia";
import {getAuthorization, popMessage} from "@/utility.ts";
import MenuCategoryIndicatorInline from "@/view/Menu/MenuCategoryIndicatorInline.vue";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import {useI18n} from "vue-i18n";

const router = useRouter()
const {t} = useI18n()

// MENU
const menuListShowed = ref(true)         // 菜单列表
const categoryShowed = ref(false)        // 类别菜单
const yearShowed = ref(false)            // 年份选择
const settingsShowed = ref(false)        // 设置
const helpShowed = ref(false)            // 帮助页面
const aboutShowed = ref(false)           // 关于页面

const { isMenuShowed } = storeToRefs(uiStore)
watch(isMenuShowed, newValue => {
    if (newValue){
        menuShow()
    } else {
        menuClose()
    }
})

const isAdminUser = computed(()=>{
    return getAuthorization().group_id === 1
})

// 跳转到独立页面
function goToPage(pageName: string){
    if (pageName === 'Statistics' || pageName === 'Bill') {
        uiStore.isMenuShowed = false
        menuClose()
        router.push({name: pageName})
        return
    }
    popFeatureUnavailable()
}

function popFeatureUnavailable(){
    popMessage('warning', t('common.featureUnavailable'), ()=>{}, 1)
}

// MENU related
function menuShow() {
    uiStore.isMenuShowed = true  // menu panel
    menuListShowed.value = true          // menu list
    categoryShowed.value = false         // category
    yearShowed.value = false             // year
    settingsShowed.value = false         // settings
    helpShowed.value = false             // help
    aboutShowed.value = false            // about
}
function menuClose(){
    if (categoryShowed.value) {
        diaryStore.isListNeedBeReload = true
        menuInit()
    } else if (aboutShowed.value || helpShowed.value) {
        uiStore.isMenuShowed = true // menu panel
        menuListShowed.value = true        // menu list
        categoryShowed.value = false       // category
        yearShowed.value = false           // year
        settingsShowed.value = false       // settings
        helpShowed.value = false           // help
        aboutShowed.value = false          // about
    } else if (yearShowed.value) {
        diaryStore.isListNeedBeReload = true
        menuInit()
    } else if (uiStore.isMenuShowed) {
        menuInit()
    }
}
function menuInit() {
    uiStore.isMenuShowed = false         // menu panel
    menuListShowed.value = true      // menu list
    categoryShowed.value = false     // category
    yearShowed.value = false         // year
    settingsShowed.value = false     // settings
    helpShowed.value = false         // help
    aboutShowed.value = false        // about
}
function menuListClicked(menuName: string) {
    switch (menuName) {
        case 'search':
            uiStore.isShowSearchBar = true
            menuInit()
            nextTick(() => {
                (document.querySelector('.search-bar input') as HTMLInputElement)?.focus()
            })
            break
        case 'todo':
            let nextCategories: string[] = []
            if (filterStore.filteredCategories.length === 1 && filterStore.filteredCategories[0] === 'todo'){
                nextCategories = []
            } else {
                nextCategories = ['todo']
            }
            filterStore.isFilterShared = false
            filterStore.SET_FILTERED_CATEGORIES(nextCategories)
            diaryStore.isListNeedBeReload = true
            menuInit()
            break
        case 'category':
            uiStore.isMenuShowed = true  // menu panel
            menuListShowed.value = false // menu list
            categoryShowed.value = true  // category
            yearShowed.value = false     // year
            settingsShowed.value = false // settings
            aboutShowed.value = false    // about
            break
        case 'bankCard':
            popFeatureUnavailable()
            break
        case 'year':
            uiStore.isMenuShowed = true    // menu panel
            menuListShowed.value = false   // menu list
            categoryShowed.value = false   // category
            yearShowed.value = true        // year
            settingsShowed.value = false   // settings
            aboutShowed.value = false      // about
            break
        case 'settings':
            uiStore.isMenuShowed = true    // menu panel
            menuListShowed.value = false   // menu list
            categoryShowed.value = false   // category
            yearShowed.value = false       // year
            settingsShowed.value = true    // settings
            helpShowed.value = false       // help
            aboutShowed.value = false      // about
            break
        case 'help':
            uiStore.isMenuShowed = true    // menu panel
            menuListShowed.value = false   // menu list
            categoryShowed.value = false   // category
            yearShowed.value = false       // year
            settingsShowed.value = false   // settings
            helpShowed.value = true        // help
            aboutShowed.value = false      // about
            break
        case 'about':
            uiStore.isMenuShowed = true    // menu panel
            menuListShowed.value = false   // menu list
            categoryShowed.value = false   // category
            yearShowed.value = false       // year
            settingsShowed.value = false   // settings
            helpShowed.value = false       // help
            aboutShowed.value = true       // about
            break
        default:
            break
    }
}
</script>

<style scoped lang="sass"></style>
