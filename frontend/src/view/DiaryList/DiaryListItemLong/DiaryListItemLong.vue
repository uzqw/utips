<template>
    <div :class="['article', {active: isActive},]" :style="diaryArticleItemStyle">
        <RouterLink
            :style="diaryItemHeaderStyle"
            :to="`/detail/${props.diary.id}`"
            :class="['article-header']"
        >
            <div class="date">{{ props.diary.dateString }}</div>
            <div class="weather">
                <img v-if="props.diary.weather"
                     :src="WeatherIcons[props.diary.weather + suffix]"
                     :alt="props.diary.weather">
            </div>
            <div class="week">{{ translateText(props.diary.weekday) }}</div>
            <div class="category" :style="diaryItemCategoryTextStyle" >{{ diaryCategoryName }}</div>
        </RouterLink>

        <div class="article-body" v-if="diaryStore.isHideContent">
            <div class="title">{{ props.diary.title.replace(/[^，。 \n]/g, '*') }}</div>
            <div class="content" v-html="props.diary.contentHtml?.replace(/[^，。 \n]/g, '*')"/>
        </div>
        <div class="article-body" v-else>
            <div class="title">{{ props.diary.title }}</div>
            <div class="markdown" v-if="props.diary.is_markdown" v-html="props.diary.contentMarkDownHtml"/>
            <div class="content" v-else v-html="props.diary.contentHtml"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {computed, onMounted} from "vue";
import { renderMermaid } from "@/markdown";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
import {useRoute} from "vue-router";
import WeatherIcons from "@/assets/icons/WeatherIcons";
import CommonIcons from "@/assets/icons/CommonIcons";
import {DiaryEntityFromServer} from "../Diary.ts";
import {translateCategoryName, translateText} from "@/i18n/text";
const uiStore = useUIStore()
const categoryStore = useCategoryStore()
const diaryStore = useDiaryStore()
const route = useRoute()


const props = defineProps<{
    diary: DiaryEntityFromServer
}>()

const isActive = computed(() => {
    return String(route.params.id) === String(props.diary.id)
})
const suffix = computed(()=> {
    return isActive.value ? '_white' : ''
})
const diaryCategoryName = computed(() => {
    return translateCategoryName(categoryStore.categoryObjectMap.get(props.diary.category))
})
const diaryItemHeaderStyle = computed(()=>{
    if (isActive.value){
        return `
              background-color: ${categoryStore.categoryObjectMap.get(props.diary.category).color};
                `
    } else {
        return ''
    }
})
const diaryArticleItemStyle = computed(()=>{
    if (isActive.value){
        return `
              border-color: ${categoryStore.categoryObjectMap.get(props.diary.category).color};
                `
    } else {
        return ''
    }
})
const diaryItemCategoryTextStyle = computed(()=>{
    if (isActive.value){

    } else {
        return `
              color:  ${categoryStore.categoryObjectMap.get(props.diary.category).color}
                `
    }
})

onMounted(() => {
    renderMermaid()
})

</script>

<style lang="scss" scoped>
@import "./list-item-long";
</style>
