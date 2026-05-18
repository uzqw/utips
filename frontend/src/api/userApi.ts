/**
 * 用户 API - 使用 PocketBase SDK
 * 兼容原有前端接口格式
 */
import { pb } from '../pocketbase'
import type { RecordModel } from 'pocketbase'

export interface UserRegisterEntity {
    email: string
    password: string
    nickname?: string
    invitationCode?: string
}

export default {
    /**
     * 用户登录 - 兼容原有前端格式
     */
    async login(data: { email: string; password: string }): Promise<{
        success: boolean
        message: string
        data: {
            nickname: string
            uid: string
            email: string
            phone: string
            avatar: string
            password: string  // 实际是 token
            group_id: number
            city: string
            geolocation: string
        }
    }> {
        try {
            const authData = await pb.collection('users').authWithPassword(data.email, data.password)
            const record = authData.record

            return {
                success: true,
                message: '登录成功',
                data: {
                    nickname: record.name || record.email?.split('@')[0] || '',
                    uid: record.id,
                    email: record.email || '',
                    phone: record.phone || '',
                    avatar: record.avatar ? pb.files.getURL(record, record.avatar) : '',
                    password: authData.token,  // 用 token 替代
                    group_id: 2,
                    city: record.city || '',
                    geolocation: record.geolocation || ''
                }
            }
        } catch (error: any) {
            throw {
                success: false,
                message: error.message || '登录失败'
            }
        }
    },

    /**
     * 用户注册 - 兼容原有前端格式
     */
    async register(data: UserRegisterEntity): Promise<{
        success: boolean
        message: string
        data?: RecordModel
    }> {
        try {
            const record = await pb.collection('users').create({
                email: data.email,
                invitationCode: data.invitationCode,
                password: data.password,
                passwordConfirm: data.password,  // 自动填充 passwordConfirm
                name: data.nickname || data.email.split('@')[0]  // 使用 name 字段
            })

            // 注册后自动登录
            await pb.collection('users').authWithPassword(data.email, data.password)

            return {
                success: true,
                message: '注册成功',
                data: record
            }
        } catch (error: any) {
            throw {
                success: false,
                message: error.message || '注册失败'
            }
        }
    },

    /**
     * 修改密码
     */
    async changePassword(data: { password: string }): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            await pb.collection('users').update(userId, {
                password: data.password,
                passwordConfirm: data.password
            })
            return { success: true, message: '密码修改成功' }
        } catch (error: any) {
            throw { success: false, message: error.message || '密码修改失败' }
        }
    },

    /**
     * 更新用户资料
     */
    async setProfile(data: { nickname?: string; city?: string; phone?: string }): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            await pb.collection('users').update(userId, {
                name: data.nickname,
                city: data.city,
                phone: data.phone
            })
            return { success: true, message: '资料更新成功' }
        } catch (error: any) {
            throw { success: false, message: error.message || '资料更新失败' }
        }
    },

    async getGoogleCalendarConfig(): Promise<{ credentials: string; calendarID: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        const record = await pb.collection('users').getOne(userId, {
            fields: 'googleCalendarCredentials,googleCalendarID'
        })

        return {
            credentials: record.googleCalendarCredentials || '',
            calendarID: record.googleCalendarID || ''
        }
    },

    async setGoogleCalendarConfig(data: { credentials: string; calendarID: string }): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            await pb.collection('users').update(userId, {
                googleCalendarCredentials: data.credentials,
                googleCalendarID: data.calendarID
            })
            return { success: true, message: 'Google Calendar 配置已保存' }
        } catch (error: any) {
            throw { success: false, message: error.message || 'Google Calendar 配置保存失败' }
        }
    },


    async testGoogleCalendarConfig(data: { credentials: string; calendarID: string }): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            const res = await pb.send('/api/google_calendar/test', {
                method: 'POST',
                body: {
                    credentials: data.credentials,
                    calendarID: data.calendarID
                }
            })
            return { success: true, message: res.message || '测试成功' }
        } catch (error: any) {
            throw { success: false, message: error.data?.message || error.message || '测试失败' }
        }
    },

    async testWeatherConfig(data: { city: string; key: string }): Promise<{ success: boolean; message: string; live: any }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            const res = await pb.send('/api/weather/test', {
                method: 'POST',
                body: {
                    city: data.city,
                    key: data.key
                }
            })
            return { success: true, message: res.message || '测试成功', live: res.live }
        } catch (error: any) {
            throw { success: false, message: error.data?.message || error.message || '测试失败' }
        }
    },

    async getWeatherConfig(): Promise<{ amapCity: string; amapKey: string; autoLoadWeather: boolean }> {

        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        const record = await pb.collection('users').getOne(userId, {
            fields: 'amapCity,amapKey,autoLoadWeather'
        })

        return {
            amapCity: record.amapCity || '',
            amapKey: record.amapKey || '',
            autoLoadWeather: !!record.autoLoadWeather
        }
    },

    async setWeatherConfig(data: { amapCity: string; amapKey: string; autoLoadWeather: boolean }): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            await pb.collection('users').update(userId, {
                amapCity: data.amapCity,
                amapKey: data.amapKey,
                autoLoadWeather: data.autoLoadWeather
            })
            return { success: true, message: '天气配置已保存' }
        } catch (error: any) {
            throw { success: false, message: error.message || '天气配置保存失败' }
        }
    },


    /**
     * 注销账户
     */
    async destroyAccount(): Promise<{ success: boolean; message: string }> {
        const userId = pb.authStore.record?.id
        if (!userId) throw { success: false, message: '未登录' }

        try {
            await pb.collection('users').delete(userId)
            pb.authStore.clear()
            return { success: true, message: '账户已注销' }
        } catch (error: any) {
            throw { success: false, message: error.message || '注销失败' }
        }
    },

    /**
     * 获取头像 - 兼容原有格式
     */
    async getAvatar(params: { email: string }): Promise<{ success: boolean; data: { avatar: string } | null }> {
        try {
            // PocketBase 不支持通过 email 搜索未认证用户，简单返回 null
            return { success: true, data: null }
        } catch {
            return { success: true, data: null }
        }
    },

    /**
     * 登出
     */
    logout(): void {
        pb.authStore.clear()
    }
}
