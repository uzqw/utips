export default {
    list()                                    { return Promise.resolve({ success: true, data: [] }) },
    generate()                                { return Promise.resolve({ success: false, message: '功能暂不可用' }) },
    delete(_params: {diaryId: number})        { return Promise.resolve({ success: false, message: '功能暂不可用' }) },
    markAsShared(_requestData: {id: number})  { return Promise.resolve({ success: false, message: '功能暂不可用' }) },
}
