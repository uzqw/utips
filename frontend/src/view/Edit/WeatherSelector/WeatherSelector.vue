<template>
    <div class="weather-selector">
        <div class="weather" @click="chooseWeather(item.value)" v-for="item in WeatherArray" :key="item.value">
            <img
                :src="weatherSelected === item.value?
                        WeatherIcons[item.value + '_active'] :
                        WeatherIcons[item.value]"
                :alt="item.label"
                :title="item.label">
        </div>
    </div>
</template>

<script lang="ts" setup>
import WeatherIcons from "../../../assets/icons/WeatherIcons";
import {ref, watch} from "vue";
import {WeatherArray} from "@/types/Weather.ts";

const emit = defineEmits(['change'])
const props = defineProps({
    weather: {
        type: String,
        default: 'sunny'
    }
})

const weatherSelected = ref(props.weather)

watch(() => props.weather, () => {
    weatherSelected.value = props.weather
})
watch(weatherSelected, () => {
    emit('change', weatherSelected.value)
})


function chooseWeather(weatherName: string) {
    weatherSelected.value = weatherName
}
</script>

<style lang="scss" scoped>
@import "./weather-selector";
</style>
