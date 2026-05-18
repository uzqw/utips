/**
 * 文件管理 API - 使用 PocketBase SDK
 */
import { pb } from '../pocketbase'
import type { RecordModel, ListResult } from 'pocketbase'

export interface FileUploadData {
    file: File
    description?: string
    file_type?: 'image' | 'file' | 'document'
}

export default {
    /**
     * 获取文件列表
     */
    async list(page = 1, perPage = 20): Promise<ListResult<RecordModel>> {
        const userId = pb.authStore.record?.id
        if (!userId) throw new Error('未登录')

        return await pb.collection('files').getList(page, perPage, {
            filter: `user="${userId}"`,
            sort: '-created'
        })
    },

    /**
     * 上传文件
     */
    async upload(data: FileUploadData): Promise<RecordModel> {
        const userId = pb.authStore.record?.id
        if (!userId) throw new Error('未登录')

        const formData = new FormData()
        formData.append('file', data.file)
        formData.append('name_original', data.file.name)
        formData.append('user', userId)

        if (data.description) {
            formData.append('description', data.description)
        }

        if (data.file_type) {
            formData.append('file_type', data.file_type)
        } else {
            // 自动检测文件类型
            const type = data.file.type.startsWith('image/') ? 'image' : 'file'
            formData.append('file_type', type)
        }

        return await pb.collection('files').create(formData)
    },

    /**
     * 删除文件
     */
    async delete(fileId: string): Promise<boolean> {
        await pb.collection('files').delete(fileId)
        return true
    },

    /**
     * 获取文件 URL
     */
    getFileUrl(record: RecordModel, filename?: string): string {
        const file = filename || record.file
        if (file) {
            return pb.files.getURL(record, file)
        }
        return ''
    },

    /**
     * 获取缩略图 URL
     */
    getThumbUrl(record: RecordModel, thumbSize = '100x100'): string {
        if (record.file) {
            return pb.files.getURL(record, record.file, { thumb: thumbSize })
        }
        return ''
    }
}
