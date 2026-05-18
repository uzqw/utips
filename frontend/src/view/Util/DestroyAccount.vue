<template>
    <div class="body-login-bg" :style="`min-height: ${uiStore.insets.windowsHeight}px`">
        <transition
            enter-active-class="animated-fast fadeIn"
            leave-active-class="animated-fast faceOut"
        >
            <div class="body-login" v-if="show">
                <!--APP-->
                <div id="reg">
                    <div class="logo-wrapper">
                        <div class="logo">
                            <img v-if="userInfo.avatar" :src="userInfo.avatar + '-' + projectConfig.QiniuStyleSuffix || LogoIcons.logo_rounded" alt="Avatar">
                            <img v-else :src="LogoIcons.logo_avatar" alt="Avatar">
                        </div>
                        <div class="desc">
                            <p>{{ $tt('这是你最后反悔的机会') }}</p>
                            <p>{{ $tt('该账号的所有内容都将被删除') }}</p>
                        </div>
                    </div>
                    <form id="regForm">
                        <button class="btn btn-active mt-8"
                                type="button"
                                @click.prevent="changePasswordSubmit">{{ $tt('确认注销账号') }}
                        </button>
                        <button class="btn mt-5"
                                type="button"
                                @click.prevent="router.go(-1)">{{ $tt('取消') }}
                        </button>
                    </form>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import projectConfig from "../../projectConfig.ts";
import {deleteAuthorization, removeDiaryConfig, getAuthorization, popMessage} from "../../utility.ts";
import {onMounted, ref} from "vue";
import { useUIStore } from "@/stores/ui";
const uiStore = useUIStore();
import {useRouter} from "vue-router";
import LogoIcons from "@/assets/icons/LogoIcons";

const show = ref(false)
const userInfo = getAuthorization()

onMounted(()=>{
    show.value = true
    document.title = 'utips' // 固定浏览器标签标题
})

function changePasswordSubmit() {
    userApi
        .destroyAccount()
        .then(res => {
            deleteAuthorization()
            removeDiaryConfig()
            popMessage('success', '注销成功，3 秒后跳转到登录页面', ()=>{
                router.push({name: 'Login'})
            }, 3)
        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{
            }, 3)
        })
}
</script>
