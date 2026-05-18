<template>
    <MenuPanelContainer>
        <div class="about">
            <div class="logo">
                <img :src="LogoIcons.logo_rounded" alt="LOGO">
            </div>
            <h3 class="title">{{packageInfo.nameZh}}</h3>
            <h4 class="subtitle">{{ $tt(packageInfo.description) }}</h4>
            <div class="version">v{{packageInfo.version}}</div>
            <div class="author">
                <a href="https://github.com/uzqw/utips" class="social-link" target="_blank" rel="noreferrer">{{ $tt('本项目') }}</a>
                <a>·</a>
                <a href="https://github.com/KyleBing/diary" class="social-link">{{ $tt('上游项目') }}</a>
                <a>·</a>
                <a href="">{{packageInfo.dateInit}} ~ {{packageInfo.dateModify}}</a>
            </div>
        </div>
    </MenuPanelContainer>
</template>

<script lang="ts" setup>

import packageInfo from "../../../package.json"
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import LogoIcons from "@/assets/icons/LogoIcons";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
const uiStore = useUIStore(); const categoryStore = useCategoryStore()

</script>

<style lang="scss" scoped>
@import "../../scss/plugin";

.about{
    position: relative;
    height: 100%;
    text-align: center;
    color: $bg-light;
    padding-top: 40px;
    .logo{
        margin-bottom: 20px;
        display: flex;
        justify-content: center;
        img{
            display: block;
            width: 80px;
        }
    }
    .title{
        font-size: $fz-title;
        font-weight: bold;
        line-height: 1.5;
        color: white;
    }
    .subtitle{
        font-size: $fz-label;
        font-weight: 300;
        color: $text-about-subtitle;
    }
    .version{
        line-height: 1.5;
        color: white;
        margin-top: 20px;
        font-size: $fz-list-content;
    }
    .author{
        width: 100%;
        position: absolute;
        bottom: 60px;
        a{
            display: block;
            line-height: 20px;
            font-size: $fz-note;
            height: 20px;
            &:link,&:hover,&:active,&:visited{
                color: $text-about-subtitle;
            }
        }
    }
}
</style>
