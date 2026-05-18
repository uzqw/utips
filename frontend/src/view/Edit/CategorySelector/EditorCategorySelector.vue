<template>
    <div class="edit-category-selector">
        <div
            class="category-wrapper"
            @click="chooseCategory(category.name_en)"
            v-for="category in categoryStore.categoryAll"
            :key="category.name_en">
            <div
                class="category"
                :style="itemStyle(categorySelected === category.name_en, category)"
            >{{ translateCategoryName(category) }}
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {ref, watch} from "vue";
import {CategoryEntity} from "../../../types/Category.ts";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import SVG_ICONS from "../../../assets/icons/SVG_ICONS.ts";
import {translateCategoryName} from "@/i18n/text";
const uiStore = useUIStore();
const categoryStore = useCategoryStore()

const props = withDefaults(defineProps<{
    category: string
}>(), {
    category: 'life'
})

const emit = defineEmits(['change'])

const categorySelected = ref(props.category)

watch(() => props.category, () => {
    categorySelected.value = props.category
})
watch(categorySelected, newValue => {
    emit('change', newValue)
})

function itemStyle(active: boolean, category: CategoryEntity) {
    if (active) {
        return `color: white; background-color: ${category.color}`
    } else {
        return `color: ${category.color}`
    }
}
function chooseCategory(categoryName: string) {
    categorySelected.value = categoryName
}
</script>

<style lang="scss" scoped>
@import "editor-category-selector";
</style>
