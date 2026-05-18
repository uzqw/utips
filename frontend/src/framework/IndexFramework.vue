<template>
    <div>
        <Navbar/>

        <!-- 竖屏时 -->
        <div class="diary" v-if="uiStore.isInMobileMode" :style="`height:${uiStore.insets.heightPanel}px`">
            <div ref="refDiaryList" class="diary-list-container diary-list-container-mobile"
                 :style="`height:${uiStore.insets.heightPanel}px`">
                <RouterView/>
            </div>
        </div>

        <!-- 横屏时 -->
        <div class="diary" v-else>
            <div ref="refDiaryList" class="diary-list-container" :style="`height:${uiStore.insets.heightPanel}px`">
                <List/>
            </div>
            <div class="diary-container" :style="`height:${uiStore.insets.heightPanel}px`">
                <RouterView/>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import List from "@/view/DiaryList/List.vue"
import Navbar from "./navbar/Navbar.vue"
import statisticApi from "../api/statisticApi.ts";

import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
const uiStore = useUIStore();
const categoryStore = useCategoryStore()
const diaryStore = useDiaryStore();

import {onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {storeToRefs} from "pinia";

const route = useRoute()
const router = useRouter()
const refDiaryList = ref()

onMounted(() => {
    getStatistic() // 载入统计信息
})

const { isShowSearchBar } = storeToRefs(uiStore)
watch(isShowSearchBar, newValue => {
    if (newValue){
        refDiaryList.value.scrollTo(0, 0)
    } else {

    }
})

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
        categoryStore.dataArrayYear = statisticsYear.reverse()
                                                    .map(year => {
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
