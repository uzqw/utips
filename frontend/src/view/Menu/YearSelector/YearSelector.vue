<template>
    <MenuPanelContainer>
        <div class="year-container" v-if="categoryStore.statisticsYear.length > 0">
            <div class="year" v-for="(year,indexYear) in categoryStore.statisticsYear" :key="indexYear">
                <div class="year-header">
                    <span>{{ year.year }}</span>
                    <sup class="count">{{ year.count }}</sup>
                </div>
                <div class="year-list">
                    <div :class="['year-month-item', {active: filterStore.dateFilterArray.includes(month.id)}]"
                         v-for="(month, indexMonth) in year.months"
                         @click="monthClicked(month.id)"
                         :key="indexMonth">
                        <p class="month">{{ month.month }}</p>
                        <span class="month-count">{{ month.count }}</span>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="year-tip"> {{ $tt('- 空 -') }} </div>
    </MenuPanelContainer>
</template>

<script lang="ts" setup>
import {useUIStore, useCategoryStore, useFilterStore} from "../../../stores";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
const uiStore = useUIStore(); const categoryStore = useCategoryStore()
const filterStore = useFilterStore()

function monthClicked(monthId: string) {
    let index = filterStore.dateFilterArray.indexOf(monthId)
    if (index > -1) {
        filterStore.dateFilterArray.splice(index, 1)
    } else {
        filterStore.dateFilterArray.push(monthId)
    }
    filterStore.SET_DATE_FILTER_ARRAY(filterStore.dateFilterArray)
}
</script>

<style lang="scss" scoped>
@import "year-selector";
</style>
