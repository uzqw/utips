<template>
    <RouterLink ref="listItem"
                 :class="['diary-list-item', {active: isActive}]"
                 :to="`/detail/${diary.id}`"
                 :style="diaryItemStyle"
    >
        <i :class="['category']" :style="`background-color: ${categoryStore.categoryObjectMap.get(diary.category).color}`"></i>

        <span class="date">{{ diary.date }}</span>

        <div class="detail">
            <p class="title" v-if="diaryStore.isHideContent">{{ diary.title.replace(/[^，。 \n]/g, '*') }}</p>
            <p class="title" v-else>{{ diary.title }}</p>
            <template v-if="diary.hasOwnProperty('billData')">
                <div v-if="diaryStore.isHideContent" :class="['bill-amount', {'bill-in': diary.billData.sum > 0}]">
                    {{diary.billData.sum.toFixed(uiStore.moneyAccuracy).replace(/[^，。 \n]/g, '*')}}
                </div>
                <div v-else :class="['bill-amount', {'bill-in': diary.billData.sum > 0}]">
                    {{diary.billData.sum>0?'+ ':''}}{{diary.billData.sum.toFixed(uiStore.moneyAccuracy)}}
                </div>
            </template>

            <img alt="Content"
                 class="icon"
                 :src="contentIcon"/>
            <img :alt="diary.weather"
                 v-if="diary.weather"
                 class="icon"
                 :src="weatherIcon"/>
        </div>
    </RouterLink>
</template>

<script lang="ts" setup>
import WeatherIcons from "@/assets/icons/WeatherIcons";
import CommonIcons from "@/assets/icons/CommonIcons";
import {computed} from "vue";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
import {DiaryEntityFromServer} from "@/types/diary.ts";
const uiStore = useUIStore()
const categoryStore = useCategoryStore()
const diaryStore = useDiaryStore()

const props = withDefaults(defineProps<{
    isActive: boolean,
    diary: DiaryEntityFromServer
}>(), {
    isActive: false
})

const weatherIcon = computed(() => {
    if (props.isActive) {
        return WeatherIcons[`${props.diary.weather}_white`]
    } else {
        if (props.diary.is_public) {
            return WeatherIcons[`${props.diary.weather}_active`]
        } else {
            return WeatherIcons[props.diary.weather]
        }
    }
})
const diaryItemStyle = computed(() => {
    if (props.isActive){
        return `background-color: ${categoryStore.categoryObjectMap.get(props.diary.category).color}`
    }
})
const categoryStyle = computed(() => {
    if (props.diary.category) {
        return `background-color: ${categoryStore.categoryObjectMap.get(props.diary.category).color}`
    } else {
        return ``
    }
})
const contentIcon = computed(() => {
    if (props.diary.is_markdown){
        if (props.isActive){
            return CommonIcons.content_md_white
        } else {
            return CommonIcons.content_md
        }
    } else {
        if (props.isActive){
            return CommonIcons.content_white
        } else {
            return CommonIcons.content
        }
    }
})

</script>

<style lang="scss" scoped>
@import "list-item";
</style>
