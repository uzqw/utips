<template>
    <div class="diary-list-group-container" :style="`min-height: ${uiStore.insets.heightPanel}px`">
        <transition
            enter-active-class="animated-fast slideInDown"
            leave-active-class="animated-fast slideOutUp"
        >
            <div class="search-bar" v-if="uiStore.isShowSearchBar">
                <form @submit.prevent="search">
                    <input id="list-keyword" type="text" :placeholder="$tt('搜索内容')" v-model="keywordShow">
                    <span v-show="keywordShow.length > 0" @click="clearKeyword" class="clear">✕</span>
                </form>
            </div>
        </transition>

        <!-- 普通列表 -->
        <div class="diary-list-group" v-if="diaryStore.listStyle === EnumListStyle.list">
            <template v-for="item in diariesShow" :key="item.id">
                <ListHeader v-if="!item.title" size="" :title="item.date"/>
                <DiaryListItem v-else :isActive="route.params.id === String(item.id)" :category="item.category" :diary="item"/>
            </template>
        </div>

        <!-- 详情列表 -->
        <div class="diary-list-group" v-if="diaryStore.listStyle === EnumListStyle.detail">
            <template v-for="item in diariesShow" :key="item.id">
                <ListHeader v-if="!item.title" size="big" :title="item.date"/>
                <DiaryListItemLong v-else :diary="item"/>
            </template>
        </div>

        <div class="pt-4 pb-4" v-if="isLoading">
            <Loading :loading="isLoading"/>
        </div>

        <div v-show="!isLoading && !isHasMore" class="end-of-diary">
            <div class="no-diary-list" v-if="diaries.length < 1">{{ $tt('无日记') }}</div>
            <p>
                <img v-if="uiStore.colorMode === 'light'" :src="CommonIcons.EOF" alt="EOF">
                <img v-else :src="CommonIcons.EOFDark" alt="EOF">
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import DiaryListItem from "./DiaryListItem/DiaryListItem.vue"
import DiaryListItemLong from "./DiaryListItemLong/DiaryListItemLong.vue"
import Loading from "../../components/Loading.vue"
import diaryApi from "../../api/diaryApi.ts"
import ListHeader from "@/view/DiaryList/ListHeader.vue"
import { whiteIcons as TabIcons } from "@/assets/icons/TabIcons"
import CommonIcons from "@/assets/icons/CommonIcons"
import { parseMarkdown } from "@/markdown"

function throttle(fn: Function, delay: number) {
    let lastCall = 0;
    return function (...args: any[]) {
        const now = new Date().getTime();
        if (now - lastCall < delay) return;
        lastCall = now;
        return fn(...args);
    };
}

import {dateFormatter, dateProcess, EnumWeekDayShort} from "@/utility.ts";

import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
import { useFilterStore } from "@/stores/filter";
const uiStore = useUIStore()
const categoryStore = useCategoryStore()
const diaryStore = useDiaryStore()
const filterStore = useFilterStore()

import {nextTick, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {DiaryEntity, DiaryEntityFromServer, DiaryListOperation, DiarySearchParams} from "./Diary.ts";
import {storeToRefs} from "pinia";
import {EnumListStyle} from "@/listStyle.ts";

const router = useRouter()
const route = useRoute()

const isHasMore = ref(true)
const isLoading = ref(false)
const diaries = ref<Array<DiaryEntityFromServer>>([])
const diariesShow = ref<Array<DiaryEntity>>([])

const { isShowSearchBar } = storeToRefs(uiStore)
const { isListNeedBeReload, listOperation } = storeToRefs(diaryStore)

const formSearch = ref<DiarySearchParams>({
    keywords: '',
    pageNo: 1,
    pageSize: 100, // 单页请求条数
    categories: '',
    filterShared: 0, // 1 是筛选，0 是不筛选
    dateFilterString: '', // 日记年月筛选
    dateFilterArray: []   // 日记年月筛选 (多选)
})

onMounted(()=>{
    document.title = 'utips' // 固定浏览器标签标题
    keywordShow.value = filterStore.keywords && filterStore.keywords.join(' ')
    nextTick(()=>{
        addScrollEvent()
    })
    uiStore.isShowSearchBar = !!keywordShow.value

    if (diaryStore.listCache && !diaryStore.isListNeedBeReload) {
        // 从缓存恢复（移动端从详情页返回时保留滚动位置和已加载页数）
        const cache = diaryStore.listCache
        diaries.value = cache.diaries
        formSearch.value.pageNo = cache.pageNo
        isHasMore.value = cache.isHasMore
        isLoading.value = false
        refreshDiariesShow()
        nextTick(() => {
            const el = document.querySelector('.diary-list-container')
            if (el) el.scrollTop = cache.scrollTop
        })
    } else {
        reloadDiaryList()
    }
})

onBeforeUnmount(() => {
    const el = document.querySelector('.diary-list-container')
    diaryStore.listCache = {
        diaries: diaries.value,
        pageNo: formSearch.value.pageNo,
        scrollTop: el?.scrollTop || 0,
        isHasMore: isHasMore.value,
    }
})


// 刷新 diaries show
function refreshDiariesShow() {
    let tempShowArray: Array<DiaryEntity | { date: string }> = []
    const sourceArray = diaries.value

    if (sourceArray.length > 0) {
        let lastDiaryMonth = ''
        let lastDiaryDateString = ''

        for (let i = 0; i < sourceArray.length; i++) {
            let currentDiary = sourceArray[i]
            let currentDiaryFullDateString = dateFormatter(new Date(currentDiary.date), 'yyyy-MM-dd')
            let currentDiaryMonth = currentDiaryFullDateString.substring(0, 7)
            let currentDiaryDay = Number(currentDiaryFullDateString.substring(8, 10))

            // 添加年月标题
            if (currentDiaryMonth !== lastDiaryMonth) {
                tempShowArray.push({
                    date: currentDiaryMonth
                })
                lastDiaryMonth = currentDiaryMonth
            }

            let tempDiary: any = {}
            Object.assign(tempDiary, currentDiary)
            tempDiary.is_public = Boolean(currentDiary.is_public)

            // 如果日期和前一个不同，显示日期数字；否则不显示（同一天多条日记展示逻辑）
            if (currentDiaryFullDateString !== lastDiaryDateString) {
                tempDiary.date = currentDiaryDay
            } else {
                tempDiary.date = ''
            }

            tempShowArray.push(tempDiary)
            lastDiaryDateString = currentDiaryFullDateString
        }
    }
    diariesShow.value = tempShowArray
}

/* KEYWORD 相关 */
const keywordShow = ref('') // 关键词

function search() {
    reloadDiaryList()
}

watch(isShowSearchBar, newValue => {
    if (newValue){
        nextTick(() => {
            (document.querySelector('#list-keyword') as HTMLInputElement)?.focus()
        })
    }
})
watch(keywordShow, newValue => {
    if (newValue){ // 当有内容时才变化， '' 将不存储
        filterStore.SET_KEYWORD(newValue.split(' '))
    } else {
        filterStore.SET_KEYWORD([])
    }
})

function clearKeyword() {
    filterStore.SET_KEYWORD([])
    keywordShow.value = ''
    search()
}
function reloadDiaryList() {
    formSearch.value.pageNo = 1
    formSearch.value.keywords = JSON.stringify(filterStore.keywords)
    diaries.value = []
    diariesShow.value = []
    loadMore()
}

/* DIARY 相关 */
function loadMore() {
    if (isLoading.value) return
    isHasMore.value = false
    isLoading.value = true
    formSearch.value.categories = JSON.stringify(filterStore.filteredCategories)
    formSearch.value.dateFilterString = filterStore.dateFilterString
    formSearch.value.dateFilterArray = filterStore.dateFilterArray
    formSearch.value.filterShared = filterStore.isFilterShared ? 1 : 0
    getDiaries()
}
function getDiaries() {
    diaryApi
        .list(formSearch.value)
        .then(res => {
            let newDiariesList = res.items.map(diary => {
                if (diary.content) {
                    diary.contentHtml = diary.content.replace(/\n/g, '<br/>')
                    if (diary.is_markdown) {
                        diary.contentMarkDownHtml = parseMarkdown(diary.content || '')
                    }

                }
                diary.categoryString = categoryStore.categoryNameMap.get(diary.category)
                diary.weekday = dateProcess(diary.date).weekday
                diary.weekdayShort = EnumWeekDayShort[new Date(diary.date).getDay()]
                diary.dateString = dateProcess(diary.date).date
                return diary
            })

            // page operation
            if (res.page < res.totalPages) {
                isHasMore.value = true
                formSearch.value.pageNo++
            } else {
                isHasMore.value = false
            }

            // diary operation
            diaries.value = diaries.value.concat(newDiariesList)
            refreshDiariesShow()
            
            // 加载完成后，检查是否依然处于底部（处理加载期间用户划到底部的情况）
            nextTick(() => {
                checkScroll()
            })
        })
        .finally(() => {
            // 列表加载完成后设置列表重载： false
            diaryStore.isListNeedBeReload = false
            isLoading.value = false
        })
}

function checkScroll() {
    if (!isHasMore.value || isLoading.value) return

    const listEl = document.querySelector('.diary-list-container') as HTMLDivElement
    if (!listEl) return

    const lastNode = document.querySelector('.diary-list-group > :last-child') as HTMLDivElement
    if (!lastNode) return

    const lastOffsetTop = lastNode.offsetTop
    const clientHeight = listEl.clientHeight
    const scrollTop = listEl.scrollTop

    // console.log('checkScroll', lastOffsetTop, clientHeight, scrollTop)
    if (lastOffsetTop < clientHeight + scrollTop + 400) { // 提前 400px 加载，增加容错
        loadMore()
    }
}

function addScrollEvent() {
    const listEl = document.querySelector('.diary-list-container')
    if (!listEl) return

    const handleScroll = throttle(() => {
        checkScroll()
    }, 150)

    listEl.addEventListener('scroll', handleScroll)
    // 强制增加一个 scrollend 监听（或者类似的延时监听）以处理划太快导致的最后一次事件丢失
    listEl.addEventListener('scroll', () => {
        clearTimeout((addScrollEvent as any).timer)
        ;(addScrollEvent as any).timer = setTimeout(checkScroll, 200)
    })
}



watch(route, (newValue) => {
    if (newValue.path === '/') {
        reloadDiaryList()
    }
})

watch(isListNeedBeReload, newValue => {
    if (newValue) {
        diaryStore.listCache = null
        reloadDiaryList()
    }
})

watch(listOperation, ({type, diary, id}: DiaryListOperation) => {
    switch (type) {
        case 'add':
            const diaryToAdd = {
                ...(diary! as any),
                categoryString: categoryStore.categoryNameMap.get(diary!.category),
                weekday: dateProcess(diary!.date as string).weekday,
                weekdayShort: EnumWeekDayShort[new Date(diary!.date as string).getDay()],
                dateString: dateProcess(diary!.date as string).date,
            }
            let posInsert = 0
            for (let i = 0; i < diaries.value.length; i++) {
                let currentDiary = diaries.value[i]
                if (diaryToAdd.date > currentDiary.date) {
                    posInsert = i
                    break
                }
            }
            diaries.value.splice(posInsert, 0, diaryToAdd)
            refreshDiariesShow()
            break
        case 'delete':
            diaries.value.map((item, index) => {
                if (item.id === id) {
                    diaries.value.splice(index, 1)
                    if (diaries.value[index]) {
                        router.push({
                            name: 'Detail',
                            params: {
                                id: diaries.value[index].id
                            }
                        })
                    } else {
                        router.push({
                            name: 'Index'
                        })
                    }
                }
            })
            refreshDiariesShow()
            break
        case 'change':
            diaries.value.map((item, index) => {
                if (item.id === diary!.id) {
                    const updated = {
                        ...(diary! as any),
                        categoryString: categoryStore.categoryNameMap.get((diary! as any).category),
                        weekday: dateProcess((diary! as any).date as string).weekday,
                        weekdayShort: EnumWeekDayShort[new Date((diary! as any).date as string).getDay()],
                        dateString: dateProcess((diary! as any).date as string).date,
                    }
                    diaries.value.splice(index, 1, updated)
                }
            })
            refreshDiariesShow()
            break
    }
})
</script>

<style lang="scss" scoped>
@import "./list";
</style>
