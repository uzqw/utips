<template>
    <div class="bg" :style="`height: ${uiStore.insets.windowsHeight}px`">
        <div class="not-found">
            <div class="logo">
                <img :src="LogoIcons.logo_server_error" alt="logo error">
            </div>
            <h1>{{ $tt('访问的页面不存在') }}</h1>
            <h1><RouterLink to="/">{{ $tt('返回主页') }}</RouterLink></h1>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import LogoIcons from "@/assets/icons/LogoIcons";
const uiStore = useUIStore(); const categoryStore = useCategoryStore()
</script>

<style scoped lang="scss">
@import "../scss/plugin";

.bg{
    letter-spacing: 1px;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    background-color: $bg-menu;
    color: white;
}
a{
    line-height: 1.5;
    color: $color-main;
    &:hover{
        text-decoration: underline;
    }
}

.not-found{
    padding: 50px 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-flow: column nowrap;
    h1{
        font-size: $fz-main;
        font-weight: normal;
        margin-bottom: 10px;
    }
    .logo{
        img{
            display: block;
            width: 80px;
        }
    }
}
</style>
