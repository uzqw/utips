<template>
    <div class="body-login-bg" :style="`min-height: ${uiStore.insets.windowsHeight}px`">
        <transition
            enter-active-class="animated-fast fadeIn"
            leave-active-class="animated-fast faceOut"
        >
            <div class="body-login">
                <div class="logo-wrapper">
                    <div class="logo">
                        <img :src="LogoIcons.logo_change_password" alt="Diary Logo">
                    </div>
                    <div class="project-name">{{ $tt('找回密码') }}</div>
                </div>
                <RegisterTip :html-content="fetchPasswordTip"/>
                <div :class="['footer', 'center']">
                    <RouterLink to="/login">{{ $tt('登录') }}</RouterLink>
                </div>
            </div>
        </transition>
    </div>
</template>


<script lang="ts" setup>
import RegisterTip from "./RegisterTip.vue";

import { useUIStore } from "@/stores/ui";
const uiStore = useUIStore();
import LogoIcons from "@/assets/icons/LogoIcons";
import projectConfig from "../../projectConfig.ts"
import {translateText} from "@/i18n/text";

const fetchPasswordTip =  `
            <h3>${translateText('如果你忘记密码')}</h3>
            <p>${translateText('请使用注册邮件发送邮件到')} <a href="mailto:${projectConfig.adminEmail}">${projectConfig.adminEmail || translateText('管理员邮箱未配置')}</a>${translateText('，注明来意，管理员将为你重置密码')}</p>
            <p>${translateText('之后用重置的密码登录，再修改密码即可。')}</p>
        `

</script>
