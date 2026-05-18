<template>
    <RouterView v-if="categoryStore.categoryAll.length > 0"/>
    <ServerError v-if="isServerError"/>

    <!-- Mermaid Zoom Modal -->
    <div v-if="zoomSvg" class="mermaid-zoom-modal" @click="closeZoom">
        <button class="floating-close-btn" @click.stop="closeZoom">✕</button>
        <div class="modal-content" @click.stop>
            <div class="modal-body" ref="modalBodyRef">
                <div class="panzoom-wrapper" :style="{ opacity: isZoomReady ? 1 : 0, transition: 'opacity 0.2s' }" v-html="zoomSvg"></div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { useUIStore, useCategoryStore, useFilterStore, useDiaryStore } from "./stores";
const uiStore = useUIStore()
const categoryStore = useCategoryStore()
const filterStore = useFilterStore()
const diaryStore = useDiaryStore()

import {onBeforeMount, onMounted, ref, watch, nextTick} from "vue";
import {useRoute, useRouter} from "vue-router";
import { updateMermaidTheme } from "./markdown.ts";


const route = useRoute()
const router = useRouter()

import diaryApi from "./api/diaryApi.ts"


// Server Error
import ServerError from "./foundation/ServerError.vue";
import {setCategoryAll} from "./utility.ts";
const isServerError = ref(false)

const zoomSvg = ref<string | null>(null)
const modalBodyRef = ref<HTMLElement | null>(null)
const panzoomInstance = ref<any>(null)
const isZoomReady = ref(false)
let panzoomFactory: any

function closeZoom() {
    isZoomReady.value = false
    if (panzoomInstance.value) {
        panzoomInstance.value.dispose()
        panzoomInstance.value = null
    }
    zoomSvg.value = null
}

onBeforeMount(() => {
    // 日记项目载入后，隐藏 preloading
    (document.querySelector('.preloading') as HTMLDivElement).style.display = 'none'

    // 获取当前颜色模式
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        uiStore.colorMode = 'dark'
    } else {
        uiStore.colorMode = 'light'
    }

    // 颜色模式监听
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        uiStore.colorMode = event.matches ? "dark" : "light"
    })
})

onMounted(()=> {
    // 获取所有类别数据
    getCategoryAll()

    diaryStore.CLEAR_CACHE()         // 每次刷新页面，清空缓存日记内容

    // 从本地配置文件中载入配置
    filterStore.INIT_FILTER_CONFIG()

    window.addEventListener('resize', () => {
        uiStore.UPDATE_INSETS()
        
        if (uiStore.isInMobileMode){

        } else {
            if (route.name === 'List'){
                router.push({
                    name: 'EditNew'
                })
            }
        }
    })

    // Listen for mermaid zoom requests
    window.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const mermaidDiv = target.closest('.mermaid')
        if (mermaidDiv) {
            zoomSvg.value = mermaidDiv.innerHTML
        }
    })
})

watch(zoomSvg, async (newVal) => {
    if (newVal) {
        isZoomReady.value = false
        await nextTick()
        if (modalBodyRef.value) {
            const wrapper = modalBodyRef.value.querySelector('.panzoom-wrapper') as HTMLElement
            const svgElement = wrapper?.querySelector('svg')
            if (svgElement) {
                if (!panzoomFactory) {
                    const module = await import('panzoom')
                    panzoomFactory = module.default
                }
                // Initialize panzoom
                panzoomInstance.value = panzoomFactory(svgElement, {
                    maxZoom: 10,
                    minZoom: 0.05,
                    initialZoom: 1,
                    bounds: false,
                    zoomDoubleClickSpeed: 1,
                })

                // Auto-fit logic with robust centering based on DOM element rect
                setTimeout(() => {
                    if (panzoomInstance.value && modalBodyRef.value && svgElement) {
                        const containerRect = modalBodyRef.value.getBoundingClientRect()
                        
                        // Get layout dimensions of the SVG itself before any scaling
                        const svgRect = svgElement.getBoundingClientRect()
                        const svgWidth = svgRect.width
                        const svgHeight = svgRect.height
                        
                        // Calculate scale to fit
                        const scaleX = (containerRect.width - 60) / svgWidth
                        const scaleY = (containerRect.height - 60) / svgHeight
                        let fitScale = Math.min(scaleX, scaleY)
                        
                        // Limit upscaling
                        if (fitScale > 1.2) fitScale = 1.2 
                        
                        // Apply scale
                        panzoomInstance.value.zoomAbs(0, 0, fitScale)
                        
                        // Center based on actual scaled DOM dimensions
                        const finalWidth = svgWidth * fitScale
                        const finalHeight = svgHeight * fitScale
                        
                        const dx = (containerRect.width - finalWidth) / 2
                        const dy = (containerRect.height - finalHeight) / 2
                        
                        panzoomInstance.value.moveTo(dx, dy)
                        
                        // Make visible
                        isZoomReady.value = true
                    }
                }, 50)
            }
        }
    }
})

watch(() => uiStore.colorMode, (newValue) => {
    updateMermaidTheme(newValue === 'dark')
})

function getCategoryAll() {
    diaryApi
        .getCategoryAll()
        .then(res => {
            categoryStore.categoryAll = res.data
            setCategoryAll(res.data)
            console.log('app is loaded all categories')
        })
        .catch(() => {
            isServerError.value = true
            console.log('服务器错误，请联系管理员')
        })
}
</script>

<style lang="scss">
@import "scss/diary";

.mermaid-zoom-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: white; // Cover entire screen
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;

    .floating-close-btn {
        position: absolute;
        top: 24px;
        right: 24px;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.05);
        border: none;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        color: #64748b;
        backdrop-filter: blur(4px);
        @include transition(all 0.2s);
        &:hover { 
            background: rgba(0, 0, 0, 0.1);
            color: #0f172a; 
            transform: scale(1.05);
        }
    }

    .modal-content {
        background: white;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .modal-body {
        padding: 0;
        overflow: hidden;
        flex: 1;
        background-color: transparent;
        cursor: grab;
        position: relative;
        &:active { cursor: grabbing; }

        .panzoom-wrapper {
            width: 100%;
            height: 100%;
            display: block;
        }

        svg {
            max-width: none !important;
            height: auto !important;
            width: auto !important;
            transform-origin: 0 0;
        }
    }
}

@media (prefers-color-scheme: dark) {
    .mermaid-zoom-modal {
        background: #0f172a;
        
        .floating-close-btn {
            background: rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            &:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
            }
        }
        
        .modal-content {
            background: #0f172a;
        }
    }
}
</style>
