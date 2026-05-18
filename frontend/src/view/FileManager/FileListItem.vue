<template>
    <div class="file-list-item">
        <div class="id">{{props.fileInfo.id}}</div>

        <div class="file-meta">
            <TabIcon @click="openFileInNewTab" size="small" alt="黑色-内容显示" />
            <TabIcon @click="modalEditFileName = true" size="small" alt="黑色-编辑"/>
            <TabIcon @click="deleteFile" size="small" alt="黑色-删除"/>
            <TabIcon size="small" alt="黑色-分享" class="clipboard" :data-clipboard="filePath" />
        </div>

        <div class="file-info">
            <div class="name">{{props.fileInfo.description}}</div>
            <div class="size">{{(props.fileInfo.size/1024).toFixed(0)}} kb</div>
            <div class="description">{{props.fileInfo.name_original}}</div>
            <div class="date">{{props.fileInfo.date_time}}</div>
            <div :class="['file-type',
                {image: props.fileInfo.type.indexOf('image') > -1},
            ]">{{props.fileInfo.type}}</div>
        </div>

        <Modal v-if="modalEditFileName">
            <form class="modal-form-panel" method="post" :id="modifyFormId" @submit.prevent="modifyFileNameConfirm">
                <div class="input-group">
                    <label :for="oldFileNameId">{{ $tt('旧文件名') }}</label>
                    <input :value="props.fileInfo.description" type="text" name="fileNameOld" :id="oldFileNameId">
                </div>
                <div class="input-group">
                    <label :for="newFileNameId">{{ $tt('新文件名') }}</label>
                    <input v-model.lazy="newFileName" type="text" name="fileName" :id="newFileNameId">
                </div>
                <button class="btn mt-8 btn-active" type="submit">{{ $tt('确定') }}</button>
                <button class="btn mt-2" @click="modalEditFileName = false" type="submit">{{ $tt('取消') }}</button>
            </form>
        </Modal>
    </div>


</template>

<script lang="ts" setup>
import TabIcon from "../../components/TabIcon.vue";
import fileManagerApi from "../../api/fileManagerApi";
import Modal from "../../components/Modal.vue";

import {popMessage} from "@/utility.ts";
import {computed, ref} from "vue";
import {EntityFile} from "@/view/FileManager/File.ts";

const props = defineProps<{
    fileInfo: EntityFile
}>()
const oldFileNameId = computed(() => `fileNameOld-${props.fileInfo.id}`)
const newFileNameId = computed(() => `fileName-${props.fileInfo.id}`)
const modifyFormId = computed(() => `formModifyFileName-${props.fileInfo.id}`)
const filePath = computed(()=>{
    return new URL(props.fileInfo.path, window.location.origin).toString()
})

const emit = defineEmits(['refreshList'])

const modalEditFileName = ref(false) // 文件名修改
const newFileName = ref('') // 新文件名

function openFileInNewTab(){
    window.open(filePath.value, '_blank')
}
function deleteFile(){
    fileManagerApi
        .delete({
            fileId: props.fileInfo.id
        })
        .then(res => {
            console.log(res)
            popMessage('success', res.message)
            emit('refreshList')
        })
        .catch(err => {
            popMessage('danger', err.message)
        })
}
function modifyFileNameConfirm(){
    fileManagerApi
        .modifyFileName({
            fileId: props.fileInfo.id,
            description: newFileName.value
        })
        .then(res => {
            popMessage('success', res.message)
            emit('refreshList')
        })
        .catch(err => {
            popMessage('danger', err.message)
        })
}

</script>

<style scoped lang="scss">
@import "../../scss/plugin";
@import "./file-list-item";
</style>
