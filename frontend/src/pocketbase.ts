/**
 * PocketBase 客户端配置
 * 替代原有的 Axios 请求封装
 */
import PocketBase from 'pocketbase'

// PocketBase 服务地址
// 开发和生产都使用 window.location.origin：
// - 开发时请求走 Vite proxy（vite.config.ts 中配置了 /api -> 0.0.0.0:17171）
// - 生产时走 Nginx 反代
const PB_URL = window.location.origin

// 创建 PocketBase 实例
export const pb = new PocketBase(PB_URL)

// 自动从 localStorage 恢复认证状态
pb.autoCancellation(false)

// 监听认证状态变化
pb.authStore.onChange((token, record) => {
    console.log('Auth state changed:', record?.email || 'logged out')
})

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
    return pb.authStore.isValid
}

/**
 * 获取当前用户
 */
export function getCurrentUser() {
    return pb.authStore.record
}

/**
 * 获取认证 Token
 */
export function getToken(): string {
    return pb.authStore.token
}

/**
 * 登出
 */
export function logout() {
    pb.authStore.clear()
}

// 为了兼容性，保留原有的请求封装方式的导出
export default pb
