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
            <div ref="refDiaryList" class="diary-list-container" 
                 :style="{
                     height: `${uiStore.insets.heightPanel}px`,
                     width: isCollapsed ? '0px' : `${sidebarWidth}px`,
                     borderRight: isCollapsed ? 'none' : undefined,
                     overflowX: 'hidden',
                     flexShrink: 0,
                     transition: isDragging ? 'none' : 'width 0.3s ease, border-color 0.3s ease'
                 }">
                <List/>
            </div>

            <!-- Draggable Resizer Bar -->
            <div class="sidebar-resizer" 
                 :class="{ 'dragging': isDragging, 'collapsed': isCollapsed }" 
                 :style="{ height: `${uiStore.insets.heightPanel}px` }"
                 @mousedown="startDrag">
                <div class="resizer-toggle-tab"
                     :style="{ 
                         left: isCollapsed ? '0px' : '-6px',
                         borderRadius: isCollapsed ? '0 4px 4px 0' : '4px',
                         borderLeft: isCollapsed ? 'none' : undefined
                     }"
                     @click.stop="toggleSidebar"
                     :title="isCollapsed ? '展开列表' : '收起列表'">
                    <span class="arrow">{{ isCollapsed ? '›' : '‹' }}</span>
                </div>
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

// Sidebar drag/collapse state
const sidebarWidth = ref(350)
const isCollapsed = ref(false)
const isDragging = ref(false)

onMounted(() => {
    getStatistic() // 载入统计信息

    // Load layout state from localStorage
    const savedWidth = localStorage.getItem('sidebar_width')
    if (savedWidth) {
        const widthVal = parseInt(savedWidth, 10)
        if (!isNaN(widthVal)) {
            sidebarWidth.value = widthVal
        }
    }
    const savedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsed !== null) {
        isCollapsed.value = savedCollapsed === 'true'
    }
})

const { isShowSearchBar } = storeToRefs(uiStore)
watch(isShowSearchBar, newValue => {
    if (newValue){
        if (refDiaryList.value) {
            refDiaryList.value.scrollTo(0, 0)
        }
    } else {

    }
})

function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
}

function startDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.resizer-toggle-tab')) {
        return
    }

    isDragging.value = true
    const startX = e.clientX
    const startWidth = isCollapsed.value ? 0 : sidebarWidth.value

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.value) return
        const deltaX = moveEvent.clientX - startX
        let newWidth = startWidth + deltaX

        const minWidth = 200
        const maxWidth = Math.min(800, window.innerWidth * 0.6)
        const collapseThreshold = 100

        if (newWidth < collapseThreshold) {
            isCollapsed.value = true
        } else {
            isCollapsed.value = false
            if (newWidth < minWidth) {
                newWidth = minWidth
            } else if (newWidth > maxWidth) {
                newWidth = maxWidth
            }
            sidebarWidth.value = newWidth
            localStorage.setItem('sidebar_width', String(newWidth))
        }
        localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
    }

    const handleMouseUp = () => {
        isDragging.value = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
}

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
@import "@/scss/variables";

.diary-list-container-mobile{
    width: 100%;
}

.sidebar-resizer {
    width: 1px;
    cursor: col-resize;
    position: relative;
    background-color: $color-border;
    z-index: 100;
    transition: background-color 0.2s, opacity 0.2s;
    user-select: none;
    flex-shrink: 0;

    &.collapsed {
        background-color: transparent !important;
    }

    &::before {
        content: '';
        position: absolute;
        left: -4px;
        top: 0;
        width: 9px;
        height: 100%;
        background-color: transparent;
        z-index: 100;
        cursor: col-resize;
    }

    &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        width: 1px;
        height: 100%;
        background-color: transparent;
        transition: background-color 0.2s;
        z-index: 101;
    }

    &:hover::after, &.dragging::after {
        background-color: $color-main;
    }

    &:hover {
        .resizer-toggle-tab {
            opacity: 0.8;
        }
    }

    .resizer-toggle-tab {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 12px;
        height: 36px;
        background: #f4f4f4;
        border: 1px solid rgba(0, 0, 0, 0.08);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        z-index: 102;
        opacity: 0.2;
        transition: opacity 0.2s, background-color 0.2s, border-color 0.2s, left 0.2s;

        &:hover {
            background: #fff;
            border-color: rgba(0, 0, 0, 0.15);
            opacity: 1 !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .arrow {
            font-size: 10px;
            color: #888;
            transition: color 0.2s;
            line-height: 1;
        }
    }
}

@media (prefers-color-scheme: dark) {
    .sidebar-resizer {
        background-color: $dark-border;

        .resizer-toggle-tab {
            background: $dark-bg;
            border-color: rgba(255, 255, 255, 0.12);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

            &:hover {
                background: lighten($dark-bg, 4%);
                border-color: rgba(255, 255, 255, 0.22);
            }

            .arrow {
                color: #aaa;
            }
        }
    }
}
</style>
