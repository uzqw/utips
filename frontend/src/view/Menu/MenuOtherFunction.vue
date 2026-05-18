<template>
   <MenuPanelContainer>
       <div class="menu-section">
           <div class="menu-section-title">{{ t('settings.language') }}</div>
           <div class="menu-section-subtitle">{{ t('settings.languageSubtitle') }}</div>
           <div class="menu-section-content">
               <div class="btn-list">
                   <button
                       type="button"
                       :class="['btn', 'btn-active', 'language-btn', {active: locale === 'zh-CN'}]"
                       @click="switchLocale('zh-CN')">
                       {{ t('settings.chinese') }}
                   </button>
                   <button
                       type="button"
                       :class="['btn', 'btn-active', 'language-btn', {active: locale === 'en-US'}]"
                       @click="switchLocale('en-US')">
                       {{ t('settings.english') }}
                   </button>
               </div>
           </div>
       </div>
       <div class="menu-section">
           <div class="menu-section-title">{{ t('settings.password') }}</div>
           <div class="menu-section-subtitle"></div>
           <div class="menu-section-content">
               <div class="btn-list">
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">{{ t('settings.changePassword') }}</div>
                   <!--                   <div class="btn btn-active" @click="goToChangePassword">{{ $tt('找回密码') }}</div>-->
               </div>

               <div class="desc">{{ t('settings.forgotPassword', { email: projectConfig.adminEmail }) }}</div>
           </div>
       </div>
       <div class="menu-section">
           <div class="menu-section-title">{{ t('settings.exportDiary') }}</div>
           <div class="menu-section-subtitle">{{ t('settings.exportDiarySubtitle') }}</div>
           <div class="menu-section-content">
               <div class="btn-list">
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">csv</div>
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">json</div>
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">txt</div>
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">sql</div>
               </div>
           </div>
           <div class="desc" v-if="isDownloadingContent">{{ t('settings.exporting') }}</div>
       </div>
       <div class="menu-section">
           <div class="menu-section-heading">
               <div>
                   <div class="menu-section-title">Google Calendar</div>
                   <div class="menu-section-subtitle">{{ t('settings.googleCalendarSubtitle') }}</div>
               </div>
               <button type="button" class="help-toggle" @click="isGoogleCalendarHelpShowed = !isGoogleCalendarHelpShowed">
                   {{ isGoogleCalendarHelpShowed ? t('settings.googleCalendarHelpHide') : t('settings.googleCalendarHelp') }}
               </button>
           </div>
           <div v-if="isGoogleCalendarHelpShowed" class="calendar-help">
               <div class="calendar-help-title">{{ t('settings.googleCalendarHelpTitle') }}</div>
               <ol>
                   <li v-for="(step, index) in googleCalendarHelpSteps" :key="index">
                       <template v-if="index === 0">
                           <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer">
                               {{ t('settings.googleCalendarLinks.api') }}
                           </a>
                       </template>
                       <template v-else-if="index === 2">
                           <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer">
                               {{ t('settings.googleCalendarLinks.serviceAccounts') }}
                           </a>
                       </template>
                       <template v-else-if="index === 7">
                           <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noreferrer">
                               {{ t('settings.googleCalendarLinks.calendarSettings') }}
                           </a>
                       </template>
                       <template v-else>{{ step }}</template>
                   </li>
               </ol>
               <div class="calendar-help-env-title">{{ t('settings.googleCalendarEnvTitle') }}</div>
               <pre><code>GOOGLE_CALENDAR_CREDENTIALS_FILE=/path/to/service-account.json
GOOGLE_CALENDAR_ID=xxx@gmail.com</code></pre>
           </div>
           <div class="menu-section-content">
               <div class="calendar-config-grid">
                   <label>
                       <span>service-account.json</span>
                       <textarea
                           id="google-calendar-credentials"
                           name="google-calendar-credentials"
                           v-model="googleCalendarCredentials"
                           :placeholder="t('settings.googleCalendarCredentialsPlaceholder')"></textarea>
                   </label>
                   <label>
                       <span>calendar-id</span>
                       <textarea
                           id="google-calendar-id"
                           name="google-calendar-id"
                           v-model="googleCalendarID"
                           :placeholder="t('settings.googleCalendarIdPlaceholder')"></textarea>
                   </label>
               </div>
               <div class="btn-list mt-3">
                   <button type="button" class="btn btn-active" @click="saveGoogleCalendarConfig">{{ t('common.saveConfig') }}</button>
                    <button
                        type="button"
                        class="btn btn-active"
                        :disabled="isTestingCalendar"
                        @click="testGoogleCalendarConfig"
                    >
                        {{ isTestingCalendar ? t('settings.googleCalendarTestingMessage') : t('settings.googleCalendarTest') }}
                    </button>
               </div>
           </div>
       </div>
        <div class="menu-section">
            <div class="menu-section-heading">
                <div>
                    <div class="menu-section-title">{{ t('settings.amapWeatherTitle') }}</div>
                    <div class="menu-section-subtitle">{{ t('settings.amapWeatherSubtitle') }}</div>
                </div>
                <button type="button" class="help-toggle" @click="isAmapWeatherHelpShowed = !isAmapWeatherHelpShowed">
                    {{ isAmapWeatherHelpShowed ? t('settings.googleCalendarHelpHide') : t('settings.googleCalendarHelp') }}
                </button>
            </div>
            <div v-if="isAmapWeatherHelpShowed" class="calendar-help">
                <div class="calendar-help-title">{{ t('settings.amapWeatherHelpTitle') }}</div>
                <ol>
                    <li v-for="(step, index) in amapWeatherHelpSteps" :key="index">
                        <template v-if="index === 0">
                            <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">
                                {{ t('settings.amapWeatherLinks.console') }}
                            </a>
                        </template>
                        <template v-else>{{ step }}</template>
                    </li>
                </ol>
                <div class="calendar-help-env-title">{{ t('settings.amapWeatherEnvTitle') }}</div>
                <pre><code>AMAP_KEY=你的高德Key
AMAP_WEATHER_CITY=440300</code></pre>
                <div class="calendar-help-env-title">{{ t('settings.amapWeatherTestTitle') }}</div>
                <pre><code>curl 'https://restapi.amap.com/v3/weather/weatherInfo?key=你的Key&amp;city=440300&amp;extensions=base&amp;output=JSON'</code></pre>
            </div>
           <div class="menu-section-content">
               <div class="calendar-config-grid">
                   <label>
                       <span>{{ t('settings.amapWeatherCityCode') }}</span>
                       <input type="text"
                              v-model="amapCity"
                              :placeholder="t('settings.amapWeatherCityCodePlaceholder')">
                   </label>
                   <label>
                       <span>{{ t('settings.amapWeatherKey') }}</span>
                       <input type="text"
                              v-model="amapKey"
                              :placeholder="t('settings.amapWeatherKeyPlaceholder')">
                   </label>
               </div>
               <div class="mt-3">
                   <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.8);">
                       <input type="checkbox" v-model="autoLoadWeather">
                       {{ t('settings.amapWeatherAutoLoad') }}
                   </label>
               </div>
               <div class="btn-list mt-3">
                   <button type="button" class="btn btn-active" @click="saveWeatherConfig">{{ t('common.saveConfig') }}</button>
                   <button
                        type="button"
                        class="btn btn-active"
                        :disabled="isTestingWeather"
                        @click="testAmapWeather"
                    >
                        {{ isTestingWeather ? t('settings.googleCalendarTestingMessage') : t('settings.amapWeatherTest') }}
                    </button>
               </div>
           </div>
       </div>
       <div class="menu-section">
           <div class="menu-section-title">{{ t('settings.goodbye') }}</div>
           <div class="menu-section-subtitle">{{ t('settings.goodbyeSubtitle') }}</div>
           <div class="menu-section-content">
               <div class="btn-list">
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">{{ t('settings.clearDiary') }}</div>
                   <div class="btn btn-disabled" @click="popFeatureUnavailable">{{ t('settings.destroyAccount') }}</div>
               </div>
           </div>
           <div class="desc" v-if="isDownloadingContent">{{ t('settings.exporting') }}</div>
       </div>
   </MenuPanelContainer>
</template>

<script lang="ts" setup>
import projectConfig from "../../projectConfig.ts";
import {computed, onMounted, ref} from "vue";
import {popMessage} from "@/utility.ts";
import userApi from "@/api/userApi.ts";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import {useI18n} from "vue-i18n";
import {persistLocale, type SupportedLocale} from "@/i18n";


const isDownloadingContent = ref(false)
const isGoogleCalendarHelpShowed = ref(false)
const isAmapWeatherHelpShowed = ref(false)
const googleCalendarCredentials = ref('')
const googleCalendarID = ref('')
const amapCity = ref('')
const amapKey = ref('')
const autoLoadWeather = ref(false)
const isTestingCalendar = ref(false)
const isTestingWeather = ref(false)
const {locale, t, tm} = useI18n()
const googleCalendarHelpSteps = computed(() => tm('settings.googleCalendarHelpSteps') as string[])
const amapWeatherHelpSteps = computed(() => tm('settings.amapWeatherHelpSteps') as string[])

onMounted(()=>{
    loadGoogleCalendarConfig()
    loadWeatherConfig()
})

function loadGoogleCalendarConfig(){
    userApi
        .getGoogleCalendarConfig()
        .then(res => {
            googleCalendarCredentials.value = res.credentials
            googleCalendarID.value = res.calendarID
        })
}

function saveGoogleCalendarConfig(){
    userApi
        .setGoogleCalendarConfig({
            credentials: googleCalendarCredentials.value,
            calendarID: googleCalendarID.value
        })
        .then(res => {
            popMessage('success', res.message, ()=>{}, 1)
        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{}, 1)
        })
}

function testGoogleCalendarConfig() {
    if (!googleCalendarCredentials.value || !googleCalendarID.value) {
        popMessage('warning', t('settings.googleCalendarEmptyFields'), ()=>{}, 2)
        return
    }
    isTestingCalendar.value = true
    userApi.testGoogleCalendarConfig({
        credentials: googleCalendarCredentials.value,
        calendarID: googleCalendarID.value
    }).then(res => {
        const successMsg = t('settings.googleCalendarTestSuccessMessage', { name: res.message })
        popMessage('success', successMsg, ()=>{}, 3)
    }).catch(err => {
        const errorMsg = err.message || 'Unknown error'
        popMessage('warning', errorMsg, ()=>{}, 3)
    }).finally(() => {
        isTestingCalendar.value = false
    })
}


function loadWeatherConfig(){
    userApi
        .getWeatherConfig()
        .then(res => {
            amapCity.value = res.amapCity
            amapKey.value = res.amapKey
            autoLoadWeather.value = res.autoLoadWeather
        })
}

function saveWeatherConfig(){
    userApi
        .setWeatherConfig({
            amapCity: amapCity.value,
            amapKey: amapKey.value,
            autoLoadWeather: autoLoadWeather.value
        })
        .then(res => {
            popMessage('success', res.message, ()=>{}, 1)
        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{}, 1)
        })
}

function testAmapWeather() {
    if (!amapCity.value || !amapKey.value) {
        popMessage('warning', t('settings.amapWeatherEmptyFields'), ()=>{}, 2)
        return
    }
    isTestingWeather.value = true
    userApi.testWeatherConfig({
        city: amapCity.value,
        key: amapKey.value
    }).then(res => {
        const live = res.live
        const successMsg = t('settings.amapWeatherTestSuccessMessage', {
            city: live.city,
            weather: live.weather,
            temp: live.temperature
        })

        // Map and save to weather cache
        let weatherDesc = live.weather
        let mappedWeather = 'sunny'
        if (weatherDesc.includes('晴')) mappedWeather = 'sunny'
        else if (weatherDesc.includes('多云')) mappedWeather = 'cloudy'
        else if (weatherDesc.includes('阴')) mappedWeather = 'overcast'
        else if (weatherDesc.includes('阵雨') || weatherDesc.includes('小雨')) mappedWeather = 'sprinkle'
        else if (weatherDesc.includes('雨')) mappedWeather = 'rain'
        else if (weatherDesc.includes('雷阵雨')) mappedWeather = 'thunderstorm'
        else if (weatherDesc.includes('雾')) mappedWeather = 'fog'
        else if (weatherDesc.includes('雪')) mappedWeather = 'snow'
        else if (weatherDesc.includes('龙卷风')) mappedWeather = 'tornado'
        else if (weatherDesc.includes('霾')) mappedWeather = 'smog'
        else if (weatherDesc.includes('沙尘暴')) mappedWeather = 'sandstorm'

        const todayStr = new Date().toISOString().split('T')[0]
        localStorage.setItem('weather_cache_date', todayStr)
        localStorage.setItem('weather_cache_data', JSON.stringify({
            temp: live.temperature,
            weather: mappedWeather
        }))

        popMessage('success', successMsg, ()=>{}, 3)
    }).catch(err => {
        const errorMsg = err.message || 'Unknown error'
        popMessage('warning', errorMsg, ()=>{}, 3)
    }).finally(() => {
        isTestingWeather.value = false
    })
}

function popFeatureUnavailable(){
    popMessage('warning', t('common.featureUnavailable'), ()=>{}, 1)
}

function switchLocale(nextLocale: SupportedLocale) {
    locale.value = nextLocale
    persistLocale(nextLocale)
}
</script>

<style scoped lang="scss">
@import "../../scss/plugin";

.calendar-config-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  label{
    display: flex;
    flex-direction: column;
    gap: 6px;
    span{
      color: $text-label;
      font-size: $fz-small;
    }
    textarea, input[type="text"]{
      border: 1px solid $color-border-light;
      border-radius: 3px;
      padding: 8px;
      font-size: $fz-small;
      line-height: 1.4;
      background-color: white;
    }
    textarea{
      min-height: 120px;
      resize: vertical;
    }
  }
}

.menu-section-heading{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.help-toggle{
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, .38);
  border-radius: 999px;
  padding: 5px 12px;
  color: white;
  background: rgba(255, 255, 255, .12);
  font: inherit;
  font-size: $fz-small;
  cursor: pointer;
  &:hover{
    background: rgba(255, 255, 255, .2);
  }
}

.calendar-help{
  margin: 12px 0 16px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 8px;
  color: rgba(255, 255, 255, .86);
  background: rgba(0, 0, 0, .12);
  font-size: $fz-small;
  line-height: 1.55;
  .calendar-help-title{
    margin-bottom: 8px;
    color: white;
    font-weight: bold;
  }
  ol{
    margin: 0;
    padding-left: 20px;
  }
  li{
    margin-bottom: 5px;
  }
  a{
    color: white;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .calendar-help-env-title{
    margin-top: 12px;
    margin-bottom: 6px;
    color: white;
    font-weight: bold;
  }
  pre{
    overflow-x: auto;
    margin: 0;
    padding: 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, .28);
  }
  code{
    font-family: "JetBrainsMonoDiary", monospace;
  }
}

.language-btn{
  border: 0;
  font: inherit;
  cursor: pointer;
  opacity: .72;
  &.active{
    opacity: 1;
    outline: 2px solid rgba(255, 255, 255, .8);
    outline-offset: 2px;
  }
}

.btn-disabled {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  cursor: not-allowed !important;
  pointer-events: auto !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.05) !important;
  }

  &:active {
    transform: none !important;
  }
}

@media (max-width: $grid-separate-width-sm) {
  .calendar-config-grid{
    grid-template-columns: 1fr;
  }
  .menu-section-heading{
    flex-direction: column;
  }
}

@media (prefers-color-scheme: dark) {
  .calendar-config-grid textarea, .calendar-config-grid input[type="text"]{
    color: $dark-text-title;
    border-color: $dark-border;
    background-color: $dark-bg;
  }
}

</style>
