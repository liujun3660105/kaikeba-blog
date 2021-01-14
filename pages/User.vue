<template>
  <div>
    <h2>用户信息中心</h2>
    <div ref="drag" id="drag">
      <input type="file" @change="fileChange" />
    </div>
    <el-progress :text-inside="true" :stroke-width="26" :percentage="uploadProgress"></el-progress>
    <div>
      <el-button @click="uploadFile">上传</el-button>
    </div>
    <div>
      <h2>计算hash</h2>
      <el-progress :text-inside="true" :stroke-width="26" :percentage="hashProgress"></el-progress>
    </div>
    <div>
      <div class="cube-container" :style="{width:cubeWidth+'px'}">
        <div class="cube" v-for="chunk in chunks" :key="chunk.name">
          <div
            :class="{
            'uploading':chunk.progress>0&&chunk.progress<100,
            'success':chunk.progress ===100,
            'error':chunk.progress<0
          }"
            :style="{height:chunk.progress+'%'}"
          >
            <i
              v-if="chunk.progress<100 && chunk.progress>0"
              class="el-icon-loading"
              style="color:#f56c6c"
            ></i>
            <!-- v-if="chunk.progress<100 && chunk.progress>0" -->
          </div>
        </div>
      </div>
      <!-- chunk.progress
      progress<0 报错 显示红色
      100 成功 绿色
      别的数字 方块高度显示-->
      <pre>
        {{chunks}}
      </pre>
    </div>

    <!-- <span>{{userInfo}}</span> -->
  </div>
</template>

<script>
const CHUNK_SIZE = 100000;
const sparkMD5 = require("spark-md5");
export default {
  data() {
    return {
      userInfo: "",
      file: null,
      // uploadProgress: 0,
      hashProgress: 0,
      chunks: []
    };
  },
  computed: {
    cubeWidth() {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16;
    },
    uploadProgress() {
      if (!this.file || this.chunks.length) {
        return 0;
      }
      const loaded = this.chunks
        .map(item => item.chunk.size * item.progress)
        .reduce((acc, cur) => acc + cur, 0);
      return Number(((loaded / this.file.size) * 100).toFixed(2));
    }
  },
  methods: {
    async blobToString(blob) {
      let fileReader = new FileReader();
      return new Promise(resolve => {
        fileReader.onload = function() {
          console.log(fileReader.result.split(""));
          const ret = fileReader.result
            .split("")
            .map(v => v.charCodeAt())
            .map(v => v.toString(16).toUpperCase())
            .join(" ");
          console.log(ret);
          resolve(ret);
        };
      });
      fileReader.readAsBinaryString(blob);
    },
    async isGif(file) {
      const ret = await this.blobToString(file.slice(0, 6));
      console.log("ret", ret);
      const isGif = ret == "47 49 46 38 39 61" || ret == "47 49 46 38 37 61";
      console.log(isGif);
      return isGif;
    },
    async isPng(file) {
      const ret = await this.blobToString(file.slice(0, 6));
      const isPng = ret == "89 50 4E 47 0D 0A 1A 0A";
      return isPng;
    },
    async isJpg(file) {
      const len = file.size;
      const start = this.blobToString(file.slice(0, 2));
      const tail = this.blobToString(file.slice(-2, len));
      const isjpg = start == "FF D8" && tail == "FF D9";
      return isjpg;
    },
    async isImage(file) {
      return (
        (await this.isGif(file)) ||
        (await this.isPng(file)) ||
        (await this.isJpg(file))
      );
    },
    fileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.file = file;
    },
    createFileChunk(file, size = CHUNK_SIZE) {
      const chunks = [];
      let cur = 0;
      while (cur < file.size) {
        chunks.push({ index: cur, file: file.slice(cur, cur + size) });
        cur += size;
      }
      return chunks;
    },
    calculateHashWorker(chunks) {
      return new Promise(resolve => {
        //开始计算hash
        const worker = new Worker("/hash.js");
        worker.postMessage({ chunks: chunks });
        worker.onmessage = e => {
          const { progress, hash } = e.data;
          this.hashProgress = Number(progress.toFixed(2));
          if (hash) {
            resolve(hash);
          }
        };
      });
    },
    caculateHashSample() {
      //布隆过滤器
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        const file = this.file;
        const reader = new FileReader();
        const size = file.size;
        const offset = 2 * 1024 * 1024;
        let chunks = [file.slice(0, offset)];
        let cur = offset;
        while (cur + offset < size) {
          if (cur + offset > size) {
            //最后一个
            chunks.push(file.slice(cur, size));
          } else {
            const mid = cur + offset / 2;
            const end = cur + offset;
            chunks.push(file.slice(cur, cur + 2));
            chunks.push(file.slice(mid, mid + 2));
            chunks.push(file.slice(end - 2, end));
          }
          this.hashProgress = Number(((cur / size) * 100).toFixed(0));
          cur += offset;
        }
        reader.readAsArrayBuffer(new Blob(chunks));
        reader.onload = e => {
          spark.append(e.target.result);
          this.hashProgress = 100;
          resolve(spark.end());
        };
      });
    },
    calculateHashIdle(chunks) {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        let count = 0;
        const appendToSpark = async file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = e => {
              spark.append(e.target.result);
              resolve();
            };
          });
        };
        console.log(chunks.length);
        const workLoop = async deadline => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            // 空闲时间且有任务
            await appendToSpark(chunks[count].file);
            count++;
            if (count < chunks.length) {
              this.hashProgress = Number(
                ((100 * count) / chunks.length).toFixed(2)
              );
            } else {
              this.hashProgress = 100;
              resolve(spark.end());
            }
          }
          window.requestIdleCallback(workLoop);
        };
        window.requestIdleCallback(workLoop);
      });
    },
    async uploadChuks(uploadedList) {
      const requests = this.chunks
        .filter(chunk => uploadedList.indexOf(chunk.name) == -1)
        .map((chunk, index) => {
          let form = new FormData();
          form.append("name", chunk.name);
          form.append("chunk", chunk.chunk);
          form.append("hash", chunk.hash);
          return { form, index: chunk.index, error: 0 }; //这里也可以这样做 return {form, index:chunk.index} 这里的index是和chunk绑定的
        });
      // .map(({ form, index }) => {
      //   //map({form,index}) this.chunks[index].progress=....
      //   return this.$http.post("/uploadchunk", form, {
      //     onUploadProgress: progress => {
      //       //根据chunk名称精确找到每一个chunk
      //       // let index1 = this.chunks.findIndex(chunk => chunk.name ===form.get('name'))
      //       this.chunks[index].progress = Number(
      //         ((progress.loaded / progress.total) * 100).toFixed(2)
      //       );
      //     }
      //   });
      // });
      // @todo 并发量控制
      console.log("发送的请求数量", requests.length);
      // await Promise.all(requests);
      await this.sendRequest(requests);
    },

    async sendRequest(chunks, limit = 3) {
      console.log('切片数量为：',chunks.length);
      //上传错误 尝试三次 如果其中一个切片 三次出错 则终止全部上传
      return new Promise((resolve, reject) => {
        const len = chunks.length;
        let counter = 0;
        let isStop = false;
        const start = async () => {
          if (isStop) {
            return;
          }
          const task = chunks.shift();
          console.log('正在开始的切片任务编号',task.index);
          if (task) {
            console.log(task);
            const { form, index } = task;
            try {
              await this.$http.post("/uploadchunk", form, {
                onUploadProgress: progress => {
                  //根据chunk名称精确找到每一个chunk
                  // let index1 = this.chunks.findIndex(chunk => chunk.name ===form.get('name'))
                  this.chunks[index].progress = Number(
                    ((progress.loaded / progress.total) * 100).toFixed(2)
                  );
                }
              });
              if (counter == len-1) {
                console.log('切片任务完成');
                resolve();
              } else {
                counter++;
                start();
              }
            } catch (e) {
              this.chunks[index].progress = -1;
              console.log(`切片错误次数${task.index}`,task.error);
              if (task.error < 3) {
                task.error++;
                chunks.unshift(task);
                start();
              } else {
                //错误三次 直接结束,通过isStop设置全局结束，后面的任务不要执行了
                console.log('切片任务失败');
                isStop = true;
                reject();
              }
            }
          }
        };
        while (limit > 0) {
          start();
          limit -= 1;
        }
      });
    },
    async mergeChunks(hash) {
      console.log(hash);
      await this.$http.post("/mergechunks", {
        ext: this.file.name.split(".").pop(),
        // size:this.file.size,
        hash,
        size: CHUNK_SIZE //为后续切片合并 读流和写流准备
      });
    },
    async checkFile(hash) {
      return await this.$http.post("/checkfile", {
        ext: this.file.name.split(".").pop(),
        hash
      });
    },
    async uploadFile() {
      // if (!(await this.isImage(this.file))) {
      //     alert('文件格式不正确');
      //   return;
      // }
      const chunks = this.createFileChunk(this.file);
      // const hash = await this.calculateHashWorker(chunks);
      // const hash1 = await this.calculateHashIdle(chunks);
      const hash = await this.caculateHashSample();
      // console.log('webWorkerHash',hash);
      // console.log('时间切片hash',hash1);
      // console.log("hash", hash);
      console.log("抽样hash", hash);

      const {
        data: { uploaded, uploadedList }
      } = await this.checkFile(hash);
      if (uploaded) {
        return this.$message.success("秒传成功");
      }
      // if(uploaded){
      //   return this.$message.success('秒传成功');
      // }
      // {data:{uploaded,uploadedList}}

      //抽样hash
      // return;
      console.log(uploadedList);
      this.chunks = chunks.map((chunk, index) => {
        // 切片名字  hash+index
        const name = hash + "_" + index;
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          progress: uploadedList.indexOf(name) > -1 ? 100 : 0
        };
      });
      console.log('开始上传切片');
      await this.uploadChuks(uploadedList);
      console.log('上传完切片，开始合并');
      await this.mergeChunks(hash);
      // let form = new FormData();
      // form.append("file", this.file);
      // form.append("name", "June");
      // const ret = await this.$http.post("/upload", form, {
      //   onUploadProgress: progress => {
      //     this.uploadProgress = Number(
      //       (progress.loaded / progress.total) * 100
      //     ).toFixed(2);
      //   }
      // });
    }
  },
  async mounted() {
    const drag = this.$refs.drag;
    drag.addEventListener("dragover", e => {
      drag.style.borderColor = "red";
      e.preventDefault();
    });
    drag.addEventListener("dragleave", e => {
      drag.style.borderColor = "rgb(145, 142, 142)";
      e.preventDefault();
    });
    drag.addEventListener("drop", e => {
      this.file = e.dataTransfer.files[0];
      drag.style.borderColor = "rgb(145, 142, 142)";
      e.preventDefault();
    });
    // console.log("mounted");
    // const ret = await this.$http.get('/user/info');
    // console.log(ret);
  }
};
</script>

<style lang="scss" scoped>
#drag {
  height: 100px;
  line-height: 100px;
  border: dashed 2px rgb(145, 142, 142);
  text-align: center;
}
.cube-container {
  .cube {
    width: 14px;
    height: 14px;
    line-height: 12px;
    border: 1px black solid;
    background: #eee;
    float: left;
    .success {
      background: green;
    }
    .uploading {
      background: blue;
    }
    .error {
      background: red;
    }
  }
}
</style>