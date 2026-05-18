<template>
    <div>
        <Navbar/>
        <!-- 横屏时 -->
        <div class="diary">
            <div class="diary-waterfall-container" :style="`height:${uiStore.insets.heightPanel}px`">
                <RouterView/>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import statisticApi from "../api/statisticApi.ts";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
const uiStore = useUIStore(); const categoryStore = useCategoryStore()
import { onMounted } from "vue";
import Navbar from "./navbar/Navbar.vue";

onMounted(()=>{
    getStatistic()
})


// 获取日记统计信息
function getStatistic() {
    statisticApi
        .category()
        .then(res => {
            categoryStore.statisticsCategory = res.data
            setDataArrayCategory(res.data)
        })
    statisticApi
        .year()
        .then(res => {
            categoryStore.statisticsYear = res.data
            setDataArrayYear(res.data)
        })
}
function setDataArrayYear(statisticsYear){
    if (statisticsYear){
        categoryStore.dataArrayYear = statisticsYear.reverse().map(year => {
            return {
                name: year.year,
                value: year.count
            }
        })
    }
}
function setDataArrayCategory(statisticsCategory){
    let keys = Object.keys(statisticsCategory)
    keys = keys.filter(item =>  item !== 'amount' && item !== 'shared')
    categoryStore.dataArrayCategory = keys.map(key => {
        return {
            name: categoryStore.categoryNameMap.get(key),
            value: statisticsCategory[key]
        }
    })
}

</script>

<style lang="scss" scoped>
.diary-list-container-mobile{
    width: 100%;
}
</style>
