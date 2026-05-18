<template>
    <div class="indicator-list-inline">
        <div class="indicator-list-item"
             v-for="(item, index) in categoryStore.categoryAll" :key="index"
             :style="`border-color: ${item.color}; ${indicatorItemStyle(item)}`"
        />
        <div class="indicator-list-item" :style="filterStore.isFilterShared? 'background-color: white':''"/>
    </div>
</template>

<script lang="ts" setup>
import {CategoryEntity} from "@/types/Category.ts";
import { useCategoryStore } from "@/stores/category";
import { useFilterStore } from "@/stores/filter";
const categoryStore = useCategoryStore();
const filterStore = useFilterStore();

function indicatorItemStyle(category: CategoryEntity): string{
    if (filterStore.filteredCategories.indexOf(category.name_en) > -1){
        return `background-color: ${category.color};`
        // return `border-bottom: 1px solid ${category.color};`
    } else {
        return ``
    }
}

</script>

<style lang="scss" scoped>
@use "sass:math";
@import "../../scss/plugin";

$width-indicator: 3px;
.indicator-list-inline{
    width: 3px;
    height: 100%;
    position: absolute;
    bottom: 0;
    top: 0;
    right: 10px;
    cursor: pointer;
    @extend .btn-like;
    display: flex;
    justify-content: stretch;
    flex-flow: column nowrap;
    .indicator-list-item{
        flex-shrink: 0;
        flex-grow: 1;
        border: 1px dotted white;
        width: $width-indicator;
        &:nth-child(2n){
            margin-bottom: 0;
        }
    }
}


</style>
