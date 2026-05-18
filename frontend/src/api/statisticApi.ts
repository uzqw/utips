/**
 * 统计 API - 使用 PocketBase SDK
 */
import { pb } from '../pocketbase'

export interface CategoryStat {
    name_en: string
    name: string
    color: string
    count: number
}

export interface YearStat {
    year: number
    count: number
    months: {
        id: string
        month: number
        count: number
    }[]
}

export default {
    /**
     * 按分类统计日记数量
     * 返回格式: { life: 6, study: 0, ..., amount: 7, shared: 1 }
     */
    async category(): Promise<{ success: boolean; data: Record<string, number>; message: string }> {
        try {
            // 获取所有分类
            const categories = await pb.collection('categories').getFullList({
                sort: 'sort_id'
            })

            // 获取当前用户的日记
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: {}, message: '未登录' }
            }

            // 统计每个分类的日记数量
            const stats: Record<string, number> = {}
            let totalAmount = 0
            let sharedCount = 0

            for (const cat of categories) {
                const result = await pb.collection('diaries').getList(1, 1, {
                    filter: `user="${userId}"&&category="${cat.id}"`,
                    fields: 'id'
                })
                stats[cat.name_en] = result.totalItems
                totalAmount += result.totalItems
            }

            // 统计共享日记数量
            const sharedResult = await pb.collection('diaries').getList(1, 1, {
                filter: `user="${userId}"&&is_public=true`,
                fields: 'id'
            })
            sharedCount = sharedResult.totalItems

            stats.amount = totalAmount
            stats.shared = sharedCount

            return { success: true, data: stats, message: '' }
        } catch (error: any) {
            return { success: false, data: {}, message: error.message }
        }
    },

    /**
     * 按年份统计日记数量
     */
    async year(): Promise<{ success: boolean; data: YearStat[]; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: [], message: '未登录' }
            }

            // 获取所有日记的日期
            const diaries = await pb.collection('diaries').getFullList({
                filter: `user="${userId}"`,
                fields: 'date',
                sort: '-date'
            })

            // 按年份和月份统计
            const yearMap = new Map<number, Map<number, number>>()
            
            for (const diary of diaries) {
                const date = new Date(diary.date)
                const year = date.getFullYear()
                const month = date.getMonth() + 1

                if (!yearMap.has(year)) {
                    yearMap.set(year, new Map<number, number>())
                }
                
                const monthMap = yearMap.get(year)!
                monthMap.set(month, (monthMap.get(month) || 0) + 1)
            }

            const stats: YearStat[] = Array.from(yearMap.entries())
                .map(([year, monthMap]) => {
                    const months = Array.from(monthMap.entries())
                        .map(([month, count]) => ({
                            id: `${year}-${String(month).padStart(2, '0')}`,
                            month,
                            count
                        }))
                        .sort((a, b) => b.month - a.month)

                    const totalCount = months.reduce((sum, m) => sum + m.count, 0)
                    
                    return {
                        year,
                        count: totalCount,
                        months
                    }
                })
                .sort((a, b) => b.year - a.year)

            return { success: true, data: stats, message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    },

    /**
     * 天气温度统计（返回每日温度数据）
     */
    async weather(): Promise<{ success: boolean; data: any[]; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: [], message: '未登录' }
            }

            const diaries = await pb.collection('diaries').getFullList({
                filter: `user="${userId}"`,
                fields: 'date,temperature,temperature_outside',
                sort: 'date'
            })

            const result = diaries.map(diary => ({
                date: diary.date,
                temperature: diary.temperature ?? -273,
                temperature_outside: diary.temperature_outside ?? -273
            }))

            return { success: true, data: result, message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    },

    /**
     * 账单月度汇总统计
     */
    async monthSum(): Promise<{ success: boolean; data: any[]; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: [], message: '未登录' }
            }

            // 获取 bill 分类
            const billCategory = await pb.collection('categories').getFirstListItem('name_en="bill"')

            // 获取所有账单日记
            const diaries = await pb.collection('diaries').getFullList({
                filter: `user="${userId}"&&category="${billCategory.id}"`,
                sort: '-date'
            })

            // 按月分组统计
            const monthMap = new Map<string, { sumIncome: number; sumOutput: number }>()

            for (const diary of diaries) {
                const date = new Date(diary.date)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { sumIncome: 0, sumOutput: 0 })
                }

                const monthData = monthMap.get(monthKey)!

                // 解析账单内容
                const lines = (diary.content || '').split('\n').filter((line: string) => line.trim())
                for (const line of lines) {
                    const match = line.match(/(.+?)\s+([+-]?\d+(?:\.\d+)?)\s*$/)
                    if (match) {
                        const amount = parseFloat(match[2])
                        if (amount > 0) {
                            monthData.sumIncome += amount
                        } else {
                            monthData.sumOutput += amount
                        }
                    }
                }
            }

            // 转换为数组格式
            const result = Array.from(monthMap.entries())
                .map(([monthId, data]) => ({
                    month_id: monthId,
                    sumIncome: data.sumIncome,
                    sumOutput: data.sumOutput
                }))
                .sort((a, b) => a.month_id.localeCompare(b.month_id))

            return { success: true, data: result, message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    },

    /**
     * 用户统计（管理员功能）
     * 在 PocketBase 中，普通用户只能看到自己的统计信息
     */
    async users(): Promise<{ success: boolean; data: any[]; message: string }> {
        try {
            const user = pb.authStore.record
            if (!user) {
                return { success: false, data: [], message: '未登录' }
            }

            // 统计当前用户的日记数量
            const diaryCount = await pb.collection('diaries').getList(1, 1, {
                filter: `user="${user.id}"`,
                fields: 'id'
            })

            // 返回当前用户的统计信息
            const userData = {
                id: user.id,
                nickname: user.name || user.email?.split('@')[0] || 'User',
                email: user.email,
                register_time: user.created,
                last_visit_time: user.updated,
                count_diary: diaryCount.totalItems,
                count_dict: 0,
                count_map_route: 0
            }

            return { success: true, data: [userData], message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    }
}
