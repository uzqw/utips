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
                            <img :src="LogoIcons.logo_change_password" alt="Diary Logo">
                        </div>
                        <div class="project-name">{{ $tt('修改密码') }}</div>
                    </div>
                    <form id="regForm">
                        <div class="input-group">
                            <label for="password1">{{ $tt('新密码') }}</label>
                            <input v-model.lazy="password1" name="password1" type="password" id="password1">
                        </div>
                        <div class="input-group">
                            <label for="password2" :class="{red: (passwordVerified || password2.length < 1)}">{{ translateText(labelCheckPassword) }}</label>
                            <input v-model="password2" type="password" name="password2" id="password2" class="focused">
                        </div>

                        <button class="btn mt-8"
                                :class="passwordVerified ? 'btn-active' : 'btn-inactive'"
                                type="button"
                            @click.prevent="changePasswordSubmit">{{ $tt('确定修改') }}
                        </button>
                    </form>
                    <div class="footer">
                        <RouterLink to="/" class="left">{{ $tt('返回') }}</RouterLink>
                        <RouterLink to="/login" class="right">{{ $tt('登录') }}</RouterLink>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import userApi from "../../api/userApi.ts"

import {deleteAuthorization, popMessage} from "../../utility.ts";
import { useUIStore } from "@/stores/ui";
const uiStore = useUIStore();
import {computed, onMounted, ref, watch} from "vue";
import {useRouter} from "vue-router";
import LogoIcons from "@/assets/icons/LogoIcons";
import {translateText} from "@/i18n/text";

const router = useRouter()


const show = ref(false)
const labelCheckPassword = ref("再次确认密码")
const password1 = ref("")
const password2 = ref("")

onMounted(()=>{
    show.value = true
    document.title = 'utips' // 固定浏览器标签标题
})


function changePasswordSubmit() {
    if (passwordVerified) {
        let requestData = {
            password: password1.value,
        }
        userApi
            .changePassword(requestData)
            .then(res => {
                popMessage('success', `${res.message}，正在前往登录`, () => {
                    deleteAuthorization()
                    router.go(-1)
                }, 2)
            })
            .catch(err => {
                popMessage('danger', err.message, () => {}, 3)
            })
    }
}

watch(password2, () => {
    if (passwordVerified.value) {
        labelCheckPassword.value = "再次确认密码"
    } else {
        labelCheckPassword.value = "两次密码不一致"
    }
})

const passwordVerified  = computed(()=>{
    return (password1.value.length > 0 && password1.value === password2.value)
})
</script>
