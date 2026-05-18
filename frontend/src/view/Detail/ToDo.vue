<template>
    <div class="todo-list">
        <div :class="['todo-list-item', {done: item.isDone}]"
             v-for="(item, index) in todoList" :key="item.todoId || index">
            <div class="checkbox-wrapper">
                <div :class="['checkbox', {checked: item.isDone}]"
                     @click="toggleDoneStatus(item)"></div>
            </div>
            <div class="content-wrapper">
                <div class="content-row">
                    <div :contenteditable="isEditable"
                         @focus="startTextEdit"
                         @blur="finishContentEdit(item, $event)"
                         class="content"
                         v-text="diaryStore.isHideContent ? maskText(item.content) : item.content">
                    </div>
                    <div class="todo-meta" v-if="!diaryStore.isHideContent">
                        <button
                            v-if="!item.isEditingDue"
                            type="button"
                            :class="['due-chip', {empty: isDefaultDue(item.due)}]"
                            @click="startEditDue(item)">
                            <span class="due-icon">◷</span>
                            <span>{{ isDefaultDue(item.due) ? translateText('添加截止时间') : formatDueLabel(item.due) }}</span>
                        </button>
                        <div v-else class="due-editor">
                            <input
                                :id="`todo-due-${item.todoId || index}`"
                                name="todo-due"
                                type="datetime-local"
                                step="1"
                                :value="item.dueDraft"
                                @input="handleDueDraftChange(item, $event)"
                                @change="handleDueDraftChange(item, $event)">
                            <button type="button" @mousedown.prevent="confirmDue(item)">{{ $tt('确定') }}</button>
                            <button type="button" @mousedown.prevent="clearDue(item)">{{ $tt('清除') }}</button>
                        </div>
                    </div>
                </div>
                <div
                    v-if="item.note"
                    :contenteditable="isEditable"
                    @focus="startTextEdit"
                    @blur="finishNoteEdit(item, $event)"
                    class="note"
                    v-text="diaryStore.isHideContent ? maskText(item.note || '') : item.note">
                </div>
                <div
                    v-if="!diaryStore.isHideContent"
                    :contenteditable="isEditable"
                    :data-placeholder="$tt('描述')"
                    @focus="startTextEdit"
                    @blur="finishDescEdit(item, $event)"
                    class="desc"
                    v-text="item.desc">
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import diaryApi from "../../api/diaryApi.ts"
import {computed, onMounted, ref, watch} from "vue";
import {translateText} from "@/i18n/text";
import {DiaryEntity, DiarySubmitEntity} from "@/types/diary.ts";
import {popMessage, temperatureProcessCTS} from "@/utility.ts";
import { useDiaryStore } from "@/stores/diary";
const diaryStore = useDiaryStore();

const DEFAULT_TODO_DUE = '0001-01-01T00:00:00+08:00'

interface TODOEntity {
    id: number,
    todoId: string,
    isDone: boolean,
    content: string,
    note?: string,
    due?: string,
    desc?: string,
    isEditingDue?: boolean,
    dueDraft?: string
}

const props = defineProps<{
    readonly: boolean,
    diary: DiaryEntity
}>()
const emit = defineEmits<{
    (event: 'saved', diary: DiaryEntity): void
}>()

const todoList= ref<Array<TODOEntity>>([])
const lastId = ref(0) // 最后一个修改后的 id，用于将最后一个标记的 todoItem 移到列表最后
const isTextEditing = ref(false)
const isEditable = computed(() => !props.readonly && !diaryStore.isHideContent)

onMounted(()=>{
    processContent(props.diary)
})

watch(() => props.diary, newValue => {
    if (!isTextEditing.value) {
        processContent(newValue)
    }
})

watch(() => props.diary.content, () => {
    if (!isTextEditing.value) {
        processContent(props.diary)
    }
})

function toggleDoneStatus(todoItem: TODOEntity){
    if (!props.readonly){
        if (todoItem.isDone){
            lastId.value = lastId.value + 1
            todoItem.id = lastId.value
        }
        todoItem.isDone = !todoItem.isDone
        // 拆分 标记 | 未标记的，并通过 id 排序，实现类似 iPhone todoList 的效果
        let unfinished = todoList.value
            .filter(item => !item.isDone)
            .sort((a, b) => a.id - b.id)
        let finished = todoList.value
            .filter(item => item.isDone)
            .sort((a,b) => a.id - b.id)
        todoList.value = unfinished.concat(finished)
        saveDiary()
    }
}
// 将日记内容转换成 TODOS
function processContent(diary: DiaryEntity){
    if (diary.content){
        let todoStringList = diary.content.split('\n')
        todoList.value = todoStringList
            .filter(item => /^[\-=]/.test(item)) // 只保留开头是 - | = 的
            .map((item, index) => {
                let isDone = item.substring(0, 1) === '='
                let parsedLine = parseTodoLine(item.substring(2))
                let content = parsedLine.text.split('#') //
                return {
                    id: index,
                    todoId: parsedLine.todoId || generateTodoId(),
                    isDone: isDone,
                    content: content[0].trim(),
                    note: content[1]? content[1].trim(): '',
                    due: parsedLine.due || DEFAULT_TODO_DUE,
                    desc: parsedLine.desc,
                    isEditingDue: false,
                    dueDraft: ''
                }
            })
        const todoDone = todoList.value.filter(item => item.isDone)
        const todoUndone = todoList.value.filter(item => !item.isDone)
        todoList.value = todoUndone.concat(todoDone)
        lastId.value = todoList.value.length
    }
}
function toDiaryString(todoList: TODOEntity[]){
    let finalString = ''
    if (todoList.length > 0){
        todoList.forEach(item => {
            let prefix = item.isDone ? '= ':'- '
            let note = item.note? ` #${item.note}`:''
            let todoId = item.todoId ? ` @id=${item.todoId}` : ''
            let due = ` @due=${item.due || DEFAULT_TODO_DUE}`
            let desc = ` @desc="${escapeMetaValue(item.desc || '')}"`
            finalString = finalString.concat(`${prefix}${item.content}${note}${todoId}${due}${desc}\n`)
        })
    }
    return finalString
}
function saveDiary(isShowNotification?: boolean){
    let requestData: DiarySubmitEntity = {
        id: props.diary.id,
        title: props.diary.title,
        content: toDiaryString(todoList.value),
        category: props.diary.category,
        temperature: temperatureProcessCTS(props.diary.temperature),
        temperature_outside: temperatureProcessCTS(props.diary.temperature_outside),
        weather: props.diary.weather,
        is_public: props.diary.is_public ? 1 : 0,
        is_markdown: props.diary.is_markdown ? 1 : 0,
        date: normalizeDiaryDateForSubmit(props.diary.date),
    }
    diaryApi
        .modify(requestData)
        .then(res => {
            if (!res.success) {
                popMessage('danger', res.message, ()=>{},1)
                return
            }
            emit('saved', res.data as DiaryEntity)
            if (isShowNotification){
                popMessage('success', res.message, ()=>{}, 1)
            }
        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{},1)
        })
}

// DELETE
function deleteToDo(index: number){
    todoList.value.splice(index, 1)
    saveDiary()
}


/**
 * 实时修改 to-do 内容
 * @param todoItem
 * @param ev
 */
function startTextEdit() {
    if (!isEditable.value) return
    isTextEditing.value = true
}

function finishContentEdit(todoItem: TODOEntity, ev: Event){
    finishTextEdit(todoItem, 'content', sanitizeEditableText((ev.target as HTMLDivElement).innerText))
}
function finishNoteEdit(todoItem: TODOEntity, ev: Event){
    finishTextEdit(todoItem, 'note', sanitizeEditableText((ev.target as HTMLDivElement).innerText))
}
function finishDescEdit(todoItem: TODOEntity, ev: Event){
    finishTextEdit(todoItem, 'desc', sanitizeEditableText((ev.target as HTMLDivElement).innerText))
}

function finishTextEdit(todoItem: TODOEntity, field: 'content' | 'note' | 'desc', value: string) {
    isTextEditing.value = false
    if (props.readonly) return
    if ((todoItem[field] || '') === value) return
    todoItem[field] = value
    saveDiary()
}

function sanitizeEditableText(value: string) {
    return value.replace(/\u00a0/g, ' ').replace(/\n$/g, '')
}

function maskText(value: string) {
    return value.replace(/[^，。 \n]/g, '*')
}

function parseTodoLine(line: string) {
    let todoId = ''
    let due = ''
    let desc = ''
    const idMatch = line.match(/(?:^|\s)@id=([A-Za-z0-9_-]+)/)
    if (idMatch) {
        todoId = idMatch[1]
    }
    const dueMatch = line.match(/(?:^|\s)@due=([^\s]+)/)
    if (dueMatch) {
        due = dueMatch[1]
    }
    const descMatch = line.match(/(?:^|\s)@desc="((?:\\"|[^"])*)"/)
    if (descMatch) {
        desc = descMatch[1].replace(/\\"/g, '"')
    }

    const text = line
        .replace(/(?:^|\s)@id=[A-Za-z0-9_-]+/g, '')
        .replace(/(?:^|\s)@due=[^\s]+/g, '')
        .replace(/(?:^|\s)@desc="(?:\\"|[^"])*"/g, '')
        .trim()

    return { text, todoId, due, desc }
}

function startEditDue(todoItem: TODOEntity) {
    if (props.readonly) return
    todoItem.dueDraft = isDefaultDue(todoItem.due) ? '' : rfc3339ToDateTimeLocal(todoItem.due || '')
    todoItem.isEditingDue = true
}

function handleDueDraftChange(todoItem: TODOEntity, ev: Event) {
    todoItem.dueDraft = (ev.target as HTMLInputElement).value
}

function confirmDue(todoItem: TODOEntity) {
    todoItem.due = todoItem.dueDraft ? dateTimeLocalToRfc3339(todoItem.dueDraft) : DEFAULT_TODO_DUE
    todoItem.isEditingDue = false
    saveDiary()
}

function clearDue(todoItem: TODOEntity) {
    todoItem.due = DEFAULT_TODO_DUE
    todoItem.dueDraft = ''
    todoItem.isEditingDue = false
    saveDiary()
}

function formatDueLabel(value: string) {
    if (isDefaultDue(value)) return translateText('添加截止时间')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
}

function rfc3339ToDateTimeLocal(value: string) {
    if (isDefaultDue(value)) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

function dateTimeLocalToRfc3339(value: string) {
    const date = new Date(value)
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const absOffset = Math.abs(offsetMinutes)
    const offsetHour = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const offsetMinute = String(absOffset % 60).padStart(2, '0')
    return `${rfc3339ToDateTimeLocal(date.toISOString()).replace(/Z$/, '')}${sign}${offsetHour}:${offsetMinute}`
}

function escapeMetaValue(value: string) {
    return value.replace(/"/g, '\\"')
}

function normalizeDiaryDateForSubmit(value: Date | string | number) {
    if (value instanceof Date) {
        return value.toISOString()
    }
    if (typeof value === 'string') {
        const normalized = value.includes('T') ? value : value.replace(' ', 'T')
        const date = new Date(normalized)
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString()
        }
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function isDefaultDue(value?: string) {
    return !value || value === DEFAULT_TODO_DUE
}

function generateTodoId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID().replace(/-/g, '')
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}



</script>

<style lang="scss">
@import "todo";
</style>
