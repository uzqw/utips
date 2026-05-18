type RuntimeProjectConfig = {
    adminEmail?: string
    icpBeianNumber?: string
    registrationInvitationRequired?: boolean
    isShowDemoAccount?: boolean
    demoAccount?: string
    demoAccountPassword?: string
}

const runtimeConfig = ((globalThis as any).__UTIPS_CONFIG__ || {}) as RuntimeProjectConfig

function configString(key: keyof RuntimeProjectConfig, fallback = '') {
    return runtimeConfig[key] as string || fallback
}

function configBoolean(key: keyof RuntimeProjectConfig, fallback = false) {
    return typeof runtimeConfig[key] === 'boolean' ? runtimeConfig[key] as boolean : fallback
}

export default {
    adminEmail: configString('adminEmail'),
    icpBeianNumber: configString('icpBeianNumber'),
    registrationInvitationRequired: configBoolean('registrationInvitationRequired'),
    isShowDemoAccount: configBoolean('isShowDemoAccount', true),

    // Demo account shown on the login page when enabled.
    demoAccount: configString('demoAccount', 'demo@example.com'),
    demoAccountPassword: configString('demoAccountPassword', 'demo123456'),

    // Qiniu object storage settings. Leave empty unless your deployment uses Qiniu.
    QiniuImgBaseURL: '',
    QiniuBucketName: '',
    QiniuStyleSuffix: '',

    // QWeather API key. Leave empty to disable weather lookups.
    HefengWeatherKey: '',

    // Registration note. HTML is supported by the frontend.
    registerTip: `
            <p>This project is open source. Configure this message for your own deployment.</p>
        `
}
