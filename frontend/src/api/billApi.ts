/**
 * 账单 API - 使用 PocketBase SDK
 * 账单数据从日记的 bill 分类中提取
 */
import { pb } from '../pocketbase'
import { EntityBillMonth, EntityBillDay, EntityBillItem, EntityBillFood, EntityBillTop5Item } from '../view/Bill/Bill'

/**
 * 解析账单内容，提取金额
 * 格式示例：
 * 超市-鱼肝油 -36.08
 * 晚餐-肉沫茄子 -44
 */
function parseBillContent(content: string): EntityBillItem[] {
    const lines = content.split('\n').filter(line => line.trim())
    const items: EntityBillItem[] = []

    for (const line of lines) {
        // 匹配 "描述 金额" 格式，金额可能带正负号
        const match = line.match(/(.+?)\s+([+-]?\d+(?:\.\d+)?)\s*$/)
        if (match) {
            items.push({
                item: match[1].trim(),
                price: parseFloat(match[2])
            })
        }
    }

    return items
}

/**
 * 计算食物相关支出
 */
function calculateFood(items: EntityBillItem[]): EntityBillFood {
    const food: EntityBillFood = {
        breakfast: 0,
        launch: 0,
        dinner: 0,
        supermarket: 0,
        fruit: 0,
        sum: 0
    }

    for (const item of items) {
        const name = item.item.toLowerCase()
        if (name.includes('早餐') || name.includes('早饭') || name.includes('breakfast')) {
            food.breakfast += Math.abs(item.price)
        } else if (name.includes('午餐') || name.includes('午饭') || name.includes('中餐') || name.includes('中饭') || name.includes('lunch')) {
            food.launch += Math.abs(item.price)
        } else if (name.includes('晚餐') || name.includes('晚饭') || name.includes('dinner')) {
            food.dinner += Math.abs(item.price)
        } else if (name.includes('超市') || name.includes('supermarket') || name.includes('grocery') || name.includes('groceries')) {
            food.supermarket += Math.abs(item.price)
        } else if (name.includes('水果') || name.includes('fruit') || name.includes('fruits')) {
            food.fruit += Math.abs(item.price)
        }
    }

    food.sum = food.breakfast + food.launch + food.dinner + food.supermarket + food.fruit
    return food
}

/**
 * 计算 Top5
 */
function calculateTop5(items: EntityBillItem[], isIncome: boolean): EntityBillTop5Item[] {
    const filtered = items
        .filter(item => isIncome ? item.price > 0 : item.price < 0)
        .map(item => ({ ...item, price: Math.abs(item.price) }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 5)

    return filtered
}

export default {
    /**
     * 获取排序后的账单列表
     * 返回格式匹配前端 EntityBillMonth[]
     */
    async sorted(params: { years?: string; keyword?: string }): Promise<{
        success: boolean
        data: EntityBillMonth[]
        message: string
    }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: [], message: '未登录' }
            }

            // 获取 bill 分类
            const billCategory = await pb.collection('categories').getFirstListItem('name_en="bill"')

            // 构建过滤条件
            const filters = [`user="${userId}"`, `category="${billCategory.id}"`]

            if (params.years) {
                const years = params.years.split(',')
                const yearFilters = years.map(y => `date>="${y}-01-01"&&date<="${y}-12-31"`)
                filters.push(`(${yearFilters.join('||')})`)
            }

            if (params.keyword) {
                filters.push(`(title~"${params.keyword}"||content~"${params.keyword}")`)
            }

            const diaries = await pb.collection('diaries').getFullList({
                filter: filters.join('&&'),
                sort: '-date'
            })

            // 按年月分组，再按日分组
            const monthMap = new Map<string, {
                year: number
                month: number
                dayMap: Map<string, { date: string; items: EntityBillItem[] }>
            }>()

            let monthIdCounter = 1

            for (const diary of diaries) {
                const date = new Date(diary.date)
                const year = date.getFullYear()
                const month = date.getMonth() + 1
                const monthKey = `${year}-${String(month).padStart(2, '0')}`
                const dayKey = diary.date.split(' ')[0] // 获取日期部分 YYYY-MM-DD

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, {
                        year,
                        month,
                        dayMap: new Map()
                    })
                }

                const monthData = monthMap.get(monthKey)!

                if (!monthData.dayMap.has(dayKey)) {
                    monthData.dayMap.set(dayKey, {
                        date: dayKey,
                        items: []
                    })
                }

                const dayData = monthData.dayMap.get(dayKey)!
                const billItems = parseBillContent(diary.content || '')
                dayData.items.push(...billItems)
            }

            // 转换为 EntityBillMonth[] 格式
            const result: EntityBillMonth[] = []

            for (const [monthKey, monthData] of monthMap) {
                const allMonthItems: EntityBillItem[] = []
                const days: EntityBillDay[] = []
                let dayIdCounter = 1

                // 按日期排序（降序）
                const sortedDays = Array.from(monthData.dayMap.entries())
                    .sort((a, b) => b[0].localeCompare(a[0]))

                for (const [_, dayData] of sortedDays) {
                    const dayItems = dayData.items
                    allMonthItems.push(...dayItems)

                    const sumIncome = dayItems.filter(i => i.price > 0).reduce((sum, i) => sum + i.price, 0)
                    const sumOutput = Math.abs(dayItems.filter(i => i.price < 0).reduce((sum, i) => sum + i.price, 0))

                    days.push({
                        id: dayIdCounter++,
                        date: dayData.date,
                        sum: sumIncome - sumOutput,
                        sumIncome,
                        sumOutput,
                        items: dayItems
                    })
                }

                const monthSumIncome = allMonthItems.filter(i => i.price > 0).reduce((sum, i) => sum + i.price, 0)
                const monthSumOutput = Math.abs(allMonthItems.filter(i => i.price < 0).reduce((sum, i) => sum + i.price, 0))

                result.push({
                    id: monthIdCounter++,
                    month: monthKey,
                    month_id: monthKey,
                    days,
                    food: calculateFood(allMonthItems),
                    sum: monthSumIncome - monthSumOutput,
                    sumIncome: monthSumIncome,
                    sumOutput: monthSumOutput,
                    incomeTop5: calculateTop5(allMonthItems, true),
                    outcomeTop5: calculateTop5(allMonthItems, false)
                })
            }

            // 按月份排序（降序）
            result.sort((a, b) => b.month.localeCompare(a.month))

            return { success: true, data: result, message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    },

    /**
     * 获取可用的年份列表
     */
    async keys(): Promise<{ success: boolean; data: number[]; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: [], message: '未登录' }
            }

            const billCategory = await pb.collection('categories').getFirstListItem('name_en="bill"')

            const diaries = await pb.collection('diaries').getFullList({
                filter: `user="${userId}"&&category="${billCategory.id}"`,
                fields: 'date',
                sort: '-date'
            })

            const years = new Set<number>()
            for (const diary of diaries) {
                years.add(new Date(diary.date).getFullYear())
            }

            return { success: true, data: Array.from(years).sort((a, b) => b - a), message: '' }
        } catch (error: any) {
            return { success: false, data: [], message: error.message }
        }
    },

    /**
     * 获取借款列表（从特定格式的日记中提取）
     */
    async getBorrowList(): Promise<{ success: boolean; data: string; message: string }> {
        try {
            const userId = pb.authStore.record?.id
            if (!userId) {
                return { success: false, data: '', message: '未登录' }
            }

            // 搜索包含"借"字或英文借贷相关词汇的账单日记
            const billCategory = await pb.collection('categories').getFirstListItem('name_en="bill"')

            const diaries = await pb.collection('diaries').getFullList({
                filter: `user="${userId}"&&category="${billCategory.id}"&&(content~"借"||content~"borrow"||content~"lend"||content~"loan")`,
                sort: '-date'
            })

            // 合并所有借款相关内容
            const borrowContent = diaries
                .map(d => d.content || '')
                .join('\n\n')

            return { success: true, data: borrowContent, message: '' }
        } catch (error: any) {
            return { success: false, data: '', message: error.message }
        }
    }
}