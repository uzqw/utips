<template>
    <div class="navbar-container">
        <!-- NAVBAR -->
        <nav class="navbar" id="navbar">
            <div class="nav-part-left">
                <div @click="menuShow"
                     v-if="
                         (!uiStore.isInMobileMode && !uiStore.isMenuShowed)
                         || uiStore.isInMobileMode && route.name === 'List' && !uiStore.isMenuShowed
                    ">
                    <TabIcon v-if="uiStore.isInMobileMode" alt="菜单"/>
                    <TabIcon v-else alt="LOGO"/>
                </div>
                <div @click="menuClose" v-if="uiStore.isMenuShowed">
                    <TabIcon alt="关闭"/>
                </div>
                <div @click="commitBack" v-if="uiStore.isInMobileMode && route.name !== 'List'">
                    <TabIcon alt="返回"/>
                </div>

                <div v-show="!uiStore.isMenuShowed" v-if="!uiStore.isInMobileMode"
                     @click="toggleSearchbar">
                    <TabIcon alt="搜索"/>
                </div>

                <div v-show="!uiStore.isMenuShowed" v-if="!uiStore.isInMobileMode"
                     @click="toggleHideContent">
                    <TabIcon v-if="diaryStore.isHideContent" alt="内容隐藏"/>
                    <TabIcon v-else alt="内容显示"/>
                </div>

                <div v-show="!uiStore.isMenuShowed" v-if="!uiStore.isInMobileMode"
                     @click="goToPage('Bill')">
                    <TabIcon alt="账单"/>
                </div>

                <div v-show="!uiStore.isMenuShowed" v-if="!uiStore.isInMobileMode && isAdminUser"
                     @click="goToPage('FileManager')">
                    <TabIcon alt="文件"/>
                </div>
                <div v-show="!uiStore.isMenuShowed" v-if="!uiStore.isInMobileMode"
                     @click="toggleTodoList">
                    <TabIcon
                        alt="待办-显示"
                        v-if="filterStore.filteredCategories.length === 1 && filterStore.filteredCategories[0] === 'todo'"/>
                    <TabIcon alt="待办" v-else/>
                </div>
                <div v-if="!uiStore.isInMobileMode && filterStore.dateFilterString"
                     v-show="!uiStore.isMenuShowed"
                     class="btn-text-group">
                    <div class="btn-text" @click="clearDateFilter">{{ filterStore.dateFilterString }}</div>
                </div>

                <NavbarCategorySelector
                    v-if="!uiStore.isInMobileMode && !uiStore.isMenuShowed"
                    class="ml-5"/>

            </div>

            <div class="nav-part-right">
                <!--时钟-->
                <Clock class="pr-6" v-if="!uiStore.isInMobileMode && uiStore.insets.windowsWidth > 1352"/>

                <!--分享-->
                <div
                    v-if="route.name === 'Detail' && diaryStore.currentDiary && diaryStore.currentDiary.is_public"
                    class="clipboard-trigger"
                    :data-clipboard="shareUrl">
                    <TabIcon alt="分享"/>
                </div>

                <!--删除-->
                <div @click="toastShow" v-if="route.name === 'Detail' || ((route.name === 'Edit' || route.name === 'EditNew') && !isNewDiary)">
                    <TabIcon alt="删除"/>
                </div>

                <!--编辑 / 确定保存-->
                <div @click="editDiary" v-if="route.name === 'Detail'">
                    <TabIcon alt="编辑"/>
                </div>
                <div class="nav-btn-wrapper" v-else-if="route.name === 'Edit' || route.name === 'EditNew'">
                    <div @click="diaryRecover" v-if="diaryStore.isDiaryEditorContentHasChanged">
                        <TabIcon alt="恢复"/>
                    </div>
                    <div v-if="diaryStore.isSavingDiary">
                        <Loading :height="50" :loading="true"/>
                    </div>
                    <div @click="diarySave" v-else>
                        <TabIcon v-if="isNewDiary" alt="确定"/>
                        <TabIcon v-else-if="diaryStore.isDiaryEditorContentHasChanged" alt="确定-已变化"/>
                        <TabIcon v-else alt="确定-已保存"/>
                    </div>
                </div>

                <!--消息（铃铛）-->
                <div class="notification-wrapper" @click.stop>
                    <div class="notification-trigger" :title="t('nav.messages')" @click="toggleNotifications">
                        <TabIcon alt="消息"/>
                        <span v-if="unreadCount > 0" class="notification-dot"></span>
                    </div>
                    <div v-if="isNotificationPanelShowed" class="notification-panel">
                        <div class="notification-panel-header">
                            <div>
                                <div class="notification-title">{{ t('nav.messages') }}</div>
                                <div class="notification-subtitle">{{ t('nav.unread', { count: unreadCount }) }}</div>
                            </div>
                            <button type="button" @click="markAllNotificationsRead" :disabled="unreadCount === 0">{{ t('nav.markAllRead') }}</button>
                        </div>
                        <div v-if="isNotificationLoading" class="notification-empty">{{ t('nav.loading') }}</div>
                        <div v-else-if="notifications.length === 0" class="notification-empty">{{ t('nav.noMessages') }}</div>
                        <div v-else class="notification-list">
                            <button
                                v-for="item in notifications"
                                :key="item.id"
                                type="button"
                                :class="['notification-item', item.level, {unread: !item.isRead}]"
                                @click="markNotificationRead(item)">
                                <div class="notification-item-title">{{ translateNotificationTitle(item) }}</div>
                                <div v-if="item.message" class="notification-item-message">{{ translateNotificationMessage(item) }}</div>
                                <div v-if="item.error" class="notification-item-error">{{ item.error }}</div>
                                <div class="notification-item-meta">
                                    <span>{{ item.operation }}</span>
                                    <span>{{ formatNotificationTime(item.created) }}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <!--新建-->
                <div @click="addNewDiary">
                    <TabIcon alt="添加"/>
                </div>
            </div>


            <!--LOGO-->
            <div class="brand" v-if="uiStore.isInMobileMode" @click="handleMobileBrandClick">
                <img :src="diaryStore.editLogoImg"
                     v-if="route.name === 'Edit' || route.name === 'EditNew'"
                     alt="LOGO">
                <a v-else-if="diaryStore.listStyle === EnumListStyle.list">
                    <img :src="LogoIcons.logo" alt="日记">
                </a>
                <a v-else>
                    <img :src="LogoIcons.logo_content" alt="日记">
                </a>
            </div>


            <!-- MENU -->
            <NavMenu/>

        </nav>

        <!--TOAST-->
        <div id="toast" class="fadeIn animated-fast" v-show="isToastShowed">
            <div class="toast">
                <div class="toast-header">{{ t('nav.confirmDelete') }}</div>
                <div class="toast-body"></div>
                <div class="toast-footer">
                    <div class="btn-cancel" @click="toastHide">{{ t('common.cancel') }}</div>
                    <div class="btn-confirm" @click="diaryDelete">{{ t('common.ok') }}</div>
                </div>
            </div>
            <div class="mask"></div>
        </div>
    </div>

</template>

<script lang="ts" setup>
// COMPONENTS
import TabIcon from "../../components/TabIcon.vue"
import Loading from "../../components/Loading.vue";
import diaryApi from "../../api/diaryApi.ts";
import notificationApi, {NotificationRecord} from "@/api/notificationApi.ts";
import NavMenu from "@/view/Menu/NavMenu.vue";
import LogoIcons from "@/assets/icons/LogoIcons";
import Clock from "./Clock.vue";
import NavbarCategorySelector from "../../framework/navbar/NavbarCategorySelector.vue";

import ClipboardJS from "clipboard"

import {getAuthorization, popMessage} from "../../utility.ts";
import { useUIStore } from "@/stores/ui";
import { useDiaryStore } from "@/stores/diary";
import { useFilterStore } from "@/stores/filter";
const uiStore = useUIStore()
const diaryStore = useDiaryStore()
const filterStore = useFilterStore()

import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {EnumListStyle} from "@/listStyle.ts";
import {useI18n} from "vue-i18n";

const route = useRoute()
const router = useRouter()
const {t, te} = useI18n()
let notificationTimer: number | undefined


const isAdminUser = computed(()=>{
    return getAuthorization()?.group_id === 1
})

// Keyboard: Ctrl+D to open delete confirm on Detail page
const keydownHandler = (event: KeyboardEvent) => {
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
    if (event.ctrlKey || event.metaKey) {
        if (key === 'd') {
            if (route.name === 'Detail' && diaryStore.currentDiary) {
                event.preventDefault()
                toastShow()
            }
        } else if (key === 'm') {
            // Use Ctrl/Cmd + M to avoid browser's Ctrl+N
            event.preventDefault()
            addNewDiary()
        }
    }
}


// 新建日记
function addNewDiary() {
    // 新建日记时，如果存在缓存日记内容，清除它
    diaryStore.CLEAR_CACHE()
    router.push('/edit')
}
// 编辑日记
function editDiary() {
    // 新建日记时，如果存在缓存日记内容，清除它
    diaryStore.CLEAR_CACHE()
    router.push(`/edit/${diaryStore.currentDiary.id}`)
}

/**
 * Clipboard
 */
const clipboard= ref<ClipboardJS>()
let location = window.location

onUnmounted(()=>{
    if (clipboard.value) {
        clipboard.value.destroy()
    }
    window.removeEventListener('keydown', keydownHandler)
    window.removeEventListener('click', closeNotifications)
    if (notificationTimer) {
        window.clearInterval(notificationTimer)
    }
})


onMounted(()=> {
    location = window.location

    isNewDiary.value = !(route.params.id)

    // 绑定剪贴板操作方法
    clipboard.value = new ClipboardJS('.clipboard-trigger', {
        text: trigger => {
            return trigger.getAttribute('data-clipboard') || ''
        },
    })
    clipboard.value.on('success', ()=>{  // 还可以添加监听事件，如：复制成功后提示
        popMessage('success', '分享链接 已复制到 剪贴板', ()=>{}, 2)
    })
    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('click', closeNotifications)
    refreshUnreadCount()
    notificationTimer = window.setInterval(refreshUnreadCount, 30000)
})

/**
 * TOAST Show | Hide
 */
const isToastShowed = ref(false)
function toastHide() {
    isToastShowed .value= false
}
function toastShow() {
    isToastShowed.value = true
}


/**
 * 新日记
 */
const isNewDiary = ref(true) // 是否为新日记
watch(route, newValue => {
    isNewDiary.value = !(newValue.params.id)
})

const shareUrl = computed(() => {
    return `${location.origin}/#/share/${diaryStore.currentDiary.id}`
})

function commitBack(){
    switch (route.name){
        case 'Edit':
        case 'Detail':
            router.push({name: 'List'});
            break
        default:
            router.push({name: 'List'})
    }
}
function clearDateFilter(){
    filterStore.SET_DATE_FILTER_STRING('')
    diaryStore.isListNeedBeReload = true
}

function calendarTaped(){
    if (route.name === 'Calendar'){
        goToPage('List')
    } else {
        goToPage('Calendar')
    }
}

// 跳转到独立页面
function goToPage(pageName: string){
    router.push({name: pageName})
}

// 菜单操作
function menuShow() {
    uiStore.isMenuShowed = true
}
function menuClose() {
    uiStore.isMenuShowed = false
}
function toggleMobileTodoList(){
    const isTodoOnly = filterStore.filteredCategories.length === 1 && filterStore.filteredCategories[0] === 'todo'
    filterStore.isFilterShared = false
    filterStore.SET_FILTERED_CATEGORIES(isTodoOnly ? [] : ['todo'])
    diaryStore.SET_LIST_STYLE(EnumListStyle.list)
    diaryStore.isListNeedBeReload = true
    uiStore.isMenuShowed = false
    router.push({name: 'List'})
}

function handleMobileBrandClick() {
    toggleMobileTodoList()
}


// SEARCH BAR
function toggleSearchbar() {
    uiStore.isShowSearchBar = !uiStore.isShowSearchBar
}

function toggleTodoList(){
    let nextCategories: string[] = []
    if (filterStore.filteredCategories.length === 1 && filterStore.filteredCategories[0] === 'todo'){
        nextCategories = []
    } else {
        nextCategories = ['todo']
    }
    filterStore.isFilterShared = false
    filterStore.SET_FILTERED_CATEGORIES(nextCategories)
    diaryStore.isListNeedBeReload = true
}

// HIDE CONTENT
function toggleHideContent() {
    diaryStore.isHideContent = !diaryStore.isHideContent
}
function diarySave() {
    diaryStore.isDiaryNeedToBeSaved = true
}
function diaryRecover() {
    diaryStore.isDiaryNeedToBeRecovered = true
}

const unreadCount = ref(0)
const notifications = ref<NotificationRecord[]>([])
const isNotificationPanelShowed = ref(false)
const isNotificationLoading = ref(false)

function refreshUnreadCount() {
    notificationApi
        .unreadCount()
        .then(count => {
            unreadCount.value = count
        })
        .catch(() => {})
}

function loadNotifications() {
    isNotificationLoading.value = true
    notificationApi
        .latest()
        .then(items => {
            notifications.value = items
        })
        .finally(() => {
            isNotificationLoading.value = false
        })
}

function toggleNotifications() {
    isNotificationPanelShowed.value = !isNotificationPanelShowed.value
    if (isNotificationPanelShowed.value) {
        loadNotifications()
        refreshUnreadCount()
    }
}

function closeNotifications() {
    isNotificationPanelShowed.value = false
}

function markNotificationRead(item: NotificationRecord) {
    if (item.isRead) return
    notificationApi
        .markRead(item.id)
        .then(() => {
            item.isRead = true
            refreshUnreadCount()
        })
}

function markAllNotificationsRead() {
    notificationApi
        .markAllRead()
        .then(() => {
            notifications.value = notifications.value.map(item => ({...item, isRead: true}))
            unreadCount.value = 0
        })
}

function formatNotificationTime(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
}


function translateNotificationTitle(item: NotificationRecord) {
    if (te(item.title)) {
        try {
            const payload = item.payload ? JSON.parse(item.payload) : {}
            return t(item.title, payload)
        } catch (e) {
            return t(item.title)
        }
    }
    return item.title
}

function translateNotificationMessage(item: NotificationRecord) {
    if (item.message && te(item.message)) {
        try {
            const payload = item.payload ? JSON.parse(item.payload) : {}
            return t(item.message, payload)
        } catch (e) {
            return t(item.message)
        }
    }
    return item.message
}

/* DELETE */
function diaryDelete() {
    let requestData = {
        diaryId: diaryStore.currentDiary.id,
    }
    diaryApi
        .delete(requestData)
        .then(res => {
            toastHide()
            popMessage('success', res.message, () => {
                diaryStore.listCache = null  // 删除后使列表缓存失效
                if (uiStore.isInMobileMode){
                    router.back()
                } else {
                    diaryStore.listOperation = {type: 'delete', diary: undefined, id: diaryStore.currentDiary.id}
                }
            }, 0.5)
        })
}

</script>

<style lang="scss" scoped>
@import "navbar";

.navbar {
    overflow: visible;
}

.notification-wrapper {
    position: relative;
    height: $height-navbar;
}

.notification-trigger {
    position: relative;
    cursor: pointer;
}

.notification-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background-color: $red;
    border: 1px solid $bg-main;
    @include border-radius(50px);
}

.notification-panel {
    position: absolute;
    top: $height-navbar + 4;
    right: 0;
    width: 340px;
    max-height: 420px;
    overflow: hidden;
    background-color: $bg-bill-brief;
    border: 1px solid $color-border-light;
    box-shadow: 0 10px 30px transparentize(black, 0.88);
    z-index: $z-navbar + 1;
    @include border-radius(6px);
}

.notification-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid $color-border-light;
    button {
        border: 0;
        padding: 5px 8px;
        color: $green;
        background-color: transparent;
        cursor: pointer;
        &:disabled {
            color: $text-label;
            cursor: default;
        }
    }
}

.notification-title {
    font-size: $fz-main;
    font-weight: bold;
    color: $text-title;
}

.notification-subtitle {
    margin-top: 2px;
    font-size: $fz-small;
    color: $text-label;
}

.notification-list {
    max-height: 360px;
    overflow-y: auto;
}

.notification-item {
    width: 100%;
    border: 0;
    border-bottom: 1px solid $color-border-light;
    padding: 10px 12px;
    text-align: left;
    background-color: $bg-bill-brief;
    cursor: pointer;
    &.unread {
        background-color: transparentize($red, 0.94);
    }
    &.info.unread {
        background-color: transparentize($green, 0.9);
    }
}

.notification-item-title {
    font-size: $fz-main;
    color: $text-title;
    font-weight: bold;
}

.notification-item-message {
    margin-top: 4px;
    color: $text-content;
    font-size: $fz-small;
    line-height: 1.4;
    word-break: break-word;
}

.notification-item-error {
    margin-top: 4px;
    color: darken($red, 12%);
    font-size: $fz-small;
    line-height: 1.4;
    word-break: break-word;
    white-space: pre-wrap;
}

.notification-item-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 6px;
    color: $text-label;
    font-size: $fz-small;
}

.notification-empty {
    padding: 24px 12px;
    text-align: center;
    color: $text-label;
    font-size: $fz-small;
}

@media (max-width: $grid-separate-width-sm) {
    .notification-panel {
        position: fixed;
        top: $height-navbar + 4;
        right: 8px;
        left: 8px;
        width: auto;
    }
}

@media (prefers-color-scheme: dark) {
    .notification-dot {
        border-color: $dark-bg-nav;
    }
    .notification-panel {
        background-color: $dark-bg;
        border-color: $dark-border;
        box-shadow: 0 10px 30px transparentize(black, 0.5);
    }
    .notification-panel-header,
    .notification-item {
        border-color: $dark-border;
    }
    .notification-title,
    .notification-item-title {
        color: $dark-text-title;
    }
    .notification-subtitle,
    .notification-item-meta,
    .notification-empty {
        color: $dark-text-subtitle;
    }
    .notification-item {
        background-color: $dark-bg;
        &.unread {
            background-color: transparentize($red, 0.88);
        }
    }
    .notification-item-message {
        color: $dark-text-title;
    }
    .notification-item-error {
        color: lighten($red, 16%);
    }
}
</style>
