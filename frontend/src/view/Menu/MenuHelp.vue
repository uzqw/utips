<template>
    <MenuPanelContainer>
        <div class="menu-section">
            <div class="menu-section-title">{{ t('help.title') }}</div>
            <div class="menu-section-subtitle">{{ t('help.subtitle') }}</div>
            
            <div class="help-card mt-3">
                <div class="help-card-title">{{ t('help.quickStartTitle') }}</div>
                <ul class="help-steps">
                    <li>{{ t('help.step1') }}</li>
                    <li>
                        {{ t('help.step2') }}
                        <div class="code-block mt-2">
                            <code>{{ t('help.step2_eg1') }}</code>
                            <code>{{ t('help.step2_eg2') }}</code>
                            <code>{{ t('help.step2_eg3') }}</code>
                        </div>
                    </li>
                    <li>{{ t('help.step3') }}</li>
                </ul>
            </div>

            <div class="menu-section-content mt-4">
                <div class="btn-list">
                    <button
                        type="button"
                        class="btn btn-active w-100"
                        :disabled="isGenerating"
                        @click="generateMockData"
                    >
                        {{ isGenerating ? t('help.generating') : t('help.btnGenerate') }}
                    </button>
                </div>
            </div>
        </div>
    </MenuPanelContainer>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import diaryApi from "@/api/diaryApi.ts";
import { popMessage } from "@/utility.ts";
import { useDiaryStore } from "@/stores/diary";
import { useUIStore } from "@/stores/ui";

const { t, locale } = useI18n();
const isGenerating = ref(false);
const diaryStore = useDiaryStore();
const uiStore = useUIStore();

async function generateMockData() {
    isGenerating.value = true;
    try {
        const title = locale.value === 'zh-CN' ? '账单测试数据' : 'Bookkeeping Mock Data';
        const content = locale.value === 'zh-CN' ? 
`早餐 -15.5
午餐 -35.2
晚餐 -42
超市-零食 -58.4
水果-苹果 -12
工资 +9800` : 
`Breakfast -12.50
Lunch -24.80
Dinner -32.00
Supermarket-Snacks -45.60
Fruit-Apples -8.50
Salary +8500`;

        const res = await diaryApi.add({
            title,
            content,
            category: 'bill',
            weather: 'sunny',
            is_public: false,
            is_markdown: false,
            date: new Date().toISOString()
        });

        if (res.success) {
            popMessage('success', t('help.generateSuccess'), () => {}, 2);
            diaryStore.isListNeedBeReload = true;
            // Close the menu bar
            uiStore.isMenuShowed = false;
        } else {
            popMessage('warning', t('help.generateFail', { error: res.message }), () => {}, 3);
        }
    } catch (err: any) {
        popMessage('warning', t('help.generateFail', { error: err.message || 'Unknown error' }), () => {}, 3);
    } finally {
        isGenerating.value = false;
    }
}
</script>

<style scoped lang="scss">
@import "../../scss/plugin";

.help-card {
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(4px);
    
    .help-card-title {
        font-size: 14px;
        font-weight: bold;
        color: white;
        margin-bottom: 12px;
        border-left: 3px solid rgba(255, 255, 255, 0.7);
        padding-left: 8px;
        line-height: 1;
    }
}

.help-steps {
    margin: 0;
    padding-left: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    li {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.5;
    }
}

.code-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    
    code {
        font-family: "JetBrainsMonoDiary", monospace;
        font-size: 12px;
        color: #ff9d00;
        line-height: 1.4;
    }
}

.w-100 {
    width: 100% !important;
}

.btn-list {
    display: block !important;
    
    .btn {
        width: 100% !important;
        white-space: normal !important;
        word-break: break-word !important;
        height: auto !important;
        min-height: 40px !important;
        padding: 10px 16px !important;
        line-height: 1.4 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        box-sizing: border-box !important;
    }
}
</style>
