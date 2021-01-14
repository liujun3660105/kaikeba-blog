<template>
  <div class="login-container">
    <el-form class="login-form" ref="loginForm" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="邮箱" prop="email">
        <el-input prefix-icon="el-icon-user" v-model="form.email" placeholder="请输入邮箱"></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          prefix-icon="el-icon-lock"
          v-model="form.password"
          placeholder="请输入密码"
          type="password"
        ></el-input>
      </el-form-item>
      <el-form-item label="验证码" prop="captcha">
        <img @click="updateCaptcha" :src="captchaUrl" alt />
        <el-input placeholder="请输入验证码" v-model="form.captcha"></el-input>
      </el-form-item>
      <el-form-item label="邮箱验证码" prop="emailCode">
        <el-input placeholder="请输入邮箱验证码" v-model="form.emailCode"></el-input>
        <el-button @click="sendEmail" :disabled="timer>0">{{sendEmailText}}</el-button>
      </el-form-item>
      <el-form-item>
        <el-button @click.native.prevent="handleLogin" type="primary" plain>登录</el-button>
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
      emailCode: "",
      timer: 0,
      captchaUrl: "/api/captcha",
      form: {
        email: "liujun198707@126.com",
        password: "youmei1024",
        captcha: "",
        emailCode: ""
      },
      rules: {
        email: [
          { required: true, message: "邮箱不能为空" },
          { type: "email", message: "邮箱格式不正确" }
        ],
        password: { required: true, message: "密码不能为空" },
        captcha: { required: true, message: "验证码不能为空" },
        emailCode: { required: true, message: "邮箱验证码不能为空" }
      }
    };
  },
  methods: {
    updateCaptcha() {
      this.captchaUrl = "/api/captcha?t=" + new Date().getTime();
    },
    handleLogin() {
      this.$refs.loginForm.validate(async valid => {
        if (valid) {
          let obj = {
            email: this.form.email,
            password: md5(this.form.password),
            captcha: this.form.captcha,
            emailCode: this.form.emailCode
          };
          const res = await this.$http.post("/user/login", obj);
          console.log(res);
          if (res.code === 0) {
            //token存储，登录成功，返回token
            this.$message({
              message: "登录成功",
              type: "success"
            });
            localStorage.setItem("token", res.data.token);
            setTimeout(() => {
              this.$router.push("/");
            }, 1000);
          } else {
            this.$message({
              message: res.message,
              type: "success"
            });
          }
        }
      });
    },
    async sendEmail() {
      this.timer = 10;
      await this.$http.get(`/sendemail?email=${this.form.email}`);
      this.mailTimer = setInterval(() => {
        this.timer--;
        if (this.timer === 0) {
          clearInterval(this.mailTimer);
        }
      }, 1000);
    }
  },
  computed: {
    sendEmailText() {
      return this.timer > 0 ? `${this.timer}s后发送` : "点击发送";
    }
  }
};
</script>

<style lang="scss" scoped>
</style>