<template>
    <MenuPanelContainer>
        <ul class="menu-category-list">
            <li class="menu-category-item" v-for="(item, index) in categoryStore.categoryAll" :key="index"
                :style="categoryMenuItemStyle(item)"
                @click="toggleCategory(item)"
            >
                <div>{{ translateCategoryName(item) }}<span class="count">{{ categoryStore.statisticsCategory[item.name_en] }}</span></div>
            </li>
        </ul>

        <div class="menu-category-list category-operations-container">
            <div :class="['menu-category-item', 'menu-category-shared', {active: filterStore.isFilterShared}]"
                 @click="toggleFilterShared">{{ $tt('共享日记') }}</div>
        </div>

        <div class="menu-category-list category-operations-container">
            <div @click="selectCategoryAll" class="menu-btn">{{ $tt('全选') }}</div>
            <div @click="reverseCategorySelect" class="menu-btn">{{ $tt('反选') }}</div>
            <div @click="selectCategoryWork" class="menu-btn">{{ $tt('周报') }}</div>
        </div>
    </MenuPanelContainer>
</template>

<script lang="ts" setup>

import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useFilterStore } from "@/stores/filter";
import { useDiaryStore } from "@/stores/diary";
import {onMounted, ref, watch} from "vue";
import {CategoryEntity} from "@/types/diary.ts";
import {getDiaryConfigFromLocalStorage, getCategoryAll} from "@/utility.ts";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import {translateCategoryName} from "@/i18n/text";

const uiStore = useUIStore(); const categoryStore = useCategoryStore();
const filterStore = useFilterStore(); const diaryStore = useDiaryStore();

const filterShared = ref(false) // 是否筛选已共享的日记

onMounted(()=>{
    filterShared.value = getDiaryConfigFromLocalStorage().isFilterShared
})

watch(filterShared, newValue => {
    filterStore.isFilterShared = newValue
})

function toggleFilterShared(){
    filterStore.SET_IS_FILTERED_SHARED(!filterStore.isFilterShared)
}
function toggleCategory(category: CategoryEntity){
    let index = filterStore.filteredCategories.indexOf(category.name_en)
    if ( index > -1) {
        filterStore.filteredCategories.splice(index, 1)
    } else {
        filterStore.filteredCategories.push(category.name_en)
    }
    filterStore.SET_FILTERED_CATEGORIES(filterStore.filteredCategories)
    diaryStore.isListNeedBeReload = true
}
function categoryMenuItemStyle(category: CategoryEntity){
    if (filterStore.filteredCategories.indexOf(category.name_en) > -1){
        return `background-color: ${category.color}; border: 1px solid ${category.color};`
    } else {
        return ``
    }
}
function selectCategoryAll() {
    filterStore.SET_FILTERED_CATEGORIES(getCategoryAll().map(item => item.name_en))
}
function reverseCategorySelect() {
    let tempCategories = [].concat(categoryStore.categoryAll.map(item => item.name_en))
    filterStore.filteredCategories.forEach(item => {
        tempCategories.splice(tempCategories.indexOf(item), 1)
    })
    filterStore.SET_FILTERED_CATEGORIES(tempCategories)
}
function selectCategoryWork(){
    filterStore.SET_FILTERED_CATEGORIES(['work', 'week'])
}
</script>
