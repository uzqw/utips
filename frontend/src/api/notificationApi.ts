import { pb } from '../pocketbase'
import type { RecordModel } from 'pocketbase'

export interface NotificationRecord extends RecordModel {
    type: string
    level: 'info' | 'warning' | 'error'
    title: string
    message: string
    source: string
    sourceRecord: string
    sourceItem: string
    operation: string
    error: string
    isRead: boolean
    readAt?: string
}

export default {
    async unreadCount(): Promise<number> {
        const result = await pb.collection('notifications').getList(1, 1, {
            filter: 'isRead = false',
            fields: 'id'
        })
        return result.totalItems
    },

    async latest(limit = 20): Promise<NotificationRecord[]> {
        const result = await pb.collection('notifications').getList(1, limit, {
            sort: '-created',
        })
        return result.items as NotificationRecord[]
    },

    async markRead(id: string): Promise<void> {
        await pb.collection('notifications').update(id, {
            isRead: true,
            readAt: new Date().toISOString()
        })
    },

    async markAllRead(): Promise<void> {
        const unread = await pb.collection('notifications').getFullList({
            filter: 'isRead = false',
            fields: 'id'
        })
        await Promise.all(unread.map(item => pb.collection('notifications').update(item.id, {
            isRead: true,
            readAt: new Date().toISOString()
        })))
    }
}
