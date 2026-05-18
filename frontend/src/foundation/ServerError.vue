<template>
    <!-- 服务器错误 -->
    <div class="server-error" :style="`height: ${uiStore.insets.windowsHeight}px`">
        <div class="logo-server-error">
            <img :src="LogoIcons.logo_server_error" alt="logo error">
        </div>
        <div class="server-error-title">{{ $tt('遇到错误，请尝试刷新页面。如问题依旧，请联系管理员') }}</div>
        <div class="server-error-title">
            <a :href="`mailto:${ projectConfig.adminEmail }`">{{ projectConfig.adminEmail }}</a>
        </div>
    </div>

</template>

<script lang="ts" setup>
import projectConfig from "../projectConfig.ts"
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import LogoIcons from "@/assets/icons/LogoIcons";
const uiStore = useUIStore(); const categoryStore = useCategoryStore()
</script>

<style scoped lang="scss">
@import "../scss/plugin";

.server-error{
    display: flex;
    justify-content: center;
    align-items: center;
    flex-flow: column nowrap;
}

.logo-server-error{
    margin-bottom: 20px;
    width: 80px;
    img{
        width: 100%;
    }
}

.server-error-title{
    text-align: center;
    font-size: 14px;
    color: #FFCC00;
    a{
        color: #FFCC00;
        font-size: 14px;
        text-decoration: underline;
    }
}



</style>
