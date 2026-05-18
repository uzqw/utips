/**
 * 日记 API - 使用 PocketBase SDK
 */
import { pb } from '../pocketbase'
import type { RecordModel, ListResult } from 'pocketbase'
import type { CategoryEntity } from '../types/Category'

export interface DiarySearchParams {
    page?: number
    perPage?: number
    pageNo?: number
    pageSize?: number
    category?: string
    keyword?: string
    keywords?: string
    categories?: string
    dateFilterString?: string
    dateFilterArray?: string[]
    filterShared?: number
    dateStart?: string
    dateEnd?: string
    year?: number
    month?: number
}

export interface DiarySubmitData {
    id?: string
    date: string
    title: string
    content?: string
    temperature?: number
    temperature_outside?: number
    weather?: string
    category?: string
    is_public?: boolean
    is_markdown?: boolean
}

export default {
    /**
     * 获取所有分类
     */
    async getCategoryAll(): Promise<{ success: boolean; data: CategoryEntity[]; message: string }> {
        try {
            const records = await pb.collection('categories').getFullList({
                sort: 'sort_id'
            })
            return {
                success: true,
                data: records as unknown as CategoryEntity[],
                message: ''
            }
        } catch (error: any) {
            return {
                success: false,
                data: [],
                message: error.message
            }
        }
    },

    /**
     * 获取日记列表
     */
    async list(params: DiarySearchParams): Promise<ListResult<RecordModel>> {
        const page = (params as any).pageNo || 1
        const perPage = (params as any).pageSize || 20

        // 构建过滤条件
        const filters: string[] = []

        // 解析关键词
        let keywords: string[] = []
        if ((params as any).keywords) {
            try {
                keywords = JSON.parse((params as any).keywords)
            } catch {
                keywords = typeof (params as any).keywords === 'string'
                    ? [(params as any).keywords]
                    : (params as any).keywords || []
            }
        }

        // 关键词搜索
        if (keywords.length > 0) {
            const keywordFilters = keywords
                .filter(kw => kw.trim().length > 0)
                .map(kw => `(title~"${kw}"||content~"${kw}")`)
            
            if (keywordFilters.length > 0) {
                filters.push(`(${keywordFilters.join('&&')})`)
            }
        }

        // 解析分类
        let categories: string[] = []
        if ((params as any).categories) {
            try {
                categories = JSON.parse((params as any).categories)
            } catch {
                categories = typeof (params as any).categories === 'string'
                    ? [(params as any).categories]
                    : (params as any).categories || []
            }
        }

        // 分类过滤
        if (categories.length > 0) {
            const categoryFilters = categories.map(cat => `category.name_en="${cat}"`)
            filters.push(`(${categoryFilters.join('||')})`)
        }

        // 日期范围过滤
        if ((params as any).dateFilterArray && (params as any).dateFilterArray.length > 0) {
            const dateFilters: string[] = []
            for (const dateStr of (params as any).dateFilterArray) {
                if (dateStr.includes('-')) {
                    // 格式: "2024-01"
                    const [year, month] = dateStr.split('-')
                    const startDate = `${year}-${month}-01`
                    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
                    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
                    dateFilters.push(`(date>="${startDate}"&&date<="${endDate}")`)
                } else if (dateStr.length === 4) {
                    // 格式: "2024"
                    dateFilters.push(`(date>="${dateStr}-01-01"&&date<="${dateStr}-12-31")`)
                }
            }
            if (dateFilters.length > 0) {
                filters.push(`(${dateFilters.join('||')})`)
            }
        } else if ((params as any).dateFilterString) {
            const dateStr = (params as any).dateFilterString
            if (dateStr.includes('-')) {
                // 格式: "2024-01"
                const [year, month] = dateStr.split('-')
                const startDate = `${year}-${month}-01`
                // 获取当月最后一天
                const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
                const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
                filters.push(`date>="${startDate}"&&date<="${endDate}"`)
            } else if (dateStr.length === 4) {
                // 格式: "2024"
                filters.push(`date>="${dateStr}-01-01"&&date<="${dateStr}-12-31"`)
            }
        }

        // 构建请求参数，只在有过滤条件时才添加 filter
        // 列表页不返回 content（正文），详情页单独请求，大幅减少数据量
        const requestOptions: any = {
            sort: '-date',
            expand: 'category',
            fields: 'id,date,title,weather,category,temperature,temperature_outside,is_public,is_markdown,expand'
        }

        if (filters.length > 0) {
            requestOptions.filter = filters.join('&&')
        }

        return await pb.collection('diaries').getList(page, perPage, requestOptions)
    },

    /**
     * 仅获取标题列表（用于侧边栏）
     */
    async listTitleOnly(params: DiarySearchParams): Promise<ListResult<RecordModel>> {
        const page = params.page || 1
        const perPage = params.perPage || 50

        const filters: string[] = []

        if (params.category) {
            filters.push(`category.name_en="${params.category}"`)
        }

        if (params.year) {
            const startDate = `${params.year}-01-01`
            const endDate = `${params.year}-12-31`
            filters.push(`date>="${startDate}"&&date<="${endDate}"`)
        }

        return await pb.collection('diaries').getList(page, perPage, {
            filter: filters.join('&&'),
            sort: '-date',
            fields: 'id,title,date,category',
            expand: 'category'
        })
    },

    /**
     * 根据 name_en 获取 category ID
     */
    async getCategoryIdByNameEn(nameEn: string): Promise<string | null> {
        try {
            const record = await pb.collection('categories').getFirstListItem(`name_en = "${nameEn}"`)
            return record?.id || null
        } catch {
            return null
        }
    },

    /**
     * 创建日记 - 兼容原有前端格式
     */
    async add(data: any): Promise<{ success: boolean; data?: any; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) throw new Error('未登录')

            // 处理 category: 如果传入的是 name_en，转换为实际 ID
            let categoryId = data.category
            if (categoryId && typeof categoryId === 'string' && categoryId.length < 15) {
                // 可能是 name_en，需要查找实际 ID
                const foundId = await this.getCategoryIdByNameEn(categoryId)
                if (foundId) {
                    categoryId = foundId
                }
            }

            // 不要传入 id 字段，让 PocketBase 自动生成
            const createData: any = {
                date: data.date,
                title: data.title,
                content: data.content || '',
                weather: data.weather || 'sunny',
                is_public: data.is_public ? true : false,
                is_markdown: data.is_markdown ? true : false,
                user: userId
            }

            // 只有有效的 category ID 才添加
            if (categoryId && categoryId.length >= 15) {
                createData.category = categoryId
            }

            // 处理温度（-273 表示未设置）
            if (data.temperature !== undefined && data.temperature !== -273) {
                createData.temperature = data.temperature
            }
            if (data.temperature_outside !== undefined && data.temperature_outside !== -273) {
                createData.temperature_outside = data.temperature_outside
            }

            const record = await pb.collection('diaries').create(createData, {
                expand: 'category'
            })

            return {
                success: true,
                data: record,
                message: '创建成功'
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || '创建失败'
            }
        }
    },

    /**
     * 更新日记 - 兼容原有前端格式
     */
    async modify(data: any): Promise<{ success: boolean; data: any; message: string }> {
        try {
            if (!data.id) throw new Error('日记 ID 不能为空')

            // 处理 category
            let categoryId = data.category
            if (categoryId && typeof categoryId === 'string' && categoryId.length < 15) {
                const foundId = await this.getCategoryIdByNameEn(categoryId)
                if (foundId) {
                    categoryId = foundId
                }
            }

            const updateData: any = {
                date: data.date,
                title: data.title,
                content: data.content || '',
                weather: data.weather,
                is_public: data.is_public ? true : false,
                is_markdown: data.is_markdown ? true : false
            }

            if (categoryId && categoryId.length >= 15) {
                updateData.category = categoryId
            }

            if (data.temperature !== undefined && data.temperature !== -273) {
                updateData.temperature = data.temperature
            }
            if (data.temperature_outside !== undefined && data.temperature_outside !== -273) {
                updateData.temperature_outside = data.temperature_outside
            }

            const record = await pb.collection('diaries').update(data.id, updateData, {
                expand: 'category'
            })

            return {
                success: true,
                data: record,
                message: '更新成功'
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || '更新失败'
            }
        }
    },

    /**
     * 删除日记
     */
    async delete(data: { diaryId: string }): Promise<boolean> {
        await pb.collection('diaries').delete(data.diaryId)
        return true
    },

    /**
     * 获取日记详情
     */
    async detail(params: { diaryId: string }): Promise<RecordModel> {
        return await pb.collection('diaries').getOne(params.diaryId, {
            expand: 'category,user'
        })
    },

    /**
     * 获取公开分享的日记
     */
    async share(params: { diaryId: string }): Promise<RecordModel> {
        return await pb.collection('diaries').getOne(params.diaryId, {
            expand: 'category'
        })
    },

    /**
     * 搜索日记
     */
    async search(keyword: string): Promise<RecordModel[]> {
        const result = await pb.collection('diaries').getList(1, 50, {
            filter: `title~"${keyword}"||content~"${keyword}"`,
            sort: '-date'
        })
        return result.items
    },

    /**
     * 导出所有日记
     */
    async export(): Promise<RecordModel[]> {
        return await pb.collection('diaries').getFullList({
            sort: '-date',
            expand: 'category'
        })
    },

    /**
     * 清空所有日记（危险操作）
     */
    async clear(): Promise<void> {
        const userId = pb.authStore.record?.id
        if (!userId) throw new Error('未登录')

        const diaries = await pb.collection('diaries').getFullList({
            filter: `user="${userId}"`
        })

        for (const diary of diaries) {
            await pb.collection('diaries').delete(diary.id)
        }
    }
}
