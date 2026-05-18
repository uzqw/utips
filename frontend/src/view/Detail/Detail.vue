<template>
    <div class="diary-detail" id="diaryDetail" :style="`min-height: ${uiStore.insets.heightPanel}px`">

            <DetailHeader
                :isLoading="isLoading"
                :diary="diary"
                :lunar-object="lunarObject"
            />

            <!-- pc 时不显示展示加载图标 -->
            <Loading :loading="isLoading" v-if="uiStore.isInMobileMode"/>

            <!--TITLE-->
            <div class="diary-title" v-if="diary.title">
                <h2>{{ diaryStore.isHideContent ? diary.title.replace(/[^，。 \n]/g, '*') : diary.title }}</h2>
                <div class="toolbar">
                    <ButtonSmall class="clipboard" :data-clipboard="diary.title">{{ $tt('复制') }}</ButtonSmall>
                </div>
            </div>

            <!--CONTENT-->
            <div class="diary-content" v-if="diary.content">
                <div v-if="diary.expand?.category?.name_en === 'todo'">
                    <ToDo :readonly="false" :diary="diary" @saved="handleTodoSaved"/>
                </div>

                <div v-else>
                    <div class="toolbar">
                        <ButtonSmall class="clipboard" type="confirm" :data-clipboard="diary.content">{{ $tt('全部复制') }}</ButtonSmall>
                        <ButtonSmall class="clipboard" v-if="isShowExplode" @click="toggleContentType">{{ $tt('普通') }}</ButtonSmall>
                        <ButtonSmall class="clipboard" v-else @click="toggleContentType">{{ $tt('炸词') }}</ButtonSmall>
                    </div>
                    <div v-if="isShowExplode">
                        <WordExplode v-if="diary.content" :content="diary.content"/>
                    </div>

                    <div v-else>
                        <div v-if="diary.is_markdown && !diaryStore.isHideContent" class="markdown" v-html="contentMarkDownHtml"/>
                        <div v-else class="content" v-html="getContentHtml(diary.content)"/>
                    </div>

                </div>
            </div>

        </div>
</template>

<script lang="ts" setup>
import ClipboardJS from "clipboard"
import Loading from "../../components/Loading.vue"
import diaryApi from "../../api/diaryApi.ts"
import { parseMarkdown, renderMermaid } from "@/markdown"
import calendar from "js-calendar-converter";
import Moment from "moment";
import DetailHeader from "@/view/Detail/DetailHeader.vue";
import WordExplode from "@/view/Detail/WordExplode.vue";
import ButtonNormal from "../../components/ButtonNormal.vue";
import ToDo from "./ToDo.vue";
import {DiaryEntityFromServer} from "@/types/diary.ts";
import {LunarDateEntity} from "@/types/LunarDate.ts";
import ButtonSmall from "@/components/ButtonSmall.vue";

import {popMessage, dateProcess, temperatureProcessSTC} from "@/utility.ts";

import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
import { useFilterStore } from "@/stores/filter";
const uiStore = useUIStore();
const categoryStore = useCategoryStore()
const diaryStore = useDiaryStore()
const filterStore = useFilterStore()
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
const router = useRouter()
const route = useRoute()


const isLoading = ref(false) // loading
const diary = ref<DiaryEntityFromServer>({})
const clipboard = ref() // clipboard obj
const lunarObject = ref<LunarDateEntity>({})
const isShowExplode = ref(false)

// Keyboard: Ctrl+E to enter edit mode
const keydownHandler = (event: KeyboardEvent) => {
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
    if ((event.ctrlKey || event.metaKey) && key === 'e') {
        event.preventDefault()
        // Mirror navbar's edit button behavior
        diaryStore.CLEAR_CACHE()
        const idParam = (diaryStore.currentDiary?.id)
            || ((route.params as any)?.id)
            || ((diary.value as any)?.id)
        if (idParam) {
            router.push(`/edit/${idParam}`)
        } else {
            router.push('/edit')
        }
    } else if ((event.ctrlKey || event.metaKey) && event.altKey && key === 'n') {
        event.preventDefault()
        diaryStore.CLEAR_CACHE()
        router.push({name: 'EditNew'})
    }
}

onMounted(()=>{
    // 初始化时，载入第一次点击的 id 内容
    if (route.params.id){
        showDiary(String(route.params.id))
    }

    // Initial mermaid render
    renderMermaid()


    // 绑定剪贴板操作方法
    clipboard.value = new ClipboardJS('.clipboard', {
        text: trigger => {
            return trigger.getAttribute('data-clipboard') || ''
        },
    })
    clipboard.value.on('success', ()=>{  // 还可以添加监听事件，如：复制成功后提示
        popMessage('success', '已复制到 剪贴板', null, 1)
    })

    // Add keyboard listener without overriding other handlers
    window.addEventListener('keydown', keydownHandler)
})

onUnmounted(()=>{
    clipboard.value.destroy()
    window.removeEventListener('keydown', keydownHandler)
})

const contentMarkDownHtml = computed(()=>{
    return parseMarkdown(diary.value?.content || '')
})

// Watch for content changes to re-render mermaid
watch(contentMarkDownHtml, () => {
    // Wait for DOM update
    setTimeout(() => {
        renderMermaid()
    }, 100)
})


watch(() => route.params.id, (newValue) => {
    if (newValue){
        showDiary(String(newValue))
    }
})

function toggleContentType(){
    isShowExplode.value = !isShowExplode.value
}

function getContentHtml(content: string){
    let isInCodeMode = /\[ ?code ?]/i.test(content)

    if (isInCodeMode){
        return `<pre class="code">${diaryStore.isHideContent? content.replace(/[^，。 \n]/g, '*'): content}</pre>`
    } else {
        let contentArray = content.split('\n')
        let contentHtml = ""
        contentArray.forEach(item => {
            if (item === ''){
                contentHtml += '<br/>'
            } else {
                contentHtml += `${diaryStore.isHideContent ? item.replace(/[^，。 \n]/g, '*'): item}<br/>`
            }
        })
        return contentHtml
    }

}
function handleTodoSaved(savedDiary: DiaryEntityFromServer) {
    diary.value = {
        ...diary.value,
        ...savedDiary,
        dateObj: diary.value.dateObj,
        categoryString: diary.value.categoryString,
    }
    diaryStore.currentDiary = diary.value
    diaryStore.isListNeedBeReload = true
}

function  showDiary(diaryId: string) {
    isLoading.value = true
    let requestData = {diaryId: diaryId}
    diaryApi
        .detail(requestData)
        .then(res => {
            isLoading.value = false // loading off
            let tempDiary = res
            diary.value = tempDiary
            let dateMoment = Moment(diary.value.date)
            lunarObject.value = calendar.solar2lunar(dateMoment.year(), dateMoment.month()+1, dateMoment.date())
            diaryStore.currentDiary = tempDiary // 设置 store: currentDiary
            let dateObj = dateProcess(tempDiary.date)
            diary.value.dateObj = dateObj
            document.title = 'utips' // 固定浏览器标签标题
            diary.value.temperature = temperatureProcessSTC(tempDiary.temperature)
            diary.value.temperature_outside = temperatureProcessSTC(tempDiary.temperature_outside)

            tempDiary.categoryString = categoryStore.categoryNameMap.get(tempDiary.category)
        })
        .catch(() => {
            isLoading.value = false // loading off
            router.push({name: 'List'})
        })
}

</script>

<style lang="scss">
@import "detail";
</style>
