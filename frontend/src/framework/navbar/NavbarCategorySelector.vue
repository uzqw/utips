<template>
    <!--category-->
    <div class="navbar-category-filter">
        <transition
            enter-active-class="animated-fast slideInRight"
            leave-active-class="animated-fast slideOutRight"
        >
            <div class="navbar-category-list-container" >
                <div class="navbar-category-list">
                    <div :class="['navbar-category-list-item', {active: filterStore.filteredCategories.includes(item.name_en)}]"
                         v-for="(item, index) in categoryStore.categoryAll" :key="index"
                         :style="categoryMenuItemStyle(item)"
                         @click="categoryFilter(item)"
                    >{{ translateCategoryName(item) }}</div>
                    <div :class="['navbar-category-list-item', 'share-item' ,'ml-3', {active: filterStore.isFilterShared}]" @click="toggleFilterShared">{{ $tt('共享') }}</div>

                </div>
                <div class="navbar-category-list-special">
                    <div class="navbar-category-list-item special" @click="setFilteredCategoriesAll">{{ $tt('全选') }}</div>
                    <div class="navbar-category-list-item special" @click="setFilteredCategoriesClean" >{{ $tt('清选') }}</div>
                </div>
            </div>


        </transition>
    </div>
</template>

<script lang="ts" setup>
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useFilterStore } from "@/stores/filter";
import { useDiaryStore } from "@/stores/diary";
import {CategoryEntity} from "@/types/Category.ts";
import {translateCategoryName} from "@/i18n/text";

const uiStore = useUIStore();
const categoryStore = useCategoryStore()
const filterStore = useFilterStore()
const diaryStore = useDiaryStore()

function toggleFilterShared(){
    filterStore.SET_IS_FILTERED_SHARED(!filterStore.isFilterShared)
    diaryStore.isListNeedBeReload = true
}
function setFilteredCategoriesDefault() {
    filterStore.SET_FILTERED_CATEGORIES(filterStore.filteredCategories)
    diaryStore.isListNeedBeReload = true
}
function setFilteredCategoriesClean() {
    filterStore.SET_FILTERED_CATEGORIES([])
    diaryStore.isListNeedBeReload = true
}
function setFilteredCategoriesAll() {
    let tempCategories = [].concat(categoryStore.categoryAll.map(item => item.name_en))
    filterStore.SET_FILTERED_CATEGORIES(tempCategories)
    diaryStore.isListNeedBeReload = true
}
function categoryFilter(category: CategoryEntity) {
    let tempCategories = [].concat(filterStore.filteredCategories as any)
    if (filterStore.filteredCategories.indexOf(category.name_en) > -1){
        tempCategories.splice(filterStore.filteredCategories.indexOf(category.name_en), 1)
    } else {
        tempCategories.push(category.name_en)
    }

    filterStore.SET_FILTERED_CATEGORIES(tempCategories)
    diaryStore.isListNeedBeReload = true
}

// STYLE
function categoryMenuItemStyle(category: CategoryEntity){
    if (filterStore.filteredCategories.indexOf(category.name_en) > -1){
        return `color: ${category.color}; opacity: 1; font-weight: bold;`
        // return `color: rgba(255,255,255,0.8); font-weight: bold;`
    } else {
        return ``
    }
}
</script>

<style lang="scss" scoped>
@use "sass:math";
@import "../../scss/plugin";
$nav-btn-height: 15px;

.navbar-category-filter{
    display: flex;
}

.navbar-category-list-container{
    display: flex;
}


.navbar-category-list-special{
    align-items: center;
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    height: $height-navbar;
    //padding: ($height-navbar - $nav-btn-height * 2)/2;
    .navbar-category-list-item{
        color: transparentize(white, 0.5);
    }
}
.navbar-category-list{
    flex-shrink: 0;
    flex-grow: 1;
    align-items: center;
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    padding: math.div($height-navbar - $nav-btn-height * 2, 2);
    height: $height-navbar;
}
.navbar-category-list-item{
    //font-size: $fz-small;
    font-size: 13px;
    padding: 0 6px;
    height: $nav-btn-height;
    font-weight: normal;
    line-height: $nav-btn-height;
    color: transparentize(white, 0.6);
    @extend .btn-like;

    &.special{
        font-weight: bold;
        color: transparentize($color-main, 0.4);
    }
    &.active{
        color: white;
        font-weight: bold;
        &:hover{
            transform: translateY(-1px);
            text-shadow: 2px 2px 1px transparentize(black, 0.5);
        }
    }
    &:hover{
        font-weight: bold;
        color: rgba(255,255,255,0.6);
        &.active.share-item{
            color: white;
        }
        &.special{
            color: transparentize($color-main, 0.2);
        }
    }

}

$height-indicator: 8px;
.indicator-list{
    width: $height-indicator * (8+3);
    cursor: pointer;
    @extend .btn-like;
    height: $height-navbar;
    //padding: ($height-navbar - $height-indicator * 2 - 3)/2 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-flow: row nowrap;
    .indicator-list-item{
        margin-right: 3px;
        flex-shrink: 0;
        border: 1px dotted white;
        height: $height-indicator;
        width: $height-indicator;
        @include border-radius(2px);
        &:nth-child(2n){
            margin-bottom: 0;
        }
    }
}

@media (max-width: $grid-separate-width-sm) {
    .navbar-category-list{
        display: none;
    }
    .navbar-category-list-special{
        display: none;
    }

}
</style>
