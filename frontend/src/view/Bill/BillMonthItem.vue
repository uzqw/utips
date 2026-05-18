<template>
    <div class="bill">
        <div class="bill-header">
            <div>
                <div class="title">{{ MonthNameMap.get(billMonthData.month) }}</div>
                <div class="subtitle">{{billMonthData.month_id.substring(0,4)}}</div>
            </div>
            <BillMonthSummary
                :bill-month="billMonthData"
                :exceptSum="exceptSum"

            />
        </div>

        <!-- FOOD -->
        <BillFoodSummary :bill-food="billMonthData.food"/>

        <!--  TOP INCOME & OUTCOME   -->
        <BillTop5 v-model="outcomeTop5"
                  :title="$tt('单项支出 TOP 5')"/>

        <table>
            <tr>
                <th class="center">{{ $tt('日期') }}</th>
                <th>{{ $tt('收入') }}</th>
                <th>{{ $tt('支出') }}</th>
                <th class="label center">{{ $tt('具体') }}</th>
            </tr>
            <tr v-for="item in billMonthData.days" :key="item.date">
                <td class="date center number link"  @click="goToDiaryDetail(item.id)">
                    {{ dateProcess(item.date).day }}
                    <span class="text-gray">{{ dateProcess(item.date).weekShort }}</span></td>
                <td class="income amount number">
                    <span v-if="item.sumIncome === 0" class="text-invalid">~</span>
                    <span v-else-if="item.sumIncome > 0" class="text-income">+{{ item.sumIncome.toFixed(uiStore.moneyAccuracy) || '-' }}</span>
                    <span v-else>{{ item.sumIncome.toFixed(uiStore.moneyAccuracy) || '-' }}</span>
                </td>
                <td class="output amount number">
                    <span v-if="item.sumOutput === 0" class="text-invalid">~</span>
                    <span v-else-if="item.sumOutput > 0" class="text-expense">-{{ item.sumOutput.toFixed(uiStore.moneyAccuracy) || '-' }}</span>
                    <span v-else>{{ item.sumOutput.toFixed(uiStore.moneyAccuracy) || '-' }}</span>
                </td>
                <td class="label center"
                    v-tooltip="{
                                content: tooltipContent(item.items),
                                html: true,
                                theme: 'tooltip-bill'
                            }">
                    {{ tooltipContentWithoutReturn(item.items) }}
                </td>
            </tr>
        </table>
    </div>
</template>


<script setup lang="ts">
import {EntityBillItem, EntityBillMonth, EntityBillTop5Item, MonthNameMap} from "@/view/Bill/Bill.ts";
import { useUIStore } from "@/stores/ui";
import { useCategoryStore } from "@/stores/category";
import {dateProcess} from "@/utility.ts";
import BillMonthSummary from "@/view/Bill/BillMonthSummary.vue";
import BillTop5 from "@/view/Bill/BillTop5.vue";
import BillFoodSummary from "@/view/Bill/BillFoodSummary.vue";
import {useRouter} from "vue-router";
import {onMounted, ref, watch} from "vue";

const router = useRouter()
const uiStore = useUIStore();
const categoryStore = useCategoryStore();

interface Props {
    billMonthData: EntityBillMonth,
}
const props = defineProps<Props>()

function goToDiaryDetail(diaryId: number){
    console.log(diaryId)
    router.push({
        name: 'Detail',
        params: {
            id: diaryId
        }
    })
}

// 过滤排除的消费项目
const outcomeTop5 = ref<Array<EntityBillTop5Item>>([])
const exceptSum = ref(0)

watch(outcomeTop5, newValue => {
    exceptSum.value = 0
    newValue.filter(item => item.isFiltered).forEach(item => {
        exceptSum.value = exceptSum.value + item.price
    })
    return exceptSum.value
}, {
    deep: true
})

onMounted(()=> {
    outcomeTop5.value = props.billMonthData.outcomeTop5.map(item => {
        item.isFiltered = false
        return item
    })
})



// 获取每月吃饭账单统计
function getBillMonthFood(billMonth: EntityBillMonth): Array<EntityBillItem>{
    return [
        {item: '早餐', price: billMonth.food.breakfast},
        {item: '午餐', price: billMonth.food.launch},
        {item: '晚餐', price: billMonth.food.dinner},
        {item: '超市', price: billMonth.food.supermarket},
        {item: '水果', price: billMonth.food.fruit},
        {item: '总计', price: billMonth.food.sum},
    ]
}

function tooltipContentWithoutReturn(billItemArray: Array<EntityBillItem>) {
    return billItemArray
        .map(item => {
            return `${item.item}`
        })
        .join('，')
}
function tooltipContent(billItemArray: Array<EntityBillItem>) {
    let listContent =  billItemArray.map(item => {
        return `<tr class="bill-detail-list-item"><td>${item.item}</td><td class="price">${item.price.toFixed(uiStore.moneyAccuracy)}</td><tr/>`
    }).join('')
    return `
                    <table class="bill-detail-list">
                    <tbody>
                    ${listContent}
                    </tbody>
                    </table>`
}


</script>



<style scoped lang="scss">
@import "../../scss/plugin";

</style>
