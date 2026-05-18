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
                            <p>{{ $tt('你的所有日记都将被删除') }}</p>
                            <p class="mt-2">{{ $tt('总计') }} <b>{{ categoryStore.statisticsCategory.amount }}</b> {{ $tt('篇，共享日记') }} <b>{{ categoryStore.statisticsCategory.shared }}</b> {{ $tt('篇') }}</p>
                            <p></p>
                        </div>
                    </div>
                    <form id="regForm">
                        <button class="btn btn-active mt-8"
                                type="button"
                                @click.prevent="changePasswordSubmit">{{ $tt('确认清空所有日记') }}
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
import diaryApi from "../../api/diaryApi.ts";
import projectConfig from "../../projectConfig.ts";
import {getAuthorization, popMessage} from "../../utility.ts";
import {onMounted, ref} from "vue";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import {useRouter} from "vue-router";
import LogoIcons from "@/assets/icons/LogoIcons";

const uiStore = useUIStore(); const categoryStore = useCategoryStore()
const router = useRouter()

const show = ref(false)
const userInfo = getAuthorization()

onMounted(()=>{
    show.value = true
    document.title = 'utips' // 固定浏览器标签标题
})

function changePasswordSubmit() {
    diaryApi
        .clear()
        .then(res => {
            popMessage('success', res.message, ()=>{
                router.push({name: 'List'})
            }, 2)
        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{
            }, 3)
        })
}
</script>
