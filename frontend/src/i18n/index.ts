import { createI18n } from 'vue-i18n'

import enUS from './messages/en-US'
import zhCN from './messages/zh-CN'

export const supportedLocales = ['zh-CN', 'en-US'] as const
export type SupportedLocale = typeof supportedLocales[number]

const localeStorageKey = 'utips-locale'
const fallbackLocale: SupportedLocale = 'zh-CN'

function isSupportedLocale(locale: string | null): locale is SupportedLocale {
    return supportedLocales.includes(locale as SupportedLocale)
}

function getInitialLocale(): SupportedLocale {
    const savedLocale = window.localStorage.getItem(localeStorageKey)
    if (isSupportedLocale(savedLocale)) {
        return savedLocale
    }

    const browserLocale = window.navigator.language
    return browserLocale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: getInitialLocale(),
    fallbackLocale,
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
    },
})

export function persistLocale(locale: SupportedLocale) {
    window.localStorage.setItem(localeStorageKey, locale)
    document.documentElement.lang = locale
}

persistLocale(i18n.global.locale.value as SupportedLocale)
