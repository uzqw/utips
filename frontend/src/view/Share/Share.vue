<template>
    <div class="share-container">
        <div class="share" :style="`min-height:${heightShare}px`">
            <!-- LOADING -->
            <div v-if="isLoadingDiary">
                <Loading :loading="isLoadingDiary"/>
            </div>

            <div v-else>
                <div v-if="currentDiary && currentDiary.title">
                    <!--CONTENT-->
                    <div class="share-head">
                        <!--head-->
                        <div class="share-title">
                            <h2>{{ currentDiary.title }}</h2>
                        </div>
                        <div class="share-date">
                            <div class="above">
                                <h3>{{ dateObj.weekday }} </h3>
                                <div class="share-category" :style="shareCategoryStyle">
                                    <span>{{ currentDiary.categoryString }}</span>
                                </div>
                            </div>
                            <div class="bottom">{{ dateObj.dateFull }}</div>
                        </div>

                        <!--META-->
                        <div class="share-meta">
                            <div class="weather">
                                <img v-if="currentDiary.weather"
                                     :src="WeatherIcons[`${currentDiary.weather}_active`]"
                                     :alt="currentDiary.weather">
                            </div>
                            <div class="temperature" v-if="currentDiary.temperature || currentDiary.temperature_outside">
                                <span v-if="currentDiary.temperature">{{ currentDiary.temperature }}</span>
                                <span v-if="currentDiary.temperature && currentDiary.temperature_outside"> / </span>
                                <span v-if="currentDiary.temperature_outside">{{ currentDiary.temperature_outside }}</span>
                                <span>℃</span>
                            </div>
                        </div>

                        <!--end of head-->
                    </div>

                    <div class="divider" v-if="currentDiary.content"></div>

                    <!--CONTENT-->
                    <div class="share-content">
                        <ToDo v-if="currentDiary.expand?.category?.name_en === 'todo'" :readonly="true" :diary="currentDiary"/>
                        <div v-else>
                            <div v-if="currentDiary.is_markdown" class="markdown" v-html="contentMarkDownHtml"/>
                            <div v-else class="content" v-html="currentDiary.contentHtml"/>
                        </div>
                    </div>

                    <div class="share-author">
                        <div class="line"></div>
                        <div class="name">
                            <div class="nickname">{{ currentDiary.nickname }}</div>
                            <div class="username">{{ currentDiary.username }}</div>
                        </div>
                    </div>
                </div>

                <!-- NO DIARY -->
                <div v-else class="no-diary">
                    <p>{{ $tt('无此日记') }}</p>
                </div>
            </div>

        </div>

        <RouterLink class="back-link" to="/">
            <img :src="LogoIcons.logo" alt="logo">
            utips
        </RouterLink>

    </div>
</template>

<script lang="ts" setup>
import Loading from "../../components/Loading.vue"
import diaryApi from "../../api/diaryApi.ts"
import { parseMarkdown, renderMermaid } from "@/markdown";
import ToDo from "@/view/Detail/ToDo.vue";

import {
    dateProcess,
    temperatureProcessSTC,
    getCategoryAll,
    DateUtilityObject
} from "@/utility.ts";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";

const uiStore = useUIStore(); const categoryStore = useCategoryStore();
const diaryStore = useDiaryStore();
import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {DiaryEntityFromServer} from "@/types/diary.ts";
import WeatherIcons from "../../assets/icons/WeatherIcons";
import LogoIcons from "../../assets/icons/LogoIcons";
const route = useRoute()

const currentDiary = ref<DiaryEntityFromServer>(null)
const dateObj = ref<DateUtilityObject>({})
const isLoadingDiary = ref(false) // 日记请求中


const heightShare = computed(()=>{
    return uiStore.insets.windowsWidth > 400 ?
        uiStore.insets.windowsHeight - 60 - 100
        : uiStore.insets.windowsHeight
})
const shareCategoryStyle = computed(()=>{
    return `background-color: ${categoryStore.categoryObjectMap.get(currentDiary.value?.category)?.color}`
})

const contentMarkDownHtml = computed(()=>{
    return parseMarkdown(currentDiary.value?.content || '')
})


// Watch for content changes to re-render mermaid
watch(contentMarkDownHtml, () => {
    // Wait for DOM update
    setTimeout(() => {
        renderMermaid()
    }, 100)
})


onMounted(()=>{
    getDiaryInfo(String(route.params.id))
})


function getDiaryInfo(diaryId: string){
    isLoadingDiary.value = true
    let requestData = {
        diaryId: diaryId
    }
    diaryApi
        .detail(requestData)
        .then(res => {

            // 日记信息
            const tempDiary = res

            isLoadingDiary.value = false
            currentDiary.value = tempDiary
            dateObj.value = dateProcess(tempDiary.date)
            document.title = 'utips' // 固定浏览器标签标题
            if (currentDiary.value.content) {
                currentDiary.value.contentHtml = getContentHtml(tempDiary.content)
            }
            currentDiary.value.temperature = temperatureProcessSTC(tempDiary.temperature)
            currentDiary.value.temperature_outside = temperatureProcessSTC(tempDiary.temperature_outside)

            // category map
            let categoryNameMap = new Map()
            getCategoryAll().forEach(item => {
                categoryNameMap.set(item.id, item.name)
            })
            currentDiary.value.categoryString = categoryNameMap.get(tempDiary.category) || tempDiary.expand?.category?.name

        })
        .catch(() => {
            isLoadingDiary.value = false
            currentDiary.value = null
        })
}
function getContentHtml(content: string){
    let isInCodeMode = /\[ ?code ?\]/i.test(content)
    let contentArray = content.split('\n')
    let contentHtml = ""
    if (isInCodeMode){
        return `<pre class="code">${diaryStore.isHideContent? content.replace(/[^，。 \n]/g, '*'): content}</pre>`
    } else {
        contentArray.forEach(item => {
            if (item === '') {
                contentHtml += '<br/>'
            } else {
                contentHtml += `${diaryStore.isHideContent ? item.replace(/[^，。 \n]/g, '*') : item}<br/>`
            }
        })
        return contentHtml
    }
}

watch(() => route.params.id, newValue => {
    console.log(newValue)
    getDiaryInfo(String(newValue))
})

</script>
<style lang="scss">
@import "./share";
</style>
