<template>
    <div class="diary-edit-container" :style="`min-height: ${uiStore.insets.heightPanel}px`">
        <div class="diary-edit-content">
            <!-- TITLE -->
            <div class="editor-title">
                <label  class="hidden"></label>
                <textarea ref="refDiaryTitle"
                          id="diary-title"
                          name="diary-title"
                          class="title"
                          :placeholder="$tt('一句话概括你的一天')"
                          v-model="diary.title"/>
            </div>
            <!-- CONTENT -->
            <div class="editor-content">
                <PossibleBillKeySelector
                    :possible-bill-items="possibleBillItems"
                    :position-left="keysPanelPositionLeft"
                    :position-top="keysPanelPositionTop"
                    @selectKey="insertNewBillKey"
                />
                <label class="hidden"></label>
                <textarea
                    ref="refDiaryContentTextArea"
                    id="diary-content"
                    name="diary-content"
                    v-model="diary.content"
                    :style="uiStore.insets.windowsWidth > 1366 ? `height: ${uiStore.insets.heightPanel - 150 - 40 - 20}px`: ''"
                    :placeholder="$tt('日记详细内容，如果你有很多要写的')"
                    @input="contentUpdate($event)"
                    class="content"></textarea>
                <div class="editor-float-btn" v-if="diary.is_markdown">
                    <ButtonSmall @click="toggleSpaceShow">{{ $tt('切换空格显示') }}</ButtonSmall>
                </div>
            </div>
        </div>
        <div class="diary-edit-meta">
            <!--  主参数区 -->
            <div class="editor-form">
                <EditorVCalendarSelector @dayChange="dayHasChanged" v-model="diary.date"/>
                <div class="editor-meta-switches">
                    <div class="editor-form-item">
                        <label for="temperature-inside">{{ $tt('身处') }}</label>
                        <TemperatureSetItem
                            input-id="temperature-inside"
                            unit="℃"
                            v-model="diary.temperature"/>
                    </div>
                    <div class="editor-form-item">
                        <label for="temperature-outside">{{ $tt('室外') }}</label>
                        <TemperatureSetItem
                            input-id="temperature-outside"
                            unit="℃"
                            v-model="diary.temperature_outside"/>
                    </div>

                    <div class="editor-form-item">
                        <label for="shareState">{{ $tt('共享') }}</label>
                        <div class="input">
                            <input class="share"
                                   type="checkbox"
                                   name="share"
                                   id="shareState"
                                   v-model="diary.is_public"
                            >
                            <label class="switch" for="shareState"></label>
                        </div>
                    </div>
                    <div class="editor-form-item">
                        <label for="markdown">MarkDown</label>
                        <div class="input">
                            <input class="share"
                                   type="checkbox"
                                   name="share"
                                   id="markdown"
                                   v-model="diary.is_markdown"
                            >
                            <label class="switch" for="markdown"></label>
                        </div>
                    </div>
                </div>

            </div>
            <!--  天气重载按钮  -->
            <LoadingButton
                :is-loading="isWeatherLoading"
                type="light"
                style="margin-top: 12px; margin-bottom: 12px;"
                @click="reloadWeather">{{ $tt('重载今日天气') }}</LoadingButton>

            <!--  周报载入按钮  -->
            <LoadingButton
                :is-loading="isLoading"
                type="light"
                v-if="diary.category === 'week'"
                @click="loadCurrentWeekLogs">{{ $tt('载入本周工作日志') }}</LoadingButton>

            <WeatherSelector :weather="diary.weather" @change="setWeather"/>

            <!-- 类别选择 -->
            <EditCategorySelector :category="diary.category" @change="setCategory"/>
        </div>
    </div>

    <!-- 离开确认对话框 -->
    <div v-show="isLeaveConfirmShowed" class="leave-confirm-mask" @click="cancelLeave"></div>
    <div v-show="isLeaveConfirmShowed" class="toast">
        <div class="toast-header">{{ $tt('日记未保存') }}</div>
        <div class="toast-body">{{ $tt('确定要离开吗？内容将丢失') }}</div>
        <div class="toast-footer">
            <div class="btn-cancel" @click="cancelLeave">{{ $tt('取消') }}</div>
            <div class="btn-confirm" @click="confirmLeave">{{ $tt('确定') }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import axios from "axios"
import Moment from 'moment'

// components
import EditCategorySelector from "./CategorySelector/EditorCategorySelector.vue"
import WeatherSelector from "./WeatherSelector/WeatherSelector.vue"
import LoadingButton from "../../components/LoadingButton.vue"
import ButtonSmall from "../../components/ButtonSmall.vue";
import TemperatureSetItem from "./TemperatureSetItem.vue";
import PossibleBillKeySelector from "./PossibleBillKeySelector.vue";

import {popMessage, getBillKeys, getAuthorization, temperatureProcessSTC, temperatureProcessCTS, dateFormatter, dateProcess, EnumWeekDayShort} from "@/utility.ts";
import diaryApi from "../../api/diaryApi.ts"
import userApi from "../../api/userApi.ts"
import projectConfig from "../../projectConfig.ts";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import { useDiaryStore } from "@/stores/diary";
const uiStore = useUIStore();
const categoryStore = useCategoryStore();
const diaryStore = useDiaryStore();

import {computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {onBeforeRouteLeave, useRoute, useRouter} from "vue-router";
import LogoIcons from "@/assets/icons/LogoIcons";

/**
 * ENTITY
 */
import {DiaryEntity, DiaryEntityFromServer, DiarySearchParams, DiarySubmitEntity, EnumWeather, ResponseDiaryAdd} from "@/types/diary.ts";
import {storeToRefs} from "pinia";

const route = useRoute()
const router = useRouter()


const spaceIdentifier = ref('✎') // 为了判断目前是否处于空格显示状态
const isNew = ref(true)
const isLoading = ref(false)
const isWeatherLoading = ref(false)

const diary = ref<DiaryEntity>({
    id: '',
    title: "",
    content: "",
    is_public: false,
    is_markdown: false,
    date: new Date(),
    weather: 'sunny',
    category: 'life',
    temperature: '',
    temperature_outside: '',
})
const diaryOrigin = ref<DiaryEntity>({ // 不需要跟上面一样，但需要有提交声明好的属性，不然后面无法对比其值
    id: '',
    title: "",
    content: "",
    is_public: false,
    is_markdown: false,
    date: new Date(),
    weather: 'sunny',
    category: 'life',
    temperature: '',
    temperature_outside: '',
})
const recoverDiaryContent = ref({  // 编辑过程中点击了隐藏按钮，此时记录没有保存的内容。供一会恢复
    title: '',
    content: ''
})

const requestData = ref<DiarySearchParams>({ // 请求本周日志的 requestData
    keywords: [],
    pageNo: 1,
    pageSize: 15, // 单页请求条数
    categories: JSON.stringify(['work']),
    filterShared: 0, // 1 是筛选，0 是不筛选
    dateFilterString: '' // 日记年月筛选
})

/**
 * Date Picker
 */
import 'v-calendar/style.css';
import EditorVCalendarSelector from "@/view/Edit/EditorVCalendarSelector.vue";
import {BillKey} from "@/view/Bill/Bill.ts";
import {translateText} from "@/i18n/text";


/**
 * Bill Keys
 */
const billKeys = ref<Array<BillKey>>([])
const possibleBillItems = ref<Array<BillKey>>([])
const keysPanelPositionLeft = ref(150)
const keysPanelPositionTop = ref(20)

const refDiaryContentTextArea = ref()

onBeforeMount(() => {
    window.onkeydown = null // 去除 edit 页面的绑定事件

    // 如果存在缓存日记内容，载入它
    if (diaryStore.cacheDiary){
        if (String(route.params.id) === String(diaryStore.cacheDiary.id)){  // 只有是同一个日记时
            diary.value = diaryStore.cacheDiary
            diaryOrigin.value = diaryStore.cacheDiaryOrigin
            diaryStore.CLEAR_CACHE()
        }
    }
})

onMounted(()=>{
    // 获取账单常用项目列表
    billKeys.value = getBillKeys()

    // 网页标签关闭前提醒
    window.onbeforeunload = () => {
        if (diaryHasChanged.value) {
            return "日记内容已改变，显示提示框"
        }
    }

    // 如果已经存在日记内容，不需要重新获取日记、新建日记
    if (diary.value.title || diary.value.content){

    } else {
        isNew.value = !(route.params.id)
        if (isNew.value) {
            // 新建日记
            createDiary()
        } else {
            getDiary(String(route.params.id))
        }
    }

    // key binding
    nextTick( () => {
        // 页面快捷键
        window.onkeydown = event => {
            // CTRL + S 保存
            if ((event.ctrlKey || event.metaKey) && (typeof event.key === 'string' && event.key.toLowerCase() === 's')) {
                event.preventDefault()
                saveDiary()
            } else if (typeof event.key === 'string' && (event.key.toLowerCase() === 'escape' || event.key.toLowerCase() === 'esc')) {
                // ESC 返回预览
                event.preventDefault()
                if (diary.value.id){
                    router.push({name: 'Detail', params: {id: diary.value.id}})
                } else {
                    router.push({name: 'List'})
                }
            } else if ((event.ctrlKey || event.metaKey) && event.altKey && (typeof event.key === 'string' && event.key.toLowerCase() === 'n')) {
                // CTRL/CMD + ALT + N 新建日记（避免浏览器快捷键）
                event.preventDefault()
                diaryStore.CLEAR_CACHE()
                router.push({name: 'EditNew'})
            }
        }
        // 编辑器快捷键
        refDiaryContentTextArea.value.onkeydown = event => {
            if (possibleBillItems.value.length > 0) {
                switch (event.key) {
                    case 'Tab':
                        insertNewBillKey(possibleBillItems.value[0].key)
                        event.preventDefault()
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                    case '8':
                    case '9':
                        insertNewBillKey(possibleBillItems.value[Number(event.key) - 1].key)
                        event.preventDefault()
                        break;
                    default:
                        break;
                }
            } else {
                // CTRL + ArrowLeft 移到最左端
                if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
                    event.preventDefault()
                    let textarea = refDiaryContentTextArea.value as HTMLTextAreaElement // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)
                    let linesBefore = textAreaInfo.textLineArray.slice(0, textAreaInfo.cursorLineIndex)
                    let textBefore = linesBefore.join('\n')
                    let newCursorLocation = 0
                    if (textBefore.length === 0) {

                    } else {
                        newCursorLocation = textBefore.length + 1  // -1行末尾 + 1
                    }
                    nextTick(() => {
                        textarea.setSelectionRange(newCursorLocation, newCursorLocation)
                    })
                }

                // CTRL + ArrowRight 移到最右端
                if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
                    event.preventDefault()
                    let textarea = refDiaryContentTextArea.value as HTMLTextAreaElement // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)
                    let linesBefore = textAreaInfo.textLineArray.slice(0, textAreaInfo.cursorLineIndex + 1)
                    let textBefore = linesBefore.join('\n')
                    let newCursorLocation = textBefore.length
                    nextTick(() => {
                        textarea.setSelectionRange(newCursorLocation, newCursorLocation) // 定位光标
                    })
                }

                // CTRL + D 复选行
                if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                    event.preventDefault()
                    let textarea = refDiaryContentTextArea.value // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)

                    textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 0, textAreaInfo.cursorLineContent)
                    diary.value.content = textAreaInfo.textLineArray.join('\n')
                    nextTick(() => {
                        textarea.setSelectionRange(textAreaInfo.cursorSelectionStart, textAreaInfo.cursorSelectionStart) // 定位光标
                    })
                }

                // CTRL + X 删除行
                if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
                    let textarea = refDiaryContentTextArea.value // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)
                    // 只有未选择任何内容的时候
                    if (textAreaInfo.cursorSelectionStart === textAreaInfo.cursorSelectionEnd) {
                        event.preventDefault()
                        // 只有在 localhost 或 https 的环境下才能使用 navigator.clipboard
                        if (window.isSecureContext){
                            navigator.clipboard.writeText(textAreaInfo.cursorLineContent)
                                .then(() => {
                                    console.log('✓ moved')
                                })
                            textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1)
                            diary.value.content = textAreaInfo.textLineArray.join('\n')
                            nextTick(() => {
                                textarea.setSelectionRange(textAreaInfo.cursorSelectionStart, textAreaInfo.cursorSelectionStart) // 定位光标
                            })
                        } else {
                            // 照样删除
                            textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1)
                            diary.value.content = textAreaInfo.textLineArray.join('\n')
                        }
                    }
                }

                // CTRL + C 复制行
                if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                    let textarea = refDiaryContentTextArea.value // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)

                    // 只有未选择任何内容的时候
                    if (textAreaInfo.cursorSelectionStart === textAreaInfo.cursorSelectionEnd) {
                        // 只有在 localhost 或 https 的环境下才能使用 navigator.clipboard
                        if (window.isSecureContext){
                            navigator.clipboard.writeText(textAreaInfo.cursorLineContent)
                                .then(() => {
                                    console.log('✓ copied')
                                })
                        }
                    }
                }

                // shift + tab
                if (event.shiftKey && event.key === 'Tab') {
                    event.preventDefault()
                    let textarea = refDiaryContentTextArea.value // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)

                    let tempLine = textAreaInfo.cursorLineContent
                    let deleteSpaceCount = 0
                    if (tempLine.substring(0, 4) === '    ') {
                        tempLine = tempLine.substring(4)
                        deleteSpaceCount = 4
                    } else {
                        let trimSpaceResult = removeSpaceBeforeLine(0, tempLine)
                        tempLine = trimSpaceResult.lineContent
                        deleteSpaceCount = trimSpaceResult.countSpace
                    }
                    textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1, tempLine)
                    diary.value.content = textAreaInfo.textLineArray.join('\n')

                    nextTick(() => {
                        textarea.setSelectionRange(textAreaInfo.cursorSelectionStart - deleteSpaceCount, textAreaInfo.cursorSelectionStart - deleteSpaceCount)
                    })

                } else if (event.key === 'Tab') {
                    // tab
                    event.preventDefault()
                    let textarea = refDiaryContentTextArea.value // dom
                    let textAreaInfo = getTextareaInfo(textarea, diary.value.content)
                    let contentBeforeCursor = diary.value.content.substring(0, textAreaInfo.cursorSelectionStart)
                    let contentAfterCursor = diary.value.content.substring(textAreaInfo.cursorSelectionStart)
                    diary.value.content = contentBeforeCursor + '    ' + contentAfterCursor
                    nextTick(() => {
                        textarea.setSelectionRange(textAreaInfo.cursorSelectionStart + 4, textAreaInfo.cursorSelectionStart + 4)
                    })

                }
            }
        }
    })
})

onBeforeUnmount(() => {
    // 退出 Edit 之前，如果存在日记内容，缓存它。
    // 目前只有一个场景用到，就是屏幕窗口大小变化时， Edit 会消失再出现，结果就是
    // 会选择用户在这期间写的内容，这是极不应该的。
    if (diary.value.title || diary.value.content){
        diaryStore.cacheDiary = diary.value
        diaryStore.cacheDiaryOrigin = diaryOrigin.value
    }
})

const isLeaveConfirmShowed = ref(false)
let resolveLeaveCallback: ((allow: boolean) => void) | null = null

function confirmLeave() {
    isLeaveConfirmShowed.value = false
    resolveLeaveCallback?.(true)
    resolveLeaveCallback = null
}
function cancelLeave() {
    isLeaveConfirmShowed.value = false
    resolveLeaveCallback?.(false)
    resolveLeaveCallback = null
}

onBeforeRouteLeave((_, __, next) => {
    if (diaryHasChanged.value) {
        isLeaveConfirmShowed.value = true
        resolveLeaveCallback = (allow) => {
            next(allow ? undefined : false)
        }
    } else {
        next()
    }
})

const diaryHasChanged = computed(() => {
    // 无内容时，改变任何其它位置的信息都不算变化
    if (diary.value.title === '' && diary.value.content === ''){
        return false
    } else {
        return (
            diary.value.title !== diaryOrigin.value.title ||
            diary.value.content !== diaryOrigin.value.content ||
            diary.value.temperature !== diaryOrigin.value.temperature ||
            diary.value.temperature_outside !== diaryOrigin.value.temperature_outside ||
            diary.value.weather !== diaryOrigin.value.weather ||
            diary.value.category !== diaryOrigin.value.category ||
            diary.value.is_public !== diaryOrigin.value.is_public ||
            diary.value.is_markdown !== diaryOrigin.value.is_markdown
        )
    }
})


watch(() => route.params.id, newDiaryId => {
    // 仅在当前路由是 Edit 相关路由时处理，防止导航到 Detail 时误触发
    if (route.name !== 'Edit' && route.name !== 'EditNew') return
    if (newDiaryId) {
        getDiary(String(newDiaryId))
    } else {
        createDiary()
    }
})
watch(diary, newValue => {
        updateDiaryIcon()
        if (newValue.content === '') {
            possibleBillItems.value = []
        }
    },
    {deep: true}
)

const {isDiaryNeedToBeSaved, isDiaryNeedToBeRecovered, isHideContent} = storeToRefs(diaryStore)
watch(isDiaryNeedToBeSaved,newValue => {
    if (newValue) {
        saveDiary()
    }
})
watch(isDiaryNeedToBeRecovered, newValue => {
    if (newValue) {
        recoverDiary()
    }
})
watch(isHideContent, newValue => {
    if (newValue){ // 保存当前未保存的日记内容
        if (diaryStore.isDiaryEditorContentHasChanged){
            recoverDiaryContent.value = {
                title: diary.value.title,
                content: diary.value.content
            }
        }
        diary.value.title = diary.value.title.replace(/[^，。 \n]/g, '*')
        diary.value.content = diary.value.content.replace(/[^，。 \n]/g, '*')
    } else {
        if (recoverDiaryContent.value.title || recoverDiaryContent.value.content) { // 如果存在没有保存的日记内容
            diary.value.title = recoverDiaryContent.value.title
            diary.value.content = recoverDiaryContent.value.content
        } else {
            diary.value.title = diaryOrigin.value.title
            diary.value.content = diaryOrigin.value.content
        }
    }
})

// bill insert prompt
function insertNewBillKey(billKey: string){
    // console.log(billKey)
    possibleBillItems.value = []

    let lineArray = diary.value.content.split('\n').filter(item => item !== '')
    lineArray.pop()
    lineArray.push(billKey + ' ')
    diary.value.content = lineArray.join('\n')
    refDiaryContentTextArea.value.focus()
}

// contentUpdate
function contentUpdate(event: Event){
    if (diary.value.category === 'bill'){
        let content = (event.target as HTMLTextAreaElement).value
        if (content){
            let lineArray = content.split('\n')
            keysPanelPositionTop.value = lineArray.length * 24 + 15
            let lastWord = lineArray[lineArray.length - 1]
            keysPanelPositionLeft.value = lastWord.length * 15 + 30
            // possibleBillItems.value = billKeys.value.filter(item => item.item.indexOf(lastWord) === 0)
            // console.log('lastWord:', lastWord, 'word length:', lastWord.length)
            if (lastWord !== ''){
                possibleBillItems.value = billKeys.value.filter(item => item.key.indexOf(lastWord) > -1).splice(0,9)
            } else {
                possibleBillItems.value = []
            }
            // console.log(possibleBillItems.value.map(item => item.item).join(','))
        } else {
            possibleBillItems.value = []
        }
    }
}

function toggleSpaceShow(){
    if (diary.value.content.indexOf(spaceIdentifier.value) > -1){
        // 显示 space 模式
        diary.value.content = diary.value.content.substring(0, diary.value.content.length - 1)
        diary.value.content = diary.value.content.replace(/·/ig, ' ')
    } else {
        // 正常模式
        diary.value.content = diary.value.content.replace(/ /ig, '·')
        diary.value.content = diary.value.content + spaceIdentifier.value
    }
}
// 日期前后移动
function dayHasChanged(isToday: boolean){
    if (isToday){
        getCurrentTemperature()
    } else {
        diary.value.temperature = ''
        diary.value.temperature_outside = ''
        diary.value.weather = 'sunny'
    }
}

/**
 * 去除前面的空格
 * @param initSpaceCount 初始空格数
 * @param lineContent 行的内容
 * @returns {*}
 */
function removeSpaceBeforeLine(initSpaceCount: number, lineContent: string){  // 去除字符行中前面的空格
    let countSpace = initSpaceCount
    if (lineContent.substring(0,1) === ' '){
        countSpace  = countSpace + 1
        lineContent = lineContent.substring(1)
        return removeSpaceBeforeLine(countSpace, lineContent)
    } else {
        return {countSpace, lineContent}
    }
}

function getTextareaInfo(textarea: HTMLTextAreaElement, textContent: string){
    let cursorSelectionStart = textarea.selectionStart // cursorPos
    let cursorSelectionEnd = textarea.selectionEnd // cursorPos
    let cursorLineIndex = textContent.substring(0, cursorSelectionStart).split('\n').length - 1 // 光标所在行
    let textLineArray = textContent.split('\n') // 原始文字 行数组
    let cursorLineContent = textLineArray[cursorLineIndex] // 光标所在行的内容

    return {
        cursorSelectionStart,
        cursorSelectionEnd,
        cursorLineIndex,
        textLineArray,
        cursorLineContent
    }
}
// 载入本星期的所有工作日志
function loadCurrentWeekLogs() {
    isLoading.value = true
    diaryApi
        .list(requestData.value)
        .then(res => {
            isLoading.value = false
            const currentWeekStart = Moment(diary.value.date).startOf('week')
            const currentWeekEnd = Moment(diary.value.date).endOf('week')
            let workList = res.items.filter(item => {
                let diaryDate = Moment(item.date)
                return diaryDate.isBetween(currentWeekStart, currentWeekEnd)
            })
            diary.value.title = '周报'
            diary.value.content = combineWeekWorkLog(workList)
        })
        .catch(() => {
            isLoading.value = false
        })
}

function combineWeekWorkLog(workList: DiaryEntityFromServer[]){
    let contentStr = ''
    workList.forEach(item => {
        contentStr = contentStr + item.title + '\n' + item.content + '\n'
    })
    return contentStr
}

// 获取当前位置的天气气温信息
function getCurrentTemperature(){
    // Check cache
    const todayStr = Moment().format('YYYY-MM-DD');
    const cacheDate = localStorage.getItem('weather_cache_date');
    if (cacheDate === todayStr) {
        const cacheDataStr = localStorage.getItem('weather_cache_data');
        if (cacheDataStr) {
            try {
                const cacheData = JSON.parse(cacheDataStr);
                diary.value.temperature_outside = cacheData.temp;
                diaryOrigin.value.temperature_outside = cacheData.temp;
                diary.value.weather = cacheData.weather;
                diaryOrigin.value.weather = cacheData.weather;
                popMessage('success', translateText('已加载今日天气 (缓存)'), () => {}, 1);
                return;
            } catch(e) {}
        }
    }

    userApi.getWeatherConfig().then(weatherConfig => {
        if (weatherConfig.amapKey && weatherConfig.amapCity) {
            if (!weatherConfig.autoLoadWeather) return; // Do not auto load if setting is false

            axios.get('https://restapi.amap.com/v3/weather/weatherInfo', {
                params: {
                    city: weatherConfig.amapCity,
                    key: weatherConfig.amapKey
                }
            }).then(res => {
                if (res.data.status === '1' && res.data.lives && res.data.lives.length > 0) {
                    const live = res.data.lives[0]
                    diary.value.temperature_outside = live.temperature
                    diaryOrigin.value.temperature_outside = live.temperature
                    
                    let weatherDesc = live.weather
                    let mappedWeather = 'sunny'
                    if (weatherDesc.includes('晴')) mappedWeather = 'sunny'
                    else if (weatherDesc.includes('多云')) mappedWeather = 'cloudy'
                    else if (weatherDesc.includes('阴')) mappedWeather = 'overcast'
                    else if (weatherDesc.includes('阵雨') || weatherDesc.includes('小雨')) mappedWeather = 'sprinkle'
                    else if (weatherDesc.includes('雨')) mappedWeather = 'rain'
                    else if (weatherDesc.includes('雷阵雨')) mappedWeather = 'thunderstorm'
                    else if (weatherDesc.includes('雾')) mappedWeather = 'fog'
                    else if (weatherDesc.includes('雪')) mappedWeather = 'snow'
                    else if (weatherDesc.includes('龙卷风')) mappedWeather = 'tornado'
                    else if (weatherDesc.includes('霾')) mappedWeather = 'smog'
                    else if (weatherDesc.includes('沙尘暴')) mappedWeather = 'sandstorm'
                    
                    diary.value.weather = mappedWeather
                    diaryOrigin.value.weather = mappedWeather

                    // Save cache
                    localStorage.setItem('weather_cache_date', todayStr);
                    localStorage.setItem('weather_cache_data', JSON.stringify({
                        temp: live.temperature,
                        weather: mappedWeather
                    }));

                    popMessage('success', translateText('高德天气加载成功'), () => {}, 1);
                } else {
                    popMessage('warning', translateText('高德天气加载失败') + ': ' + (res.data.info || '未知错误'), () => {}, 2);
                }
            }).catch(err => {
                console.log('Amap weather err:', err)
                popMessage('warning', translateText('高德天气请求异常'), () => {}, 2);
            })
        } else {

            let geolocation = getAuthorization().geolocation
            if (geolocation){
                axios
                    .get('https://devapi.qweather.com/v7/weather/now',
                        {
                            params: {
                                key: projectConfig.HefengWeatherKey,
                                location: geolocation
                            }
                        })
                    .then(res => {
                        if (res.data.code === '200'){
                            diary.value.temperature_outside =  res.data.now.temp
                            diaryOrigin.value.temperature_outside =  res.data.now.temp
                            diary.value.weather =  getWeatherNameFromCode(res.data.now.icon)
                            diaryOrigin.value.weather =  getWeatherNameFromCode(res.data.now.icon)
                            popMessage('success', '和风天气加载成功', () => {}, 1);
                        }
                    })
                    .catch(err => {
                        console.log(err)
                    })
            } else {
                console.log('没有配置地域信息')
            }
        }
    }).catch(err => {
        console.log('Failed to fetch weather config:', err)
        // Check if it's because backend was not restarted
        if (err && err.message && err.message.includes("not found")) {
            popMessage('danger', '获取天气配置失败，请确保您已经重启了后端服务！', () => {}, 3)
        }
    })
}

function setCategory(categoryNameEn: string) {
    diary.value.category = categoryNameEn
    if (categoryNameEn === 'bill' && diary.value.title === ''){
        diary.value.title = '账单'
    }
}
function setWeather(weather: string) {
    diary.value.weather = weather
}
function updateDiaryIcon() {
    document.title = 'utips' // 固定浏览器标签标题
    diaryStore.isDiaryEditorContentHasChanged = diaryHasChanged.value
    if (diaryHasChanged.value) {
        diaryStore.editLogoImg = diary.value.content ? LogoIcons.logo_content: LogoIcons.logo_title
    } else {
        diaryStore.editLogoImg = diary.value.content ? LogoIcons.logo_content_saved: LogoIcons.logo_title_saved
    }
}
function getDiary(diaryId: string) {
    // 编辑日记
    diaryApi
        .detail({
            diaryId: diaryId
        })
        .then(res => {
            let tempDiary = res

            if (diaryStore.isHideContent){
                diary.value.title = tempDiary.title.replace(/[^，。 \n]/g, '*')
                diary.value.content = tempDiary.content.replace(/[^，。 \n]/g, '*')
            } else {
                diary.value.title = tempDiary.title
                diary.value.content = tempDiary.content
            }

            diary.value.id = tempDiary.id
            diary.value.category = tempDiary.category
            diary.value.date = new Date(tempDiary.date.replace(' ', 'T')) // safari 只识别 2020-10-27T14:35:33 格式的日期
            diary.value.weather = tempDiary.weather
            diary.value.is_public = !!tempDiary.is_public
            diary.value.is_markdown = !!tempDiary.is_markdown
            diary.value.temperature = temperatureProcessSTC(tempDiary.temperature)
            diary.value.temperature_outside = temperatureProcessSTC(tempDiary.temperature_outside)
            Object.assign(diaryOrigin.value, diary.value) // 不能直接赋值，赋值的是它的引用

        })
        .catch(err => {
            console.log('EDIT: get diary info error: ', err)
            router.push({name: 'List'})
        })
}
function saveDiary() {
    if (diaryStore.isHideContent) {
        popMessage('warning', '请退出当前隐藏模式，再进行保存操作', ()=>{}, 2)
        return
    } else if (!/^(-?\d{1,3}(\.\d{1,2})?)?$/.test(diary.value.temperature)){
        popMessage('warning', '身处温度填写错误，应为 23.45 这样', ()=>{}, 2)
        return
    } else if (!/^(-?\d{1,3}(\.\d{1,2})?)?$/.test(diary.value.temperature)){
        popMessage('warning', '室外温度填写错误，请检查 23.45 这样', ()=>{}, 2)
        return
    } else if  (diary.value.title.trim().length === 0) {
        diary.value.title = '' // clear content
        popMessage('warning', '内容未填写', null)
        diaryStore.isDiaryNeedToBeSaved = false// 未能成功保存时，复位 isDiaryNeedToBeSaved 标识
        return
    }
    let requestData: DiarySubmitEntity = {
        id: diary.value.id,
        title: diary.value.title,
        content: diary.value.content,
        category: diary.value.category,
        temperature: temperatureProcessCTS(diary.value.temperature),
        temperature_outside: temperatureProcessCTS(diary.value.temperature_outside),
        weather: diary.value.weather,
        is_public: diary.value.is_public ? 1 : 0,
        is_markdown: diary.value.is_markdown ? 1 : 0,
        date: new Date(diary.value.date).toISOString(),
    }
    if (isNew.value){
        diaryApi
            .add(requestData)
            .then(processAfterSaveDiary)
            .catch(err => {
                popMessage('danger', err.message, () => {
                    diaryStore.isSavingDiary = false
                    diaryStore.isDiaryNeedToBeSaved = false
                }, 3)
            })
    } else {
        diaryApi
            .modify(requestData)
            .then(processAfterSaveDiary)
            .catch(err => {
                popMessage('danger', err.message, () => {
                    diaryStore.isSavingDiary = false
                    diaryStore.isDiaryNeedToBeSaved = false
                }, 3)
            })
    }
}

// 保存日记后要操作的
function processAfterSaveDiary(res: ResponseDiaryAdd){
    diaryStore.isSavingDiary = false
    diaryStore.isDiaryNeedToBeSaved = false

    const serverRecord = res.data
    const newId = serverRecord.id
    const wasNew = isNew.value

    if (wasNew) {
        diary.value.id = newId
    }

    // 成功后更新 origin（id 赋值后再 assign，确保 diaryHasChanged 为 false）
    Object.assign(diaryOrigin.value, diary.value)
    updateDiaryIcon()

    popMessage('success', res.message, null, 1)

    // 构造带展示字段的日记对象（与列表加载后格式一致）
    const enrichedDiary = {
        ...serverRecord,
        categoryString: categoryStore.categoryNameMap.get(serverRecord.category),
        weekday: dateProcess(serverRecord.date).weekday,
        weekdayShort: EnumWeekDayShort[new Date(serverRecord.date).getDay()],
        dateString: dateProcess(serverRecord.date).date,
        is_public: Boolean(serverRecord.is_public),
    }

    if (wasNew) {
        // 新增：通知列表插入（桌面端）；移动端缓存失效，返回时重新加载
        diaryStore.listOperation = {type: 'add', diary: enrichedDiary as any, id: newId}
        diaryStore.listCache = null
    } else {
        // 修改：通知列表更新（桌面端）；更新移动端缓存中的对应条目
        diaryStore.listOperation = {type: 'change', diary: enrichedDiary as any, id: newId}
        if (diaryStore.listCache) {
            const idx = diaryStore.listCache.diaries.findIndex((d: any) => d.id === newId)
            if (idx !== -1) {
                diaryStore.listCache.diaries.splice(idx, 1, enrichedDiary)
            }
        }
    }

    isNew.value = false

    router.push({
        name: 'Detail',
        params: {id: newId}
    })
}
function createDiary() {
    isNew.value = true

    diary.value = {
        id: '',
        title: diary.value.category === 'bill'? '账单': '', // 在账单类别下新建时，自动填充标题为 账单
        content: "",
        is_public: false,
        is_markdown: false,
        date: diary.value.date || new Date(), // 本页面新建时，保留之前日记的时间，因为可能一次性补全很多之前的日记
        weather: 'sunny',
        category: diary.value.category,
        temperature: '',
        temperature_outside: '',
    }
    // 新建日记时也记录原始数据
    Object.assign(diaryOrigin.value, diary.value)
    updateDiaryIcon()

    // 只有在当天写日记时，才自动获取实时天气
    if (Moment(diary.value.date).isSame(new Date(), 'day')){
        getCurrentTemperature()
    } else {
        diary.value.temperature = ''
        diary.value.temperature_outside = ''
        diaryOrigin.value.temperature = ''
        diaryOrigin.value.temperature_outside = ''
    }
}

function recoverDiary() {
    Object.assign(diary.value, diaryOrigin.value)
    recoverDiaryContent.value = {
        title: '',
        content: ''
    }
    diaryStore.isDiaryNeedToBeRecovered = false
}

function convertToServerVersion() { // 转换为数据库格式的日记
    let date = new Date(diary.value.date).toISOString()
    return {
        id: diary.value.id,
        date: date,
        title: diary.value.title,
        content: diary.value.content,
        temperature: temperatureProcessCTS(diary.value.temperature),
        temperature_outside: temperatureProcessCTS(diary.value.temperature_outside),
        weather: diary.value.weather,
        category: diary.value.category,
        date_create: date,
        date_modify: "",
        is_public: diary.value.is_public ? 1 : 0,
        is_markdown: diary.value.is_markdown ? 1 : 0
    }
}


// 和风天气 API 天气图标对应： https://dev.qweather.com/docs/start/icons/
function getWeatherNameFromCode(code: string): string{
    return EnumWeather[Number(code)] || 'sunny'
}
// 强制重新加载实时天气并更新缓存 (忽略缓存，直接查询API)
function reloadWeather() {
    isWeatherLoading.value = true;
    userApi.getWeatherConfig().then(weatherConfig => {
        if (weatherConfig.amapKey && weatherConfig.amapCity) {
            axios.get('https://restapi.amap.com/v3/weather/weatherInfo', {
                params: {
                    city: weatherConfig.amapCity,
                    key: weatherConfig.amapKey
                }
            }).then(res => {
                if (res.data.status === '1' && res.data.lives && res.data.lives.length > 0) {
                    const live = res.data.lives[0]
                    diary.value.temperature_outside = live.temperature
                    diaryOrigin.value.temperature_outside = live.temperature
                    
                    let weatherDesc = live.weather
                    let mappedWeather = 'sunny'
                    if (weatherDesc.includes('晴')) mappedWeather = 'sunny'
                    else if (weatherDesc.includes('多云')) mappedWeather = 'cloudy'
                    else if (weatherDesc.includes('阴')) mappedWeather = 'overcast'
                    else if (weatherDesc.includes('阵雨') || weatherDesc.includes('小雨')) mappedWeather = 'sprinkle'
                    else if (weatherDesc.includes('雨')) mappedWeather = 'rain'
                    else if (weatherDesc.includes('雷阵雨')) mappedWeather = 'thunderstorm'
                    else if (weatherDesc.includes('雾')) mappedWeather = 'fog'
                    else if (weatherDesc.includes('雪')) mappedWeather = 'snow'
                    else if (weatherDesc.includes('龙卷风')) mappedWeather = 'tornado'
                    else if (weatherDesc.includes('霾')) mappedWeather = 'smog'
                    else if (weatherDesc.includes('沙尘暴')) mappedWeather = 'sandstorm'
                    
                    diary.value.weather = mappedWeather
                    diaryOrigin.value.weather = mappedWeather

                    // Update cache
                    const todayStr = Moment().format('YYYY-MM-DD');
                    localStorage.setItem('weather_cache_date', todayStr);
                    localStorage.setItem('weather_cache_data', JSON.stringify({
                        temp: live.temperature,
                        weather: mappedWeather
                    }));

                    popMessage('success', translateText('高德天气加载成功'), () => {}, 1);
                } else {
                    popMessage('warning', translateText('高德天气加载失败') + ': ' + (res.data.info || '未知错误'), () => {}, 2);
                }
            }).catch(err => {
                console.log('Amap weather err:', err)
                popMessage('warning', translateText('高德天气请求异常'), () => {}, 2);
            }).finally(() => {
                isWeatherLoading.value = false;
            })
        } else {
            popMessage('warning', translateText('请先在设置中配置高德天气'), () => {}, 2);
            isWeatherLoading.value = false;
        }
    }).catch(err => {
        isWeatherLoading.value = false;
    })
}
</script>

<style lang="scss">
@import "edit";
</style>
