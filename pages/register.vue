<template>
  <div class="login-container">
    <el-form class="login-form" ref="registerForm" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="邮箱" prop="email">
        <el-input prefix-icon="el-icon-user" v-model="form.email" placeholder="请输入邮箱"></el-input>
      </el-form-item>
      <el-form-item label="验证码" prop="captcha">
        <img @click="updateCaptcha" :src="captchaUrl" alt />
        <el-input placeholder="请输入邮箱验证码" v-model="form.captcha"></el-input>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input prefix-icon="el-icon-lollipop" v-model="form.nickname" placeholder="请输入昵称"></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          prefix-icon="el-icon-lock"
          v-model="form.password"
          placeholder="请输入密码"
          type="password"
        ></el-input>
      </el-form-item>
      <el-form-item label="确认密码" prop="checkpass">
        <el-input
          prefix-icon="el-icon-circle-check"
          v-model="form.checkpass"
          placeholder="请再次输入密码"
          type="password"
        ></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" plain @click.native.prevent = "handleRegister">注册</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import md5 from "md5";
export default {
  layout: "login",
  data() {
    return {
      captchaUrl: "/api/captcha",
      form: {
        email: "liujun198707@126.com",
        password: "youmei1024",
        checkpass: "youmei1024",
        nickname: "June",
        captcha: ""
      },
      rules: {
        email: [
          { required: true, message: "邮箱不能为空" },
          { type: "email", message: "请输入正确的邮箱" }
        ],
        captcha: [{ required: true, message: "验证码不能为空" }],
        nickname: [{ required: true, message: "请输入昵称" }],
        password: [
          {
            required: true,
            pattern: /^[\w_-]{6,12}$/g,
            message: "请输入6-12位密码"
          }
        ],
        checkpass: [
          {
            required: true,
            pattern: /^[\w_-]{6,12}$/g,
            message: "请再次输入密码"
          },
          {
            validator:(rule, value, callback)=>{
              if(value!== this.form.password){
                callback(new Error('两次密码不一致'))
              }
              callback()
            }
          }
        ]
      }
    };
  },
  methods: {
    updateCaptcha() {
      this.captchaUrl = "/api/captcha?t=" + new Date().getTime();
    },
    handleRegister(){
      this.$refs.registerForm.validate(async valid=>{
        if(valid){
          console.log("校验成功")
          let obj = {
            email:this.form.email,
            nickname:this.form.nickname,
            password:md5(this.form.password),
            captcha:this.form.captcha
          }
          let ret = await this.$http.post('/user/register',obj);
          if(ret.code == 0){
            this.$alert('注册成功','成功',{
              confirmButtonText:"去登录",
              callback:()=>{
                this.$router.push("/login")
              }
            })
          }else{
            this.$message.error(ret.message);
          }
        }else{
          console.log("校验失败")
        }
      })
    }
  }
};
</script>

<style lang="scss" scoped>
</style>