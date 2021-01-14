<template>
  <div class="newPage">
    <div class="submit">
      <el-button type="primary" @click="submit">提交</el-button>
    </div>
    <el-row>
      <el-col :span="12">
        <textarea ref="editor" class="md-editor" name id @input="update" :value="content"></textarea>
      </el-col>
      <el-col :span="12">
        <div class="showContent" v-html="compiledContent">
          <!-- {{compiledContent}} -->
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import marked from "marked";
// import hljs from "highlight.js/lib/core";
import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";
export default {
  data() {
    return {
      content: `# 123
* 吃饭
* 睡觉
* 打豆豆
\`\`\`javascript
console.log(111);
\`\`\``
    };
  },
  computed: {
    async compiledContent() {
      // return marked(this.content, {});
      this.markArticle(this.content).then(res => {
        console.log("解析值", res);
        return res;
      }).catch(e=>{
        console.log(e);
      })

      // return compiledContent
    }
  },

  mounted() {
    this.timer = null;
    this.bindEvents();
    // hljs.registerLanguage('javascript',javascript);
    // marked.setOptions({
    //   renderer: new marked.Renderer(),
    //   highlight: function(code){
    //     return hljs.highlightAuto(code).value
    //   }
    // })
  },
  methods: {
    markArticle(content) {
      return new Promise((resolve, reject) => {
        const worker = new Worker("/mark.js");
        if (worker) {
          worker.postMessage({ content });
          worker.onmessage = e => {
            console.log(e);
            resolve(e.data);
            // return e.data;
          };
        } else {
          reject();
        }
      });
      //利用webWorker解析content
    },
    async submit() {
      await this.$http.post("arcicle/create", {
        content: this.content,
        compiledContent: this.compiledContent
      });
    },
    update(e) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.content = e.target.value;
      }, 350);
    },
    bindEvents() {
      //绑定复制粘贴
      this.$refs.editor.addEventListener("paste", async e => {
        const files = e.clipboardData;
        console.log(files);
        //@todo 文件上传
      });
      this.$refs.editor.addEventListener("drop", async e => {
        const files = e.dataTransfer.files;
        console.log(files);
        e.preventDefault();
        //@todo 文件上传
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.submit {
  width: 100px;
  height: 20px;
  position: fixed;
  top: 10px;
  right: 10px;
}
.md-editor {
  width: 100%;
  height: 500px;
  outline: none;
}
</style>