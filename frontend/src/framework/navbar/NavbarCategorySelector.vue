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
                    >
                        <span class="first-letter">{{ getFirstLetter(translateCategoryName(item)) }}</span>
                        <span class="full-text">{{ getRestText(translateCategoryName(item)) }}</span>
                    </div>
                    <div :class="['navbar-category-list-item', 'share-item' ,'ml-3', {active: filterStore.isFilterShared}]" @click="toggleFilterShared">
                        <span class="first-letter">{{ getFirstLetter($tt('共享')) }}</span>
                        <span class="full-text">{{ getRestText($tt('共享')) }}</span>
                    </div>

                </div>
                <div class="navbar-category-list-special">
                    <div class="navbar-category-list-item special" @click="setFilteredCategoriesAll">
                        <span class="first-letter">{{ getFirstLetter($tt('全选')) }}</span>
                        <span class="full-text">{{ getRestText($tt('全选')) }}</span>
                    </div>
                    <div class="navbar-category-list-item special" @click="setFilteredCategoriesClean" >
                        <span class="first-letter">{{ getFirstLetter($tt('清选')) }}</span>
                        <span class="full-text">{{ getRestText($tt('清选')) }}</span>
                    </div>
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

const getFirstLetter = (text: string) => {
    return text ? text.charAt(0) : ''
}
const getRestText = (text: string) => {
    return text ? text.slice(1) : ''
}

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
        color: #ffffff;
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
    color: #ffffff;
    @extend .btn-like;
    display: flex;
    align-items: center;

    .first-letter {
        display: inline-block;
    }
    
    .full-text {
        display: inline-block;
        vertical-align: top;
        max-width: 200px;
        overflow: hidden;
        white-space: nowrap;
        transition: max-width 0.2s ease-in-out, opacity 0.2s ease-in-out, margin-left 0.2s ease-in-out;
    }

    &.special{
        font-weight: bold;
        color: #ffffff;
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
        color: #ffffff;
        &.active.share-item{
            color: white;
        }
        &.special{
            color: #ffffff;
        }
    }

}

@media (max-width: 1366px) {
    .navbar-category-list-item {
        .full-text {
            max-width: 0 !important;
            opacity: 0 !important;
            margin-left: 0 !important;
            padding-left: 0 !important;
            pointer-events: none;
        }
        &:hover {
            .full-text {
                max-width: 100px !important;
                opacity: 1 !important;
                margin-left: 2px !important;
                pointer-events: auto;
            }
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
