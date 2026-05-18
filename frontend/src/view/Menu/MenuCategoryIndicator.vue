<template>
    <div class="indicator-list">
        <div class="indicator-list-item"
             v-for="(item, index) in categoryStore.categoryAll" :key="index"
             :style="indicatorStyle(item)"
        />
        <div class="indicator-list-item" :style="filterStore.isFilterShared? 'background-color: white':''"/>
    </div>
</template>

<script lang="ts" setup>
import {CategoryEntity} from "@/types/Category.ts";
import { useFilterStore } from "@/stores/filter";
import { useCategoryStore } from "@/stores/category";
const filterStore = useFilterStore(); const categoryStore = useCategoryStore()

function indicatorStyle(category: any){
    if (filterStore.filteredCategories.indexOf(category.name_en) > -1){
        return `background-color: ${category.color}`
    } else {
        return ''
    }
}

</script>

<style lang="scss" scoped>
@use "sass:math";
@import "../../scss/plugin";

$height-indicator: 8px;
.indicator-list{
    width: $height-indicator * (8+3);
    cursor: pointer;
    @extend .btn-like;
    height: $height-navbar;
    padding: math.div($height-navbar - $height-indicator * 2 - 3, 2) 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-flow: row wrap;
    .indicator-list-item{
        margin-right: 3px;
        margin-bottom: 3px;
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


</style>
