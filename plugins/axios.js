import Vue from 'vue';
import axios from "axios";
import { MessageBox } from "element-ui";
const service = axios.create({
    baseURL: '/api'
})

export default ({ store, redirect }) => {
    //请求拦截
    service.interceptors.request.use(config => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.common["Authorization"] = "Bearer " + token
        }
        return config;
    })

    //响应拦截
    service.interceptors.response.use((res) => {
        const data = res.data;
        console.log(res);
        // if (data.code === -1) {
        //     MessageBox.confirm('登录已过期', '过期', {
        //         confirmButtonText: '登录',
        //         showCancelButton: false,
        //         type: 'warning'
        //     }).then(() => {
        //         localStorage.removeItem('token');
        //         redirect({ path: '/login' });
        //     })
        // }
        return data;
    })

}

Vue.prototype.$http = service;
export const http = service;